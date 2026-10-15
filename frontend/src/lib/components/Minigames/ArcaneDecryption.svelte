<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { minigameManager } from '#lib/stores/minigameStore.svelte';
	import { sfx } from '#lib/audio/sfx';

	interface Glyph {
		key: string;
		rune: string;
		color: string;
	}

	const glyphBank: Glyph[] = [
		{ key: 'Q', rune: '⚡', color: '#ffd200' },
		{ key: 'W', rune: '❄️', color: '#00d2ff' },
		{ key: 'E', rune: '🔥', color: '#ff5533' },
		{ key: 'R', rune: '🔮', color: '#a855f7' }
	];

	const diff = minigameManager.selectedDifficulty;
	const wordLength = diff === 'abyssal' ? 6 : diff === 'adept' ? 4 : 3;

	let currentWord: Glyph[] = $state([]);
	let currentInputIndex = $state(0);
	let combo = $state(0);
	let feedbackText = $state<string | null>(null);

	function generateWord(): Glyph[] {
		const word: Glyph[] = [];
		for (let i = 0; i < wordLength; i++) {
			const g = glyphBank[Math.floor(Math.random() * glyphBank.length)];
			word.push(g);
		}
		return word;
	}

	function handleInput(key: string) {
		const upperKey = key.toUpperCase();
		if (!glyphBank.some((g) => g.key === upperKey)) return;

		const targetGlyph = currentWord[currentInputIndex];
		if (upperKey === targetGlyph.key) {
			// Correct rune!
			currentInputIndex++;
			sfx.playSlash();

			if (currentInputIndex >= currentWord.length) {
				// Completed incantation!
				combo++;
				const baseScore = 20 + wordLength * 6 + combo * 4;
				const res = minigameManager.addScore(baseScore);
				sfx.playLevelUp();
				feedbackText = `✨ INCANTATION DECRYPTED! +${res.effectiveDelta} pts (Combo x${combo})`;
				currentWord = generateWord();
				currentInputIndex = 0;
			}
		} else {
			// Misfire!
			combo = 0;
			const penalty = diff === 'abyssal' ? -40 : diff === 'adept' ? -25 : -15;
			const res = minigameManager.addScore(penalty);
			sfx.playMinigameMiss();
			feedbackText = `❌ ARCANE BACKFIRE! ${res.effectiveDelta} pts`;
			currentWord = generateWord();
			currentInputIndex = 0;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		handleInput(e.key);
	}

	onMount(() => {
		currentWord = generateWord();
		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
	});
</script>

<div class="decryption-arena">
	<!-- Header -->
	<div class="decryption-header">
		<span class="cipher-icon">📜</span>
		<div class="header-titles">
			<h4>ARCANE RUNIC DECRYPTION</h4>
			<p>Type matching glyph keys [Q, W, E, R] to channel incantations</p>
		</div>
		<div class="combo-pill font-mono">
			Combo: x{combo}
		</div>
	</div>

	<!-- Current Word Display -->
	<div class="word-rack">
		{#each currentWord as glyph, idx}
			<div
				class="glyph-card {idx < currentInputIndex ? 'solved' : idx === currentInputIndex ? 'active' : ''}"
				style="--glyph-color: {glyph.color};"
			>
				<span class="glyph-rune">{glyph.rune}</span>
				<span class="glyph-key font-mono">{glyph.key}</span>
			</div>
		{/each}
	</div>

	{#if feedbackText}
		<div class="feedback-banner {feedbackText.includes('DECRYPTED') ? 'good' : 'bad'}">
			{feedbackText}
		</div>
	{/if}

	<!-- On-screen Clickable Keypad for Touch / Mouse -->
	<div class="keypad-grid">
		{#each glyphBank as glyph}
			<button
				class="keypad-btn"
				style="--glyph-color: {glyph.color};"
				onclick={() => handleInput(glyph.key)}
			>
				<span class="keypad-rune">{glyph.rune}</span>
				<span class="keypad-char font-mono">[{glyph.key}]</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.decryption-arena {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		width: 100%;
		max-width: 440px;
		background: radial-gradient(circle at 50% 50%, rgba(30, 20, 60, 0.75) 0%, rgba(10, 5, 25, 0.95) 100%);
		border: 1px solid rgba(139, 92, 246, 0.3);
		border-radius: 14px;
		padding: 1.25rem;
		box-shadow: 0 0 25px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(139, 92, 246, 0.1);
	}

	.decryption-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		gap: 0.5rem;
	}

	.cipher-icon {
		font-size: 1.8rem;
	}

	.header-titles h4 {
		font-family: var(--font-title);
		color: #ffffff;
		font-size: 0.95rem;
		margin: 0;
	}

	.header-titles p {
		color: var(--text-secondary);
		font-size: 0.7rem;
		margin: 0;
	}

	.combo-pill {
		font-size: 0.8rem;
		font-weight: 800;
		color: #ffd200;
		background: rgba(255, 210, 0, 0.15);
		border: 1px solid rgba(255, 210, 0, 0.4);
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
	}

	.word-rack {
		display: flex;
		gap: 0.6rem;
		justify-content: center;
		align-items: center;
		min-height: 85px;
		width: 100%;
	}

	.glyph-card {
		width: 54px;
		height: 75px;
		background: rgba(15, 23, 42, 0.8);
		border: 2px solid var(--border-subtle);
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		transition: all 0.15s ease;
	}

	.glyph-card.active {
		border-color: var(--glyph-color);
		box-shadow: 0 0 15px var(--glyph-color);
		transform: scale(1.08);
		background: rgba(255, 255, 255, 0.05);
	}

	.glyph-card.solved {
		opacity: 0.35;
		border-color: #10b981;
		transform: scale(0.95);
	}

	.glyph-rune {
		font-size: 1.5rem;
	}

	.glyph-key {
		font-size: 0.85rem;
		font-weight: 800;
		color: #ffffff;
	}

	.feedback-banner {
		font-size: 0.85rem;
		font-weight: 700;
		padding: 0.3rem 0.75rem;
		border-radius: 6px;
		animation: pulseGlow 0.3s ease-out;
	}

	.feedback-banner.good {
		background: rgba(16, 185, 129, 0.2);
		border: 1px solid #10b981;
		color: #34d399;
	}

	.feedback-banner.bad {
		background: rgba(239, 68, 68, 0.2);
		border: 1px solid #ef4444;
		color: #f87171;
	}

	.keypad-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
		width: 100%;
	}

	.keypad-btn {
		background: rgba(15, 23, 42, 0.8);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		padding: 0.6rem 0.4rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.keypad-btn:hover {
		border-color: var(--glyph-color);
		box-shadow: 0 0 12px var(--glyph-color);
		background: rgba(255, 255, 255, 0.05);
	}

	.keypad-rune {
		font-size: 1.3rem;
	}

	.keypad-char {
		font-size: 0.75rem;
		font-weight: 800;
		color: var(--text-secondary);
	}
</style>
