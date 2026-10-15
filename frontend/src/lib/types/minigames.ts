export type MinigameId =
	| 'abyssal_runner'
	| 'fates_gambit'
	| 'alchemical_brewmaster'
	| 'rune_scribe'
	| 'vault_cracker'
	| 'titans_forge'
	| 'celestial_orbit'
	| 'spire_defense'
	| 'astral_angler'
	| 'arcane_decryption';

export type DifficultyLevel = 'novice' | 'adept' | 'abyssal';

export type GambleStat =
	| 'all_damage'
	| 'attack_speed'
	| 'crit_chance'
	| 'crit_multiplier'
	| 'gold_multiplier'
	| 'elemental_boost';

export interface MinigameMeta {
	id: MinigameId;
	title: string;
	subtitle: string;
	icon: string;
	summary: string;
	instructions: string;
	controlsHint: string;
	accentColor: string;
}

export interface GambleStatMeta {
	id: GambleStat;
	label: string;
	icon: string;
	color: string;
	description: string;
}

export interface MinigameChoice {
	gameId: MinigameId;
	targetStat: GambleStat;
}

export type MinigameContainerState =
	| 'COOLDOWN'
	| 'CHOICE_DRAFT'
	| 'DIFFICULTY_SELECT'
	| 'PLAYING'
	| 'RESULT_SUMMARY';

export const MINIGAME_REGISTRY: Record<MinigameId, MinigameMeta> = {
	abyssal_runner: {
		id: 'abyssal_runner',
		title: 'Abyssal Runner',
		subtitle: 'Speed Reflex Lane Dodger',
		icon: '🏃',
		summary: 'Sprint forward along the void causeway. Dodge spikes and miasma while grabbing astral gems.',
		instructions: 'Switch lanes to gather shimmering astral crystals (+pts) and dodge void spikes or miasma traps (-pts). Speed and obstacle frequency scale with difficulty.',
		controlsHint: 'Use [A] / [D], [←] / [→], or click the lane buttons',
		accentColor: '#00d2ff'
	},
	fates_gambit: {
		id: 'fates_gambit',
		title: "Fate's Gambit",
		subtitle: 'High-Stakes Probability Duel',
		icon: '🃏',
		summary: 'Push your hand value close to the limit without busting against the shadow dealer.',
		instructions: 'Draw cards into your hand to beat the dealer without exceeding the Hand Limit. High difficulty introduces large card variance and a narrow limit margin!',
		controlsHint: 'Click [Draw Card] or [Hold & Reveal] to stand',
		accentColor: '#ffd200'
	},
	alchemical_brewmaster: {
		id: 'alchemical_brewmaster',
		title: 'Alchemical Brewmaster',
		subtitle: 'Alembic Distillation Rhythm',
		icon: '🧪',
		summary: 'Distill rising elemental bubbles in the celestial alembic sweet spot.',
		instructions: 'As vaporous bubbles float through the distillation valve, tap precisely within the glowing resonance zone. Missing bubbles or popping corrupted bubbles penalizes score.',
		controlsHint: 'Tap [SPACE], Click, or match Elemental Buttons',
		accentColor: '#10b981'
	},
	rune_scribe: {
		id: 'rune_scribe',
		title: 'Rune Scribe',
		subtitle: 'Memory Matrix Sequence Weaver',
		icon: '🔮',
		summary: 'Replicate cascading ancient rune patterns of escalating complexity.',
		instructions: 'Watch the circular rune dial illuminate in sequence, then reproduce the pattern. Each full chain boosts your score; wrong glyphs shatter the matrix.',
		controlsHint: 'Click or tap the flashing glyphs in sequence',
		accentColor: '#a855f7'
	},
	vault_cracker: {
		id: 'vault_cracker',
		title: 'Vault Cracker',
		subtitle: 'Harmonic Wave Oscilloscope',
		icon: '📻',
		summary: 'Synchronize your harmonic frequency wave with the celestial vault lock.',
		instructions: 'Adjust your wave frequency and amplitude to match the shifting target waveform. Sustained resonance generates high score; desynchronization triggers alarm drain.',
		controlsHint: 'Use [↑] / [↓] or the Frequency Slider to align waves',
		accentColor: '#38bdf8'
	},
	titans_forge: {
		id: 'titans_forge',
		title: "Titan's Forge",
		subtitle: 'Smithing Rhythm & Tempering',
		icon: '🔨',
		summary: 'Strike the incandescent astral blade within the moving Golden Temper Zone.',
		instructions: 'A celestial hammer swings back and forth. Strike when aligned with the Golden Temper Zone. Off-beat strikes on cold or overheating metal damage temper (-pts).',
		controlsHint: 'Press [SPACE] or Click [Strike Anvil]',
		accentColor: '#f97316'
	},
	celestial_orbit: {
		id: 'celestial_orbit',
		title: 'Celestial Orbit',
		subtitle: 'Gravity Slingshot Navigator',
		icon: '🌌',
		summary: 'Tether to gravity wells and slingshot through fields of stardust particles.',
		instructions: 'Hold to engage gravity tether around celestial cores to curve your trajectory; release to slingshot tangentially. Collect stardust and avoid dark matter anomalies.',
		controlsHint: 'Hold [SPACE] or Mouse to tether, release to slingshot',
		accentColor: '#ec4899'
	},
	spire_defense: {
		id: 'spire_defense',
		title: 'Spire Defense',
		subtitle: 'Reflex Point Interceptor',
		icon: '🛡️',
		summary: 'Detonate incoming void projectiles before they breach the Spire Core ward.',
		instructions: 'Void rifts and meteors converge on the central core. Click or tap incoming projectiles to destroy them at range. Core breaches inflict heavy score penalties.',
		controlsHint: 'Click or tap incoming projectiles before they hit',
		accentColor: '#ef4444'
	},
	astral_angler: {
		id: 'astral_angler',
		title: 'Astral Angler',
		subtitle: 'Ethereal Void Sea Tension Reel',
		icon: '🎣',
		summary: 'Track erratic mythical leviathans inside the green tension catch bar.',
		instructions: 'Hold [Reel] to raise the green tension sweet spot, release to let it drop. Keep the swimming fish inside the sweet spot to reel it in. Broken lines penalize score.',
		controlsHint: 'Hold [Reel Button] or [SPACE] to lift tension bar',
		accentColor: '#06b6d4'
	},
	arcane_decryption: {
		id: 'arcane_decryption',
		title: 'Arcane Decryption',
		subtitle: 'Runic Speed Codebreaker',
		icon: '📜',
		summary: 'Decipher streams of ancient incantation glyphs with rapid keystrokes.',
		instructions: 'Press the corresponding rune keys in sequence before the incantation expires. Complete whole words for big combo bonuses; misfires cause spell backfires.',
		controlsHint: 'Press [Q, W, E, R] or click matching runes in sequence',
		accentColor: '#8b5cf6'
	}
};

export const GAMBLE_STATS_REGISTRY: Record<GambleStat, GambleStatMeta> = {
	all_damage: {
		id: 'all_damage',
		label: 'Total Damage',
		icon: '⚔️',
		color: '#ff5533',
		description: 'Amplifies all base attack power across the active run.'
	},
	attack_speed: {
		id: 'attack_speed',
		label: 'Attack Speed',
		icon: '⚡',
		color: '#ffd200',
		description: 'Accelerates attack frequency, landing strikes significantly faster.'
	},
	crit_chance: {
		id: 'crit_chance',
		label: 'Critical Chance',
		icon: '🎯',
		color: '#00d2ff',
		description: 'Multiplies your probability of landing devastating critical hits.'
	},
	crit_multiplier: {
		id: 'crit_multiplier',
		label: 'Critical Damage',
		icon: '💥',
		color: '#ec4899',
		description: 'Dramatically raises the damage multiplier of every critical strike.'
	},
	gold_multiplier: {
		id: 'gold_multiplier',
		label: 'Gold Find',
		icon: '💰',
		color: '#10b981',
		description: 'Multiplies gold bounties harvested from slain guardians.'
	},
	elemental_boost: {
		id: 'elemental_boost',
		label: 'Elemental Mastery',
		icon: '🔮',
		color: '#a855f7',
		description: 'Infuses all elemental attacks with increased resonance and damage.'
	}
};
