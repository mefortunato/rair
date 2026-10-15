<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { minigameManager } from '#lib/stores/minigameStore.svelte';
	import { sfx } from '#lib/audio/sfx';

	interface Rune {
		id: string;
		name: string;
		icon: string;
		color: string;
		element: string;
	}

	const allRunes: Rune[] = [
		{ id: 'fire', name: 'Ignis', icon: '🔥', color: '#ef4444', element: 'fire' },
		{ id: 'ice', name: 'Glacies', icon: '❄️', color: '#06b6d4', element: 'ice' },
		{ id: 'lightning', name: 'Fulgur', icon: '⚡', color: '#eab308', element: 'lightning' },
		{ id: 'void', name: 'Nihil', icon: '🔮', color: '#a855f7', element: 'void' },
		{ id: 'astral', name: 'Astra', icon: '✨', color: '#ffd200', element: 'fire' },
		{ id: 'earth', name: 'Terra', icon: '🌿', color: '#10b981', element: 'ice' }
	];

	const diff = minigameManager.selectedDifficulty;
	const activeRunesCount = diff === 'abyssal' ? 6 : diff === 'adept' ? 5 : 4;
	const runes = allRunes.slice(0, activeRunesCount);

	let sequence: string[] = $state([]);
	let playerInputIndex = $state(0);
	let isDisplayingSequence = $state(false);
	let activeRuneHighlight = $state<string | null>(null);
	let streak = $state(0);
	let message = $state('Watch the sequence...');
	let timeoutId: number | null = null;

	const flashDuration = diff === 'abyssal' ? 300 : diff === 'adept' ? 450 : 650;
	const pauseDuration = diff === 'abyssal' ? 120 : diff === 'adept' ? 180 : 250;

	function nextRound(extend: boolean = true) {
		if (extend) {
			const randomRune = runes[Math.floor(Math.random() * runes.length)].id;
			sequence.push(randomRune);
		} else {
			// Restart shorter sequence
			const len = diff === 'abyssal' ? 4 : 3;
			sequence = [];
			for (let i = 0; i < len; i++) {
				sequence.push(runes[Math.floor(Math.random() * runes.length)].id);
			}
		}

		playerInputIndex = 0;
		playSequence();
	}

	async function playSequence() {
		isDisplayingSequence = true;
		message = `Memorize sequence (${sequence.length} runes)...`;

		await new Promise((r) => setTimeout(r, 400));

		for (let i = 0; i < sequence.length; i++) {
			const runeId = sequence[i];
			const rune = runes.find((r) => r.id === runeId);
			if (rune) sfx.playRuneChime(rune.element);
			activeRuneHighlight = runeId;

			await new Promise((r) => setTimeout(r, flashDuration));
			activeRuneHighlight = null;
			await new Promise((r) => setTimeout(r, pauseDuration));
		}

		isDisplayingSequence = false;
		message = 'Repeat the sequence!';
	}

	function handleRuneClick(runeId: string) {
		if (isDisplayingSequence) return;

		const expected = sequence[playerInputIndex];
		const rune = runes.find((r) => r.id === runeId);
		if (rune) sfx.playRuneChime(rune.element);

		// Flash clicked rune briefly
		activeRuneHighlight = runeId;
		setTimeout(() => {
			activeRuneHighlight = null;
		}, 150);

		if (runeId === expected) {
			playerInputIndex++;
			// Correct step!
			if (playerInputIndex >= sequence.length) {
				// Completed full chain!
				streak++;
				const baseScore = 20 + sequence.length * 8;
				const res = minigameManager.addScore(baseScore);
				sfx.playLevelUp();
				message = `✨ Chain Complete! +${res.effectiveDelta} pts`;
				setTimeout(() => nextRound(true), 800);
			}
		} else {
			// Mistake!
			streak = 0;
			const penalty = diff === 'abyssal' ? -45 : diff === 'adept' ? -30 : -20;
			const res = minigameManager.addScore(penalty);
			sfx.playMinigameMiss();
			message = `❌ Pattern Broken! ${res.effectiveDelta} pts`;
			setTimeout(() => nextRound(false), 1200);
		}
	}

	onMount(() => {
		nextRound(false);
	});

	onDestroy(() => {
		if (timeoutId) clearTimeout(timeoutId);
	});
</script>

<div class="rune-arena">
	<div class="scribe-header">
		<span class="status-msg">{message}</span>
		<span class="streak-badge">Streak: {streak} | Chain: {sequence.length}</span>
	</div>

	<!-- Circular Rune Grid -->
	<div class="runes-dial">
		{#each runes as rune (rune.id)}
			<button
				class="rune-plate {activeRuneHighlight === rune.id ? 'active-flash' : ''}"
				style="--rune-color: {rune.color};"
				disabled={isDisplayingSequence}
				onclick={() => handleRuneClick(rune.id)}
			>
				<span class="rune-icon">{rune.icon}</span>
				<span class="rune-label">{rune.name}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.rune-arena {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		width: 100%;
		max-width: 420px;
		background: radial-gradient(circle at 50% 50%, rgba(30, 20, 50, 0.7) 0%, rgba(10, 5, 20, 0.95) 100%);
		border: 1px solid rgba(168, 85, 247, 0.3);
		border-radius: 14px;
		padding: 1.5rem 1rem;
		box-shadow: 0 0 25px rgba(0, 0, 0, 0.8), inset 0 0 25px rgba(168, 85, 247, 0.1);
	}

	.scribe-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		text-align: center;
	}

	.status-msg {
		font-family: var(--font-title);
		font-size: 0.95rem;
		font-weight: 700;
		color: #ffffff;
		min-height: 24px;
	}

	.streak-badge {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--text-muted);
		background: rgba(0, 0, 0, 0.4);
		padding: 0.2rem 0.6rem;
		border-radius: 6px;
	}

	.runes-dial {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
		width: 100%;
		max-width: 340px;
	}

	.rune-plate {
		aspect-ratio: 1;
		background: rgba(15, 23, 42, 0.7);
		border: 2px solid var(--border-subtle);
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		cursor: pointer;
		transition: all 0.15s ease;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
	}

	.rune-plate:hover:not(:disabled) {
		border-color: var(--rune-color);
		box-shadow: 0 0 15px var(--rune-color);
		transform: scale(1.05);
	}

	.rune-plate.active-flash {
		background: var(--rune-color);
		border-color: #ffffff;
		box-shadow: 0 0 25px var(--rune-color);
		transform: scale(1.1);
	}

	.rune-plate.active-flash .rune-icon {
		transform: scale(1.2);
	}

	.rune-plate.active-flash .rune-label {
		color: #000000;
		font-weight: 900;
	}

	.rune-icon {
		font-size: 1.8rem;
		transition: transform 0.15s ease;
	}

	.rune-label {
		font-size: 0.7rem;
		font-family: var(--font-title);
		color: var(--text-secondary);
		font-weight: 700;
		letter-spacing: 0.05em;
	}
</style>
