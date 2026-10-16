import type { Player, ActiveBuff, GearItem, OfflineReport, ElementType, GearSlot, ActiveUpgrades, RunPerk, PerkRarity } from '#lib/types/game';
import { api } from '#lib/api/apiClient';
import { sfx } from '#lib/audio/sfx';
import { rollPerkChoices, getPerkUpgradeCost, getPerkRerollCost, PERK_DEFINITIONS, getRarityForRank } from '#lib/data/perks';

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
	public activeModal: 'ascension' | 'inventory' | 'leaderboard' | 'minigames' | 'offline' | 'perk_draft' | 'game_options' | 'auth' | null = $state(null);
	public activeMinigame: 'overdrive_ring' | 'rune_weave' | 'alchemical_transmutation' = $state('overdrive_ring');
	public floatingDamages: FloatingDamage[] = $state([]);
	public toasts: ToastItem[] = $state([]);
	public isBossEnraged: boolean = $state(false);
	public bossTimer: number = $state(30);

	// Roguelike Perk Draft & Run State
	public currentPerkChoices: RunPerk[] = $state([]);
	public currentRerollCount: number = $state(0);
	public consecutiveHits: number = $state(0);

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
			if (this.player) {
				if (!this.player.active_run.perks) this.player.active_run.perks = [];
				if (this.player.active_run.pending_perk_picks === undefined) this.player.active_run.pending_perk_picks = 0;
			}
			this.isLoaded = true;

			if (res.offline_report && res.offline_report.floors_cleared > 0) {
				this.offlineReport = res.offline_report;
				this.activeModal = 'offline';
			} else if (this.player?.active_run.pending_perk_picks && this.player.active_run.pending_perk_picks > 0) {
				this.openPerkDraftModal();
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

		let attackSpeed = this.player.stats.attack_speed;
		let critChance = this.player.stats.crit_chance;
		let critMultiplier = this.player.stats.crit_multiplier;
		let goldMult = this.player.stats.gold_multiplier;

		// Run upgrades
		if (this.player.active_run.upgrades) {
			baseAtk += (this.player.active_run.upgrades.weapon_sharpening || 0) * 2;
			attackSpeed += (this.player.active_run.upgrades.swift_strike || 0) * 0.06;
			critChance += (this.player.active_run.upgrades.focus_training || 0) * 0.012;
			critMultiplier += (this.player.active_run.upgrades.deadly_precision || 0) * 0.08;
			goldMult *= 1 + (this.player.active_run.upgrades.midas_greed || 0) * 0.08;
		}

		// Roguelike Run Perks
		const perks = this.player.active_run.perks || [];
		for (const p of perks) {
			if (p.id === 'colossus_might') {
				baseAtk *= 1 + p.rank * 0.20;
			} else if (p.id === 'tempest_agility') {
				attackSpeed += p.rank * 0.20;
			} else if (p.id === 'deadly_focus') {
				critChance += p.rank * 0.06;
			} else if (p.id === 'severing_impact') {
				critMultiplier += p.rank * 0.40;
			} else if (p.id === 'midas_touch') {
				goldMult *= 1 + p.rank * 0.35;
			} else if (p.id === 'relentless_momentum') {
				const maxBonus = 0.20 + p.rank * 0.15;
				const currentBonus = Math.min(maxBonus, this.consecutiveHits * 0.015);
				attackSpeed *= 1 + currentBonus;
			}
		}

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

		// Active buffs & debuffs
		let buffDmgMult = 1;
		for (const b of this.player.active_run.active_buffs) {
			if (b.buff_type === 'all_damage') buffDmgMult *= b.multiplier;
			if (b.buff_type === 'gold_multiplier') goldMult *= b.multiplier;
			if (b.buff_type === 'attack_speed') attackSpeed *= b.multiplier;
			if (b.buff_type === 'crit_chance') critChance *= b.multiplier;
			if (b.buff_type === 'crit_multiplier') critMultiplier *= b.multiplier;
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

		const run = this.player.active_run;

		// Boss Enrage countdown check
		if (run.is_boss_floor) {
			this.bossTimer = Math.max(0, this.bossTimer - dt);
			if (this.bossTimer <= 0) {
				this.onBossEnrageFailed();
				return;
			}
		}

		const stats = this.getEffectiveStats();
		this.attackAccumulator += dt;

		const attackInterval = 1 / stats.attackSpeed;

		if (this.attackAccumulator >= attackInterval) {
			this.attackAccumulator -= attackInterval;
			this.executeHeroAttack(stats);
		}
	}

	private onBossEnrageFailed() {
		if (!this.player) return;
		const run = this.player.active_run;
		this.isBossEnraged = true;
		this.consecutiveHits = 0;
		sfx.playMinigameMiss();
		this.addToast(`⚠️ Boss Enraged! Floor ${run.current_floor} Guardian overwhelmed you. Retreating to regroup!`, 'warning');

		// Retreat to previous floor to farm gold and prepare minigame buffs
		const retreatFloor = Math.max(1, run.current_floor - 1);
		run.current_floor = retreatFloor;
		run.is_boss_floor = retreatFloor % 5 === 0;
		run.guardian_element = this.determineFloorElement(retreatFloor);

		const baseHp = 250.0 * Math.pow(1.20, retreatFloor - 1) * (1 + Math.floor(retreatFloor / 10) * 0.75);
		const bossMult = retreatFloor % 10 === 0 ? 3.5 : retreatFloor % 5 === 0 ? 2.8 : 1.0;
		const maxHp = Math.round(baseHp * bossMult);
		run.guardian_hp_max = maxHp;
		run.guardian_hp_current = maxHp;

		const bulwark = run.perks?.find((p) => p.id === 'astral_bulwark');
		this.bossTimer = 30 + (bulwark ? bulwark.rank * 10 : 0);
		this.isBossEnraged = false;
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

		// Elemental buffs from minigames
		for (const b of run.active_buffs) {
			if (b.buff_type === 'elemental_boost') elemMult *= b.multiplier;
		}

		// Perks Damage Multiplier
		const perks = run.perks || [];
		let perkDmgMult = 1.0;

		// Titan Breaker (Boss damage)
		if (run.is_boss_floor) {
			const titan = perks.find((p) => p.id === 'titan_breaker');
			if (titan) perkDmgMult *= 1 + titan.rank * 0.35;
		}

		// Berserker's Blood (Missing HP bonus)
		const berserker = perks.find((p) => p.id === 'berserker_blood');
		if (berserker && run.guardian_hp_max > 0) {
			const missingHpRatio = Math.max(0, 1 - run.guardian_hp_current / run.guardian_hp_max);
			perkDmgMult *= 1 + missingHpRatio * (0.20 + berserker.rank * 0.15);
		}

		// Elemental Core perks
		for (const p of perks) {
			if (p.id === 'inferno_core' && heroElem === 'fire') {
				perkDmgMult *= 1 + p.rank * 0.30;
			} else if (p.id === 'glacial_shatter' && heroElem === 'ice') {
				perkDmgMult *= 1 + p.rank * 0.30;
			} else if (p.id === 'storm_conductor' && heroElem === 'lightning') {
				perkDmgMult *= 1 + p.rank * 0.30;
			} else if (p.id === 'void_singularity') {
				perkDmgMult *= 1 + p.rank * 0.25;
			} else if (p.id === 'overdrive_echo' && run.active_buffs && run.active_buffs.length > 0) {
				perkDmgMult *= 1 + p.rank * 0.45;
			}
		}

		// Crit check
		const isCrit = Math.random() < stats.critChance;
		const critFactor = isCrit ? stats.critMultiplier : 1.0;

		// Guardian Defense calculation
		const guardianDef = Math.floor(2.5 * Math.pow(1.09, Math.max(0, run.current_floor - 1)));
		const effectiveAtk = Math.max(1, stats.totalAtk - guardianDef);

		const rawDmg = effectiveAtk * elemMult * critFactor * perkDmgMult;
		let finalDmg = Math.max(1, Math.round(rawDmg));

		// Abyssal Cull execute on crits for non-bosses
		if (isCrit && !run.is_boss_floor) {
			const cull = perks.find((p) => p.id === 'abyssal_cull');
			if (cull && run.guardian_hp_max > 0) {
				const executeThreshold = 0.10 + cull.rank * 0.05;
				if (run.guardian_hp_current / run.guardian_hp_max <= executeThreshold) {
					finalDmg = Math.max(finalDmg, Math.round(run.guardian_hp_current));
				}
			}
		}

		this.consecutiveHits++;

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
		const wasBoss = run.is_boss_floor;
		const stats = this.getEffectiveStats();

		this.consecutiveHits = 0;

		// Calculate gold
		const baseGold = 15.0 * Math.pow(1.10, floor - 1);
		const goldEarned = Math.round(baseGold * stats.goldMult);

		run.gold += goldEarned;
		run.total_gold_this_run += goldEarned;
		sfx.playGold();

		// Boss Defeat: Award Roguelike Perks selection!
		if (wasBoss) {
			sfx.playBossDefeat();
			run.pending_perk_picks = (run.pending_perk_picks || 0) + 1;

			// Sovereign Bounty perk bonus
			const bountyPerk = run.perks?.find((p) => p.id === 'bounty_harvest');
			if (bountyPerk) {
				const bonusGold = bountyPerk.rank * 250;
				run.gold += bonusGold;
				run.total_gold_this_run += bonusGold;
				this.addToast(`👑 Sovereign Bounty: +${bonusGold.toLocaleString()} Gold!`, 'loot');
			}

			// Open Perk Draft Modal if no conflicting modal is active
			if (!this.activeModal || this.activeModal === 'perk_draft') {
				this.openPerkDraftModal();
			}

			this.addToast(`🏆 Boss Guardian Floor ${floor} Defeated! Spire Boon unlocked!`, 'ascend');
		}

		// Advance floor
		const nextFloor = floor + 1;
		run.current_floor = nextFloor;
		run.highest_floor_this_run = Math.max(run.highest_floor_this_run, nextFloor);
		this.player.highest_floor = Math.max(this.player.highest_floor, nextFloor);

		// Determine new guardian properties
		run.guardian_element = this.determineFloorElement(nextFloor);
		run.is_boss_floor = nextFloor % 5 === 0;

		const baseHp = 250.0 * Math.pow(1.20, nextFloor - 1) * (1 + Math.floor(nextFloor / 10) * 0.75);
		const bossMult = nextFloor % 10 === 0 ? 3.5 : nextFloor % 5 === 0 ? 2.8 : 1.0;
		const maxHp = Math.round(baseHp * bossMult);

		run.guardian_hp_max = maxHp;
		run.guardian_hp_current = maxHp;

		// Reset boss timer with Astral Bulwark bonus
		const bulwark = run.perks?.find((p) => p.id === 'astral_bulwark');
		this.bossTimer = 30 + (bulwark ? bulwark.rank * 10 : 0);
		this.isBossEnraged = false;

		// Loot roll with Spire Scavenger bonus (guaranteed on boss floors)
		const scavenger = run.perks?.find((p) => p.id === 'spire_scavenger');
		const scavBonus = scavenger ? scavenger.rank * 0.15 : 0;
		const lootRoll = Math.random();
		if (run.is_boss_floor || lootRoll < (0.06 + scavBonus)) {
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
		const baseAtk = isWeaponOrCatalyst ? Math.round(6 * Math.pow(1.08, floor - 1)) : 0;
		const baseDef = !isWeaponOrCatalyst ? Math.round(3.5 * Math.pow(1.06, floor - 1)) : 0;

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
			weapon_sharpening: 25,
			swift_strike: 35,
			focus_training: 45,
			deadly_precision: 60,
			elemental_infusion: 50,
			midas_greed: 40
		};
		const multipliers: Record<keyof ActiveUpgrades, number> = {
			weapon_sharpening: 1.30,
			swift_strike: 1.38,
			focus_training: 1.45,
			deadly_precision: 1.50,
			elemental_infusion: 1.35,
			midas_greed: 1.40
		};
		const base = baseCosts[upgradeKey] || 25;
		const mult = multipliers[upgradeKey] || 1.35;
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

	// Roguelike Run Perks & Boss Drafting
	public openPerkDraftModal() {
		if (!this.player) return;
		if (this.currentPerkChoices.length === 0) {
			this.currentPerkChoices = rollPerkChoices(this.player.active_run.current_floor, this.player.active_run.perks || []);
			this.currentRerollCount = 0;
		}
		this.activeModal = 'perk_draft';
	}

	public closePerkDraftModal() {
		this.activeModal = null;
	}

	public getRerollCost(): number {
		return getPerkRerollCost(this.currentRerollCount, this.player?.active_run.current_floor || 1);
	}

	public rerollPerkChoices() {
		if (!this.player) return;
		const cost = this.getRerollCost();
		if (this.player.active_run.gold >= cost) {
			this.player.active_run.gold -= cost;
			this.currentRerollCount++;
			this.currentPerkChoices = rollPerkChoices(this.player.active_run.current_floor, this.player.active_run.perks || []);
			sfx.playReroll();
			this.addToast('Rerolled Spire Boons!', 'info');
		} else {
			this.addToast('Not enough Gold to reroll!', 'warning');
		}
	}

	public selectPerk(chosenPerk: RunPerk) {
		if (!this.player) return;
		const run = this.player.active_run;
		if (!run.perks) run.perks = [];

		const existing = run.perks.find((p) => p.id === chosenPerk.id);
		if (existing) {
			existing.rank += 1;
			const def = PERK_DEFINITIONS[existing.id];
			existing.rarity = getRarityForRank(def?.baseRarity || 'common', existing.rank);
			existing.description = def ? def.getDescription(existing.rank) : existing.description;
		} else {
			run.perks.push({ ...chosenPerk });
		}

		run.pending_perk_picks = Math.max(0, (run.pending_perk_picks || 1) - 1);
		sfx.playPerkSelect();
		this.addToast(`✨ Claimed Boon: ${chosenPerk.name}!`, 'success');

		if (run.pending_perk_picks > 0) {
			// Roll next set of 3 choices
			this.currentPerkChoices = rollPerkChoices(run.current_floor, run.perks);
			this.currentRerollCount = 0;
		} else {
			this.currentPerkChoices = [];
			this.currentRerollCount = 0;
			this.activeModal = null;
		}
	}

	public getPerkUpgradeCost(rarity: PerkRarity, rank: number): number {
		return getPerkUpgradeCost(rarity, rank);
	}

	public upgradePerk(perkId: string) {
		if (!this.player) return;
		const run = this.player.active_run;
		if (!run.perks) return;

		const perk = run.perks.find((p) => p.id === perkId);
		if (!perk || perk.rank >= 5) return;

		const cost = getPerkUpgradeCost(perk.rarity, perk.rank);
		if (run.gold >= cost) {
			run.gold -= cost;
			perk.rank += 1;
			const def = PERK_DEFINITIONS[perk.id];
			perk.rarity = getRarityForRank(def?.baseRarity || 'common', perk.rank);
			perk.description = def ? def.getDescription(perk.rank) : perk.description;
			sfx.playLevelUp();
			this.addToast(`⚡ Forged ${perk.name} to Rank ${perk.rank} (${perk.rarity.toUpperCase()})!`, 'success');
		} else {
			this.addToast(`Need ${cost.toLocaleString()} Gold to forge!`, 'warning');
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

	public unequipItem(slot: GearSlot) {
		if (!this.player) return;
		const current = this.player.equipped_gear[slot];
		if (!current) return;
		current.is_equipped = false;
		this.player.equipped_gear[slot] = null;
		this.player.inventory.push(current);
		sfx.playSlash();
		this.addToast(`Unequipped ${current.name}`, 'info');
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
			if (this.player) {
				this.player.active_run.perks = [];
				this.player.active_run.pending_perk_picks = 0;
			}
			this.currentPerkChoices = [];
			this.currentRerollCount = 0;
			this.consecutiveHits = 0;
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
		const catalyst = this.player.active_run.perks?.find((p) => p.id === 'alchemical_catalyst');
		const isDebuff = buff.is_debuff || buff.multiplier < 1.0;
		if (catalyst) {
			buff.duration_seconds += catalyst.rank * 15;
			buff.time_remaining += catalyst.rank * 15;
			if (!isDebuff) {
				buff.multiplier *= 1 + catalyst.rank * 0.30;
			}
		}
		if (buff.gold_reward && buff.gold_reward > 0) {
			this.player.active_run.gold += buff.gold_reward;
			this.player.active_run.total_gold_this_run += buff.gold_reward;
			sfx.playGold();
			this.addToast(`🪙 Astral Bounty: +${Math.round(buff.gold_reward).toLocaleString()} Gold!`, 'loot');
		}

		this.player.active_run.active_buffs.push(buff);
		if (isDebuff) {
			sfx.playMinigameMiss();
			const pct = Math.round((buff.multiplier - 1) * 100);
			this.addToast(`Gambit Affliction: ${buff.name} (${pct}%)!`, 'warning');
		} else {
			sfx.playMinigameSuccess();
			const pct = Math.round((buff.multiplier - 1) * 100);
			this.addToast(`Gambit Victorious: ${buff.name} (+${pct}%)!`, 'success');
		}
	}

	// Modal Controls
	public openGameOptionsModal() {
		this.activeModal = 'game_options';
	}

	public openAuthModal() {
		this.activeModal = 'auth';
	}

	public closeModal() {
		this.activeModal = null;
	}

	// Hard Reset Everything
	public async resetEverything(): Promise<boolean> {
		if (!this.player) return false;
		try {
			const res = await api.resetPlayer();
			this.player = res.player;
			if (this.player) {
				if (!this.player.active_run.perks) this.player.active_run.perks = [];
				if (this.player.active_run.pending_perk_picks === undefined) this.player.active_run.pending_perk_picks = 0;
			}
			this.currentPerkChoices = [];
			this.currentRerollCount = 0;
			this.consecutiveHits = 0;
			this.isBossEnraged = false;
			this.bossTimer = 30;
			this.attackAccumulator = 0;
			this.floatingDamages = [];

			sfx.playAscension();
			this.addToast('🌟 Reset Complete: All progression reset back to Floor 1!', 'ascend');
			if (this.activeModal === 'game_options') {
				this.activeModal = null;
			}
			return true;
		} catch (err: any) {
			this.addToast(err.message || 'Reset failed', 'warning');
			return false;
		}
	}

	// Authentication Handlers
	public async loginWithGoogle(payload: {
		credential?: string;
		google_id?: string;
		email?: string;
		name?: string;
		picture?: string;
		guest_token_to_link?: string;
	}): Promise<boolean> {
		try {
			const res = await api.loginWithGoogle(payload);
			this.player = res.player;
			if (this.player) {
				if (!this.player.active_run.perks) this.player.active_run.perks = [];
				if (this.player.active_run.pending_perk_picks === undefined) this.player.active_run.pending_perk_picks = 0;
			}
			this.currentPerkChoices = [];
			this.currentRerollCount = 0;
			this.consecutiveHits = 0;
			this.isBossEnraged = false;
			this.bossTimer = 30;
			this.attackAccumulator = 0;

			sfx.playLevelUp();
			const handle = this.player?.handle || 'Google Ascendant';
			this.addToast(`✨ Welcome, ${handle}! Cloud save active.`, 'success');
			if (this.activeModal === 'auth' || this.activeModal === 'game_options') {
				this.activeModal = null;
			}
			return true;
		} catch (err: any) {
			this.addToast(err.message || 'Google sign-in failed', 'warning');
			return false;
		}
	}

	public async linkGoogleAccount(payload: {
		credential?: string;
		google_id?: string;
		email?: string;
		name?: string;
		picture?: string;
		conflict_strategy?: 'keep_guest' | 'load_cloud';
	}): Promise<any> {
		try {
			const res = await api.linkGoogleAccount(payload);
			if (res.status === 'conflict') {
				return res;
			}
			if (res.player) {
				this.player = res.player;
				if (this.player) {
					if (!this.player.active_run.perks) this.player.active_run.perks = [];
					if (this.player.active_run.pending_perk_picks === undefined) this.player.active_run.pending_perk_picks = 0;
				}
				this.currentPerkChoices = [];
				this.currentRerollCount = 0;
				this.consecutiveHits = 0;
			}
			sfx.playLevelUp();
			this.addToast(`🎉 Progress saved! Cloud backup connected.`, 'success');
			if (this.activeModal === 'auth' || this.activeModal === 'game_options') {
				this.activeModal = null;
			}
			return res;
		} catch (err: any) {
			this.addToast(err.message || 'Linking failed', 'warning');
			throw err;
		}
	}

	public async loginAsGuest(handle?: string, clearExisting: boolean = false): Promise<boolean> {
		try {
			const res = await api.loginAsGuest(handle, clearExisting);
			this.player = res.player;
			if (this.player) {
				if (!this.player.active_run.perks) this.player.active_run.perks = [];
				if (this.player.active_run.pending_perk_picks === undefined) this.player.active_run.pending_perk_picks = 0;
			}
			this.currentPerkChoices = [];
			this.currentRerollCount = 0;
			this.consecutiveHits = 0;
			this.isBossEnraged = false;
			this.bossTimer = 30;
			this.attackAccumulator = 0;

			sfx.playSlash();
			this.addToast('👤 Playing as Guest (progress saved in local browser).', 'info');
			if (this.activeModal === 'auth' || this.activeModal === 'game_options') {
				this.activeModal = null;
			}
			return true;
		} catch (err: any) {
			this.addToast(err.message || 'Guest login failed', 'warning');
			return false;
		}
	}

	public async logout(): Promise<void> {
		api.clearSession();
		await this.loginAsGuest('Guest Ascendant', true);
		this.addToast('👋 Logged out to fresh Guest session.', 'info');
	}
}

export const game = new GameStore();
