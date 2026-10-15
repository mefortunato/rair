import type { Player, ActiveBuff, GearItem, OfflineReport, ElementType, GearSlot, ActiveUpgrades } from '#lib/types/game';
import { api } from '#lib/api/apiClient';
import { sfx } from '#lib/audio/sfx';

export interface FloatingDamage {
	id: string;
	text: string;
	x: number;
	y: number;
	isCrit: boolean;
	element: ElementType;
}

export interface ToastItem {
	id: string;
	message: string;
	type: 'info' | 'success' | 'loot' | 'ascend' | 'warning';
}

class GameStore {
	public player: Player | null = $state(null);
	public isLoaded: boolean = $state(false);
	public offlineReport: OfflineReport | null = $state(null);
	public activeModal: 'ascension' | 'inventory' | 'leaderboard' | 'minigames' | 'offline' | null = $state(null);
	public activeMinigame: 'overdrive_ring' | 'rune_weave' | 'alchemical_transmutation' = $state('overdrive_ring');
	public floatingDamages: FloatingDamage[] = $state([]);
	public toasts: ToastItem[] = $state([]);
	public isBossEnraged: boolean = $state(false);
	public bossTimer: number = $state(30);

	private attackAccumulator: number = 0;
	private lastTickTime: number = 0;
	private syncTimer: number = 0;
	private animFrameId: number | null = null;

	// Elemental advantage matrix
	private elementMultipliers: Record<string, number> = {
		'fire_ice': 1.5,
		'fire_lightning': 0.75,
		'ice_lightning': 1.5,
		'ice_fire': 0.75,
		'lightning_fire': 1.5,
		'lightning_ice': 0.75,
		'void_fire': 1.35,
		'void_ice': 1.35,
		'void_lightning': 1.35,
		'void_void': 1.2
	};

	public async init() {
		try {
			const res = await api.initPlayer();
			this.player = res.player;
			this.isLoaded = true;

			if (res.offline_report && res.offline_report.floors_cleared > 0) {
				this.offlineReport = res.offline_report;
				this.activeModal = 'offline';
			}

			this.startCombatLoop();
		} catch (err) {
			console.error('Failed to init player from backend:', err);
		}
	}

	public addToast(message: string, type: ToastItem['type'] = 'info') {
		const id = Math.random().toString(36).substring(2, 9);
		this.toasts.push({ id, message, type });
		setTimeout(() => {
			this.toasts = this.toasts.filter((t) => t.id !== id);
		}, 4000);
	}

	public getEffectiveStats() {
		if (!this.player) {
			return {
				totalAtk: 10,
				attackSpeed: 1,
				critChance: 0.05,
				critMultiplier: 1.5,
				goldMult: 1,
				heroElement: 'fire' as ElementType,
				dps: 10
			};
		}

		let baseAtk = this.player.stats.base_atk;
		let heroElement: ElementType = 'fire';

		// Weapon addition
		const weapon = this.player.equipped_gear.weapon;
		if (weapon) {
			baseAtk += weapon.base_atk;
			heroElement = weapon.element;
		}

		// Catalyst addition
		const catalyst = this.player.equipped_gear.catalyst;
		if (catalyst) {
			baseAtk += catalyst.base_atk;
		}

		// Run upgrades
		baseAtk += this.player.active_run.upgrades.weapon_sharpening * 5;
		let attackSpeed = this.player.stats.attack_speed + this.player.active_run.upgrades.swift_strike * 0.15;
		let critChance = this.player.stats.crit_chance + this.player.active_run.upgrades.focus_training * 0.02;
		let critMultiplier = this.player.stats.crit_multiplier + this.player.active_run.upgrades.deadly_precision * 0.15;
		let goldMult = this.player.stats.gold_multiplier * (1 + this.player.active_run.upgrades.midas_greed * 0.15);

		// Gear affixes
		const gearSlots = Object.values(this.player.equipped_gear) as (GearItem | null)[];
		for (const slot of gearSlots) {
			if (slot && slot.affixes) {
				for (const aff of slot.affixes) {
					if (aff.stat === 'base_atk') baseAtk += aff.value;
					if (aff.stat === 'crit_chance') critChance += aff.value;
					if (aff.stat === 'crit_dmg') critMultiplier += aff.value;
					if (aff.stat === 'gold_bonus') goldMult *= 1 + aff.value;
				}
			}
		}

		// Constellation perks
		const tree = this.player.ascension_tree;
		if (tree && tree.nodes) {
			if (tree.nodes.cosmic_might) {
				baseAtk *= 1 + tree.nodes.cosmic_might.current_rank * 0.25;
			}
		}

		// Active buffs
		let buffDmgMult = 1;
		for (const b of this.player.active_run.active_buffs) {
			if (b.buff_type === 'all_damage') buffDmgMult *= b.multiplier;
			if (b.buff_type === 'gold_multiplier') goldMult *= b.multiplier;
		}
		baseAtk *= buffDmgMult;

		const effectiveCritFactor = 1 + critChance * (critMultiplier - 1);
		const dps = Math.round(baseAtk * attackSpeed * effectiveCritFactor);

		return {
			totalAtk: Math.round(baseAtk),
			attackSpeed: parseFloat(attackSpeed.toFixed(2)),
			critChance: Math.min(1, parseFloat(critChance.toFixed(3))),
			critMultiplier: parseFloat(critMultiplier.toFixed(2)),
			goldMult: parseFloat(goldMult.toFixed(2)),
			heroElement,
			dps
		};
	}

	private startCombatLoop() {
		this.lastTickTime = performance.now();

		const tick = (now: number) => {
			const dt = Math.min(0.2, (now - this.lastTickTime) / 1000);
			this.lastTickTime = now;

			if (this.player) {
				this.updateCombat(dt);
				this.updateBuffs(dt);
				this.updateSync(dt);
			}

			this.animFrameId = requestAnimationFrame(tick);
		};

		this.animFrameId = requestAnimationFrame(tick);
	}

	private updateCombat(dt: number) {
		if (!this.player) return;

		const stats = this.getEffectiveStats();
		this.attackAccumulator += dt;

		const attackInterval = 1 / stats.attackSpeed;

		if (this.attackAccumulator >= attackInterval) {
			this.attackAccumulator -= attackInterval;
			this.executeHeroAttack(stats);
		}
	}

	private executeHeroAttack(stats: ReturnType<typeof this.getEffectiveStats>) {
		if (!this.player) return;

		const run = this.player.active_run;
		const guardianElem = run.guardian_element;
		const heroElem = stats.heroElement;

		// Calculate elemental multiplier
		const key = `${heroElem}_${guardianElem}`;
		let elemMult = this.elementMultipliers[key] || 1.0;
		if (heroElem === guardianElem) elemMult = 1.0;

		// Constellation elemental mastery bonus
		if (elemMult > 1.0 && this.player.ascension_tree?.nodes?.elemental_apotheosis) {
			elemMult += this.player.ascension_tree.nodes.elemental_apotheosis.current_rank * 0.2;
		}

		// Crit check
		const isCrit = Math.random() < stats.critChance;
		const critFactor = isCrit ? stats.critMultiplier : 1.0;

		const rawDmg = stats.totalAtk * elemMult * critFactor;
		const finalDmg = Math.max(1, Math.round(rawDmg));

		// Sound
		if (isCrit) {
			sfx.playCrit();
		} else {
			sfx.playSlash();
		}

		// Spawn floating damage
		this.spawnDamageNumber(finalDmg, isCrit, heroElem);

		// Damage Guardian
		run.guardian_hp_current = Math.max(0, run.guardian_hp_current - finalDmg);

		// If Guardian defeated
		if (run.guardian_hp_current <= 0) {
			this.onGuardianDefeated();
		}
	}

	private spawnDamageNumber(dmg: number, isCrit: boolean, element: ElementType) {
		const id = Math.random().toString(36).substring(2, 9);
		const x = 50 + (Math.random() * 30 - 15);
		const y = 45 + (Math.random() * 20 - 10);
		const text = isCrit ? `CRIT! ${dmg.toLocaleString()}` : dmg.toLocaleString();

		this.floatingDamages.push({ id, text, x, y, isCrit, element });

		setTimeout(() => {
			this.floatingDamages = this.floatingDamages.filter((d) => d.id !== id);
		}, 750);
	}

	private onGuardianDefeated() {
		if (!this.player) return;

		const run = this.player.active_run;
		const floor = run.current_floor;
		const stats = this.getEffectiveStats();

		// Calculate gold
		const baseGold = 20.0 * Math.pow(1.12, floor - 1);
		const goldEarned = Math.round(baseGold * stats.goldMult);

		run.gold += goldEarned;
		run.total_gold_this_run += goldEarned;
		sfx.playGold();

		// Advance floor
		const nextFloor = floor + 1;
		run.current_floor = nextFloor;
		run.highest_floor_this_run = Math.max(run.highest_floor_this_run, nextFloor);
		this.player.highest_floor = Math.max(this.player.highest_floor, nextFloor);

		// Determine new guardian properties
		run.guardian_element = this.determineFloorElement(nextFloor);
		run.is_boss_floor = nextFloor % 5 === 0;

		const baseHp = 120.0 * Math.pow(1.14, nextFloor - 1) * (1 + Math.floor(nextFloor / 10) * 0.6);
		const bossMult = nextFloor % 10 === 0 ? 3.5 : nextFloor % 5 === 0 ? 2.5 : 1.0;
		const maxHp = Math.round(baseHp * bossMult);

		run.guardian_hp_max = maxHp;
		run.guardian_hp_current = maxHp;

		// Loot roll (guaranteed on boss floors, 15% on regular floors)
		const lootRoll = Math.random();
		if (run.is_boss_floor || lootRoll < 0.15) {
			this.generateAndAddLoot(nextFloor);
		}

		if (nextFloor % 10 === 0) {
			this.addToast(`Ascended to Floor ${nextFloor}! Cosmic Void Anomaly awaits!`, 'ascend');
		} else if (run.is_boss_floor) {
			this.addToast(`Boss Guardian Floor ${nextFloor} reached!`, 'warning');
		}
	}

	private determineFloorElement(floor: number): ElementType {
		if (floor % 10 === 0) return 'void';
		const cycle: ElementType[] = ['fire', 'ice', 'lightning'];
		return cycle[(floor - 1) % cycle.length];
	}

	private generateAndAddLoot(floor: number) {
		if (!this.player) return;

		const slots: GearSlot[] = ['weapon', 'armor', 'ring', 'amulet', 'catalyst'];
		const slot = slots[Math.floor(Math.random() * slots.length)];

		// Roll rarity
		const rRoll = Math.random();
		let rarity: GearItem['rarity'] = 'common';
		if (rRoll < 0.04) rarity = 'mythic';
		else if (rRoll < 0.12) rarity = 'legendary';
		else if (rRoll < 0.35) rarity = 'epic';
		else if (rRoll < 0.65) rarity = 'rare';

		const elements: ElementType[] = ['fire', 'ice', 'lightning', 'void'];
		const element = elements[Math.floor(Math.random() * elements.length)];

		const prefixes: Record<ElementType, string[]> = {
			fire: ['Blazing', 'Infernal', 'Molten'],
			ice: ['Glacial', 'Frostforged', 'Arctic'],
			lightning: ['Stormbound', 'Charged', 'Thunderous'],
			void: ['Abyssal', 'Cosmic', 'Singularity'],
			neutral: ['Ancient', 'Polished']
		};
		const slotNames: Record<GearSlot, string> = {
			weapon: 'Blade',
			armor: 'Vestments',
			ring: 'Signet',
			amulet: 'Talisman',
			catalyst: 'Prism'
		};

		const name = `${prefixes[element][Math.floor(Math.random() * prefixes[element].length)]} ${slotNames[slot]}`;
		const isWeaponOrCatalyst = slot === 'weapon' || slot === 'catalyst';
		const baseAtk = isWeaponOrCatalyst ? Math.round(10 * Math.pow(1.1, floor - 1)) : 0;
		const baseDef = !isWeaponOrCatalyst ? Math.round(5 * Math.pow(1.06, floor - 1)) : 0;

		const affixes = [
			{
				stat: 'base_atk',
				value: Math.round(5 * (floor * 0.2)),
				description: `+${Math.round(5 * (floor * 0.2))} Attack Power`
			}
		];

		const item: GearItem = {
			id: `item_${Math.random().toString(36).substring(2, 9)}`,
			name,
			slot,
			rarity,
			element,
			level: floor,
			base_atk: baseAtk,
			base_def: baseDef,
			affixes,
			salvage_value: rarity === 'mythic' ? 500 : rarity === 'legendary' ? 200 : rarity === 'epic' ? 75 : 25,
			is_equipped: false
		};

		this.player.inventory.push(item);
		this.addToast(`Discovered: [${rarity.toUpperCase()}] ${name}!`, 'loot');
	}

	private updateBuffs(dt: number) {
		if (!this.player) return;
		const buffs = this.player.active_run.active_buffs;
		for (let i = buffs.length - 1; i >= 0; i--) {
			buffs[i].time_remaining -= dt;
			if (buffs[i].time_remaining <= 0) {
				buffs.splice(i, 1);
			}
		}
	}

	private updateSync(dt: number) {
		this.syncTimer += dt;
		if (this.syncTimer >= 10) {
			this.syncTimer = 0;
			if (this.player) {
				api.syncPlayer(this.player);
			}
		}
	}

	// Active Upgrades Shop
	public getUpgradeCost(upgradeKey: keyof ActiveUpgrades) {
		if (!this.player) return 0;
		const currentLevel = this.player.active_run.upgrades[upgradeKey] || 0;
		const baseCosts: Record<keyof ActiveUpgrades, number> = {
			weapon_sharpening: 15,
			swift_strike: 25,
			focus_training: 35,
			deadly_precision: 50,
			elemental_infusion: 40,
			midas_greed: 30
		};
		const multipliers: Record<keyof ActiveUpgrades, number> = {
			weapon_sharpening: 1.25,
			swift_strike: 1.35,
			focus_training: 1.45,
			deadly_precision: 1.5,
			elemental_infusion: 1.3,
			midas_greed: 1.4
		};
		const base = baseCosts[upgradeKey] || 20;
		const mult = multipliers[upgradeKey] || 1.3;
		return Math.round(base * Math.pow(mult, currentLevel));
	}

	public buyUpgrade(upgradeKey: keyof ActiveUpgrades) {
		if (!this.player) return;
		const cost = this.getUpgradeCost(upgradeKey);
		if (this.player.active_run.gold >= cost) {
			this.player.active_run.gold -= cost;
			this.player.active_run.upgrades[upgradeKey]++;
			sfx.playLevelUp();
			this.addToast(`Upgraded ${(upgradeKey as string).replace('_', ' ')}!`, 'success');
		}
	}

	// Gear Equipping & Salvage
	public equipItem(item: GearItem) {
		if (!this.player) return;
		const slot = item.slot;
		const current = this.player.equipped_gear[slot];

		// Remove from inventory
		this.player.inventory = this.player.inventory.filter((i: GearItem) => i.id !== item.id);

		// If something was equipped, put back into inventory
		if (current) {
			current.is_equipped = false;
			this.player.inventory.push(current);
		}

		item.is_equipped = true;
		this.player.equipped_gear[slot] = item;
		sfx.playLevelUp();
		this.addToast(`Equipped ${item.name}`, 'info');
	}

	public async salvageItem(itemId: string) {
		if (!this.player) return;
		try {
			const res = await api.salvageItem(itemId);
			this.player.stats.aether_essences = res.total_aether;
			this.player.inventory = res.inventory;
			sfx.playGold();
			this.addToast(`Salvaged item for +${res.aether_earned} Aether Essences!`, 'info');
		} catch (err) {
			console.error('Failed to salvage:', err);
		}
	}

	// Ascension
	public async ascend() {
		if (!this.player) return;
		try {
			const res = await api.triggerAscension();
			this.player = res.player;
			sfx.playAscension();
			this.addToast(`ASCENDED! Gained ${res.sparks_awarded} Ascension Sparks!`, 'ascend');
		} catch (err: any) {
			this.addToast(err.message || 'Ascension failed', 'warning');
		}
	}

	// Constellation Node Upgrade
	public async upgradeConstellation(nodeId: string) {
		if (!this.player) return;
		try {
			const res = await api.upgradeConstellationNode(nodeId);
			if (this.player.ascension_tree.nodes[nodeId]) {
				this.player.ascension_tree.nodes[nodeId].current_rank = res.new_rank;
			}
			this.player.ascension_tree.sparks = res.remaining_sparks;
			sfx.playLevelUp();
			this.addToast(`Unlocked ${res.node.name} Rank ${res.new_rank}!`, 'ascend');
		} catch (err: any) {
			this.addToast(err.message || 'Constellation upgrade failed', 'warning');
		}
	}

	// Minigame Buff Application
	public applyMinigameBuff(buff: ActiveBuff) {
		if (!this.player) return;
		this.player.active_run.active_buffs.push(buff);
		sfx.playMinigameSuccess();
		this.addToast(`Minigame Victory: ${buff.name} activated!`, 'success');
	}
}

export const game = new GameStore();
