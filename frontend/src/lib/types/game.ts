export type ElementType = 'fire' | 'ice' | 'lightning' | 'void' | 'neutral';
export type GearSlot = 'weapon' | 'armor' | 'ring' | 'amulet' | 'catalyst';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface Affix {
	stat: string;
	value: number;
	description: string;
}

export interface GearItem {
	id: string;
	name: string;
	slot: GearSlot;
	rarity: Rarity;
	element: ElementType;
	level: number;
	base_atk: number;
	base_def: number;
	affixes: Affix[];
	salvage_value: number;
	is_equipped?: boolean;
}

export interface ConstellationNode {
	id: string;
	name: string;
	description: string;
	current_rank: number;
	max_rank: number;
	cost_base: number;
	cost_multiplier: number;
	effect_per_rank: number;
}

export interface AscensionTree {
	sparks: number;
	total_sparks_earned: number;
	times_ascended: number;
	nodes: Record<string, ConstellationNode>;
}

export interface ActiveBuff {
	id: string;
	name: string;
	multiplier: number;
	buff_type: 'all_damage' | 'attack_speed' | 'crit_chance' | 'crit_multiplier' | 'gold_multiplier' | 'elemental_boost' | string;
	duration_seconds: number;
	time_remaining: number;
	is_debuff?: boolean;
	gold_reward?: number;
}

export interface ActiveUpgrades {
	weapon_sharpening: number;
	swift_strike: number;
	focus_training: number;
	deadly_precision: number;
	elemental_infusion: number;
	midas_greed: number;
}

export type PerkRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type PerkCategory = 'offensive' | 'critical' | 'elemental' | 'utility' | 'boss' | 'tactical';

export interface RunPerk {
	id: string;
	name: string;
	description: string;
	icon: string;
	rarity: PerkRarity;
	rank: number;
	category: PerkCategory;
}

export interface ActiveRun {
	current_floor: number;
	highest_floor_this_run: number;
	gold: number;
	total_gold_this_run: number;
	guardian_hp_current: number;
	guardian_hp_max: number;
	guardian_element: ElementType;
	is_boss_floor: boolean;
	upgrades: ActiveUpgrades;
	perks: RunPerk[];
	pending_perk_picks: number;
	active_buffs: ActiveBuff[];
}

export interface PlayerStats {
	base_atk: number;
	attack_speed: number;
	crit_chance: number;
	crit_multiplier: number;
	fire_bonus: number;
	ice_bonus: number;
	lightning_bonus: number;
	void_bonus: number;
	gold_multiplier: number;
	aether_essences: number;
}

export interface Player {
	player_id: string;
	guest_token: string;
	handle: string;
	auth_provider?: 'guest' | 'google';
	google_id?: string;
	email?: string;
	avatar_url?: string;
	is_guest?: boolean;
	created_at: string;
	updated_at: string;
	last_active: string;
	highest_floor: number;
	ascension_level: number;
	active_run: ActiveRun;
	stats: PlayerStats;
	ascension_tree: AscensionTree;
	equipped_gear: Record<GearSlot, GearItem | null>;
	inventory: GearItem[];
}

export interface ConflictSummary {
	handle: string;
	highest_floor: number;
	sparks: number;
	inventory_count: number;
}

export interface LinkGoogleResponse {
	status: 'linked' | 'cloud_loaded' | 'conflict' | 'already_linked';
	message?: string;
	player?: Player;
	token?: string;
	guest_summary?: ConflictSummary;
	cloud_summary?: ConflictSummary;
}

export interface OfflineReport {
	elapsed_seconds: number;
	floors_cleared: number;
	gold_earned: number;
	items_found: GearItem[];
}
