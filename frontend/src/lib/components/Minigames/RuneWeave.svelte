<script lang="ts">
	import { game } from '#lib/stores/playerStore.svelte';
	import { api } from '#lib/api/apiClient';
	import { sfx } from '#lib/audio/sfx';
	import type { ElementType } from '#lib/types/game';

	const runes: Array<{ element: ElementType; icon: string; name: string }> = [
		{ element: 'fire', icon: '🔥', name: 'Inferno' },
		{ element: 'ice', icon: '❄️', name: 'Glacier' },
		{ element: 'lightning', icon: '⚡', name: 'Tempest' },
		{ element: 'void', icon: '🌌', name: 'Abyss' }
	];

	let targetSequence: ElementType[] = $state([]);
	let playerSequence: ElementType[] = $state([]);
	let isShowingSequence = $state(false);
	let isPlaying = $state(false);
	let activeFlashIndex = $state<number | null>(null);
	let resultMessage: string | null = $state(null);

	async function startRuneWeave() {
		resultMessage = null;
		playerSequence = [];
		isPlaying = true;
		isShowingSequence = true;

		// Generate random sequence of 3-4 elements
		const elements: ElementType[] = ['fire', 'ice', 'lightning', 'void'];
		const seqLength = 4;
		const newSeq: ElementType[] = [];
		for (let i = 0; i < seqLength; i++) {
			newSeq.push(elements[Math.floor(Math.random() * elements.length)]);
		}
		targetSequence = newSeq;

		// Flash sequence to player
		for (let i = 0; i < newSeq.length; i++) {
			await new Promise((r) => setTimeout(r, 450));
			activeFlashIndex = i;
			sfx.playRuneChime(newSeq[i]);
			await new Promise((r) => setTimeout(r, 450));
			activeFlashIndex = null;
		}

		isShowingSequence = false;
	}

	async function onRuneClick(element: ElementType) {
		if (isShowingSequence || !isPlaying) return;

		sfx.playRuneChime(element);
		playerSequence.push(element);

		const currentIndex = playerSequence.length - 1;
		if (playerSequence[currentIndex] !== targetSequence[currentIndex]) {
			// Failed match
			isPlaying = false;
			resultMessage = '❌ SEQUENCE BROKEN! Try again.';
			sfx.playMinigameMiss();
			return;
		}

		if (playerSequence.length === targetSequence.length) {
			// Complete match!
			isPlaying = false;
			resultMessage = '🌌 ELEMENTAL SURGE UNLEASHED! (+250% BOOST)';
			sfx.playMinigameSuccess();
			try {
				const buff = await api.claimMinigameBuff('rune_weave', 100, true, targetSequence[0]);
				game.applyMinigameBuff(buff);
			} catch (e) {
				console.error(e);
			}
		}
	}
</script>

<div class="rune-weave-box">
	<div class="instructions">
		<h4>Elemental Rune Weave</h4>
		<p>Memorize the flashing sequence of ancient runes and weave them in order!</p>
	</div>

	<!-- Sequence Display -->
	<div class="sequence-display">
		{#if targetSequence.length > 0}
			{#each targetSequence as runeElem, idx}
				<div
					class="sequence-rune badge-{runeElem} {activeFlashIndex === idx ? 'flashing' : ''} {!isShowingSequence && idx < playerSequence.length ? 'matched' : ''}"
				>
					{#if isShowingSequence && activeFlashIndex === idx}
						<span>{runes.find((r) => r.element === runeElem)?.icon}</span>
					{:else if !isShowingSequence && idx < playerSequence.length}
						<span>{runes.find((r) => r.element === playerSequence[idx])?.icon}</span>
					{:else}
						<span>?</span>
					{/if}
				</div>
			{/each}
		{:else}
			<span class="idle-text">Press Start to reveal the elemental weave</span>
		{/if}
	</div>

	{#if resultMessage}
		<div class="result-text">{resultMessage}</div>
	{/if}

	<!-- Rune Inputs -->
	<div class="runes-grid">
		{#each runes as r}
			<button
				class="rune-btn elem-{r.element} {isShowingSequence || !isPlaying ? 'disabled' : ''}"
				disabled={isShowingSequence || !isPlaying}
				onclick={() => onRuneClick(r.element)}
			>
				<span class="rune-icon">{r.icon}</span>
				<span class="rune-label">{r.name}</span>
			</button>
		{/each}
	</div>

	<div class="actions">
		{#if !isPlaying}
			<button class="btn btn-primary" onclick={startRuneWeave}>
				<span>WEAVE RUNES</span>
			</button>
		{/if}
	</div>
</div>

<style>
	.rune-weave-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		padding: 1rem;
	}

	.instructions {
		text-align: center;
	}

	.instructions h4 {
		font-family: var(--font-title);
		color: #ffffff;
		font-size: 1.15rem;
	}

	.instructions p {
		color: var(--text-secondary);
		font-size: 0.85rem;
	}

	.sequence-display {
		display: flex;
		gap: 0.75rem;
		min-height: 54px;
		align-items: center;
		justify-content: center;
	}

	.sequence-rune {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.4rem;
		border: 1px solid var(--border-medium);
		background: rgba(15, 23, 42, 0.6);
		transition: all 0.2s;
	}

	.sequence-rune.flashing {
		transform: scale(1.15);
		box-shadow: 0 0 20px currentColor;
		border-color: #ffffff;
	}

	.sequence-rune.matched {
		border-color: #38bdf8;
		box-shadow: 0 0 10px rgba(56, 189, 248, 0.5);
	}

	.idle-text {
		color: var(--text-muted);
		font-size: 0.85rem;
		font-style: italic;
	}

	.runes-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
		width: 100%;
		max-width: 320px;
	}

	.rune-btn {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--border-subtle);
		padding: 0.85rem;
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.rune-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.08);
		border-color: var(--border-bright);
		transform: translateY(-2px);
	}

	.rune-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.rune-icon {
		font-size: 1.8rem;
	}

	.rune-label {
		font-size: 0.8rem;
		font-weight: 700;
		color: #ffffff;
		letter-spacing: 0.05em;
	}

	.result-text {
		font-size: 0.95rem;
		font-weight: 700;
		color: #38bdf8;
		text-align: center;
		animation: pulseGlow 0.5s ease-out;
	}
</style>
