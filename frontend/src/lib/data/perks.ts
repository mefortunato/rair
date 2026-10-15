import type { PerkCategory, PerkRarity, RunPerk } from '#lib/types/game';

export interface PerkDefinition {
	id: string;
	name: string;
	icon: string;
	category: PerkCategory;
	baseRarity: PerkRarity;
	getDescription: (rank: number) => string;
}

export const PERK_DEFINITIONS: Record<string, PerkDefinition> = {
	colossus_might: {
		id: 'colossus_might',
		name: 'Colossus Might',
		icon: '⚔️',
		category: 'offensive',
		baseRarity: 'common',
		getDescription: (rank) => `+${rank * 20}% Base Attack Power`
	},
	tempest_agility: {
		id: 'tempest_agility',
		name: 'Tempest Agility',
		icon: '⚡',
		category: 'offensive',
		baseRarity: 'common',
		getDescription: (rank) => `+${(rank * 0.2).toFixed(2)} Attacks / second`
	},
	titan_breaker: {
		id: 'titan_breaker',
		name: 'Titan Breaker',
		icon: '🔨',
		category: 'boss',
		baseRarity: 'rare',
		getDescription: (rank) => `+${rank * 35}% Damage against Boss Guardians`
	},
	berserker_blood: {
		id: 'berserker_blood',
		name: "Berserker's Blood",
		icon: '🩸',
		category: 'offensive',
		baseRarity: 'rare',
		getDescription: (rank) => `Deal up to +${20 + rank * 15}% more damage as enemy HP decreases`
	},
	deadly_focus: {
		id: 'deadly_focus',
		name: 'Deadly Focus',
		icon: '🎯',
		category: 'critical',
		baseRarity: 'common',
		getDescription: (rank) => `+${(rank * 6.0).toFixed(1)}% Critical Strike Chance`
	},
	severing_impact: {
		id: 'severing_impact',
		name: 'Severing Impact',
		icon: '💥',
		category: 'critical',
		baseRarity: 'rare',
		getDescription: (rank) => `+${rank * 40}% Critical Strike Multiplier`
	},
	abyssal_cull: {
		id: 'abyssal_cull',
		name: 'Abyssal Cull',
		icon: '💀',
		category: 'critical',
		baseRarity: 'epic',
		getDescription: (rank) => `Crits execute regular guardians below ${10 + rank * 5}% HP`
	},
	inferno_core: {
		id: 'inferno_core',
		name: 'Inferno Core',
		icon: '🔥',
		category: 'elemental',
		baseRarity: 'common',
		getDescription: (rank) => `+${rank * 30}% Fire Damage & Inferno Advantage`
	},
	glacial_shatter: {
		id: 'glacial_shatter',
		name: 'Glacial Shatter',
		icon: '❄️',
		category: 'elemental',
		baseRarity: 'common',
		getDescription: (rank) => `+${rank * 30}% Ice Damage & Glacier Advantage`
	},
	storm_conductor: {
		id: 'storm_conductor',
		name: 'Storm Conductor',
		icon: '⚡',
		category: 'elemental',
		baseRarity: 'common',
		getDescription: (rank) => `+${rank * 30}% Lightning Damage & Tempest Advantage`
	},
	void_singularity: {
		id: 'void_singularity',
		name: 'Void Singularity',
		icon: '🌀',
		category: 'elemental',
		baseRarity: 'epic',
		getDescription: (rank) => `+${rank * 25}% Universal Void Damage bonus`
	},
	midas_touch: {
		id: 'midas_touch',
		name: 'Midas Touch',
		icon: '🪙',
		category: 'utility',
		baseRarity: 'common',
		getDescription: (rank) => `+${rank * 35}% Gold earned from all Spire encounters`
	},
	spire_scavenger: {
		id: 'spire_scavenger',
		name: 'Spire Scavenger',
		icon: '🎒',
		category: 'utility',
		baseRarity: 'rare',
		getDescription: (rank) => `+${rank * 25}% Gear drop rate and higher rarity chance`
	},
	alchemical_catalyst: {
		id: 'alchemical_catalyst',
		name: 'Alchemical Catalyst',
		icon: '🧪',
		category: 'utility',
		baseRarity: 'rare',
		getDescription: (rank) => `Minigame Buffs last +${rank * 15}s longer and yield +30% power`
	},
	overdrive_echo: {
		id: 'overdrive_echo',
		name: 'Overdrive Echo',
		icon: '🎇',
		category: 'tactical',
		baseRarity: 'epic',
		getDescription: (rank) => `+${rank * 45}% Damage while any Minigame Buff is active`
	},
	bounty_harvest: {
		id: 'bounty_harvest',
		name: 'Sovereign Bounty',
		icon: '👑',
		category: 'boss',
		baseRarity: 'legendary',
		getDescription: (rank) => `Defeating a Boss awards +${rank * 250} bonus Run Gold`
	},
	relentless_momentum: {
		id: 'relentless_momentum',
		name: 'Relentless Momentum',
		icon: '🌪️',
		category: 'tactical',
		baseRarity: 'rare',
		getDescription: (rank) => `+1% Attack Speed per hit up to +${20 + rank * 15}% bonus`
	},
	astral_bulwark: {
		id: 'astral_bulwark',
		name: 'Astral Bulwark',
		icon: '🛡️',
		category: 'tactical',
		baseRarity: 'epic',
		getDescription: (rank) => `Extends Boss Enrage Timer by +${rank * 10} seconds`
	}
};

export const ALL_PERK_IDS = Object.keys(PERK_DEFINITIONS);

export function getRarityForRank(baseRarity: PerkRarity, rank: number): PerkRarity {
	if (rank >= 4) return 'legendary';
	if (rank === 3) return 'epic';
	if (rank === 2) return baseRarity === 'common' ? 'rare' : baseRarity;
	return baseRarity;
}

export function getPerkUpgradeCost(rarity: PerkRarity, rank: number): number {
	const baseCosts: Record<PerkRarity, number> = {
		common: 60,
		rare: 150,
		epic: 350,
		legendary: 800
	};
	const base = baseCosts[rarity] || 60;
	return Math.round(base * Math.pow(1.35, Math.max(0, rank - 1)));
}

export function getPerkRerollCost(rerollCount: number, floor: number = 1): number {
	return Math.round(40 + rerollCount * 25 + floor * 1.5);
}

export function rollPerkChoices(floor: number, existingPerks: RunPerk[] = []): RunPerk[] {
	const existingMap = new Map<string, RunPerk>();
	for (const p of existingPerks) {
		existingMap.set(p.id, p);
	}

	// Shuffle all perks
	const shuffled = [...ALL_PERK_IDS].sort(() => Math.random() - 0.5);
	const pickedIds = shuffled.slice(0, 3);

	return pickedIds.map((id) => {
		const def = PERK_DEFINITIONS[id];
		const existing = existingMap.get(id);
		const targetRank = existing ? existing.rank + 1 : 1;
		const targetRarity = getRarityForRank(def.baseRarity, targetRank);

		return {
			id: def.id,
			name: def.name,
			description: def.getDescription(targetRank),
			icon: def.icon,
			rarity: targetRarity,
			rank: targetRank,
			category: def.category
		};
	});
}
