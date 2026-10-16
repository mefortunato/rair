import { api } from '#lib/api/apiClient';
import { game } from '#lib/stores/playerStore.svelte';
import { sfx } from '#lib/audio/sfx';
import type { ActiveBuff } from '#lib/types/game';
import {
	type MinigameId,
	type DifficultyLevel,
	type GambleStat,
	type MinigameChoice,
	type MinigameContainerState,
	MINIGAME_REGISTRY,
	GAMBLE_STATS_REGISTRY
} from '#lib/types/minigames';

class MinigameStore {
	public state = $state<MinigameContainerState>('CHOICE_DRAFT');

	// Cooldown
	public cooldownDuration = 35; // seconds
	public cooldownRemaining = $state(0);
	private cooldownTimer: number | null = null;

	// Draft choices
	public draftChoices = $state<[MinigameChoice, MinigameChoice] | null>(null);
	public selectedChoice = $state<MinigameChoice | null>(null);
	public selectedDifficulty = $state<DifficultyLevel>('adept');

	// Active gameplay session
	public sessionStartTime = 0;
	public sessionElapsedSeconds = $state(0);
	public currentScore = $state(0);
	public rawScore = $state(0);
	public isSessionRunning = $state(false);
	private sessionInterval: number | null = null;

	// Last completed result
	public lastResultBuff = $state<ActiveBuff | null>(null);
	public lastSessionDuration = $state(0);

	// Exponential decay parameters: Half-life = 22s -> lambda = ln(2)/22 ≈ 0.0315
	private readonly lambda = 0.0315;

	constructor() {
		this.generateChoices();
	}

	// Calculate instantaneous Leyline Resonance: e^(-lambda * t)
	public get currentResonance(): number {
		if (!this.isSessionRunning) return 1.0;
		const r = Math.exp(-this.lambda * this.sessionElapsedSeconds);
		return Math.max(0.04, parseFloat(r.toFixed(3)));
	}

	public get resonancePercent(): number {
		return Math.round(this.currentResonance * 100);
	}

	public get resonanceStatus(): 'PEAK' | 'STEADY' | 'WANING' | 'DEPLETED' {
		const r = this.currentResonance;
		if (r >= 0.7) return 'PEAK';
		if (r >= 0.35) return 'STEADY';
		if (r >= 0.15) return 'WANING';
		return 'DEPLETED';
	}

	// Projected stat multiplier and percentage string
	public get projectedEffect(): { multiplier: number; percent: number; isDebuff: boolean } {
		const score = this.currentScore;
		const diff = this.selectedDifficulty;

		let maxBuff = 0.75;
		let maxDebuff = 0.15;

		if (diff === 'abyssal') {
			maxBuff = 3.5;
			maxDebuff = 0.55;
		} else if (diff === 'adept') {
			maxBuff = 1.8;
			maxDebuff = 0.35;
		}

		if (score >= 0) {
			const scoreRatio = Math.min(1.0, score / 120.0);
			const bonus = maxBuff * scoreRatio;
			const mult = parseFloat((1.0 + bonus).toFixed(2));
			return {
				multiplier: mult,
				percent: Math.round((mult - 1) * 100),
				isDebuff: false
			};
		} else {
			const penalty = Math.min(maxDebuff, (Math.abs(score) / 120.0) * maxDebuff);
			const mult = parseFloat(Math.max(0.35, 1.0 - penalty).toFixed(2));
			return {
				multiplier: mult,
				percent: Math.round((mult - 1) * 100),
				isDebuff: true
			};
		}
	}

	// Roll 2 random games paired with 2 random stats
	public generateChoices() {
		const allGameIds = Object.keys(MINIGAME_REGISTRY) as MinigameId[];
		const allStats = Object.keys(GAMBLE_STATS_REGISTRY) as GambleStat[];

		// Pick 2 distinct game IDs
		const idx1 = Math.floor(Math.random() * allGameIds.length);
		let idx2 = Math.floor(Math.random() * (allGameIds.length - 1));
		if (idx2 >= idx1) idx2++;

		// Pick 2 stats (preferably distinct)
		const statIdx1 = Math.floor(Math.random() * allStats.length);
		let statIdx2 = Math.floor(Math.random() * (allStats.length - 1));
		if (statIdx2 >= statIdx1) statIdx2++;

		this.draftChoices = [
			{ gameId: allGameIds[idx1], targetStat: allStats[statIdx1] },
			{ gameId: allGameIds[idx2], targetStat: allStats[statIdx2] }
		];
	}

	// Player selects 1 choice from draft
	public selectChoice(choice: MinigameChoice) {
		this.selectedChoice = choice;
		this.state = 'DIFFICULTY_SELECT';
		sfx.playPerkSelect();
	}

	// Player sets difficulty and begins playing
	public startMinigame(difficulty: DifficultyLevel) {
		this.selectedDifficulty = difficulty;
		this.currentScore = 0;
		this.rawScore = 0;
		this.sessionElapsedSeconds = 0;
		this.sessionStartTime = performance.now();
		this.isSessionRunning = true;
		this.state = 'PLAYING';

		if (this.sessionInterval) clearInterval(this.sessionInterval);
		this.sessionInterval = window.setInterval(() => {
			if (!this.isSessionRunning) return;
			this.sessionElapsedSeconds = (performance.now() - this.sessionStartTime) / 1000;
		}, 100);

		sfx.playLevelUp();
	}

	// Add score with instantaneous exponential decay weighting
	public addScore(basePoints: number): { effectiveDelta: number; currentScore: number } {
		const weight = this.currentResonance;
		const delta = basePoints * weight;
		this.currentScore = Math.round((this.currentScore + delta) * 10) / 10;
		this.rawScore += basePoints;
		return {
			effectiveDelta: Math.round(delta),
			currentScore: Math.round(this.currentScore)
		};
	}

	// Cash out and bank score
	public async cashOut() {
		if (!this.selectedChoice) return;
		this.isSessionRunning = false;
		if (this.sessionInterval) {
			clearInterval(this.sessionInterval);
			this.sessionInterval = null;
		}

		this.lastSessionDuration = Math.round(this.sessionElapsedSeconds);

		try {
			const buff = await api.claimMinigameBuff(
				this.selectedChoice.gameId,
				Math.round(this.currentScore),
				this.selectedDifficulty,
				this.selectedChoice.targetStat,
				60
			);

			game.applyMinigameBuff(buff);
			this.lastResultBuff = buff;
			this.state = 'RESULT_SUMMARY';
		} catch (err) {
			console.error('Failed to claim minigame buff', err);
			this.startCooldown(this.cooldownDuration);
		}
	}

	// Acknowledge summary and begin cooldown
	public dismissSummary() {
		this.startCooldown(this.cooldownDuration);
	}

	// Cooldown timer handler
	public startCooldown(seconds: number = 35) {
		this.cooldownDuration = seconds;
		this.cooldownRemaining = seconds;
		this.state = 'COOLDOWN';

		if (this.cooldownTimer) clearInterval(this.cooldownTimer);
		this.cooldownTimer = window.setInterval(() => {
			this.cooldownRemaining -= 1;
			if (this.cooldownRemaining <= 0) {
				if (this.cooldownTimer) clearInterval(this.cooldownTimer);
				this.cooldownTimer = null;
				this.generateChoices();
				this.state = 'CHOICE_DRAFT';
				sfx.playReroll();
			}
		}, 1000);
	}
}

export const minigameManager = new MinigameStore();
