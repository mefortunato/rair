<script lang="ts">
	import { onMount } from 'svelte';
	import { game } from '#lib/stores/playerStore.svelte';
	import { api } from '#lib/api/apiClient';
	import { sfx } from '#lib/audio/sfx';
	import type { ElementType } from '#lib/types/game';

	const elements: ElementType[] = ['fire', 'ice', 'lightning', 'void'];
	const icons: Record<ElementType, string> = {
		fire: '🔥',
		ice: '❄️',
		lightning: '⚡',
		void: '🌌',
		neutral: '💎'
	};

	let grid: ElementType[] = $state([]);
	let selectedIndices: number[] = $state([]);
	let resultMessage: string | null = $state(null);

	function initGrid() {
		resultMessage = null;
		selectedIndices = [];
		const newGrid: ElementType[] = [];
		for (let i = 0; i < 9; i++) {
			newGrid.push(elements[Math.floor(Math.random() * elements.length)]);
		}
		// Ensure at least one element has at least 3 occurrences
		const counts: Record<string, number> = {};
		newGrid.forEach((e) => (counts[e] = (counts[e] || 0) + 1));
		if (!Object.values(counts).some((c) => c >= 3)) {
			newGrid[0] = 'fire';
			newGrid[1] = 'fire';
			newGrid[2] = 'fire';
		}
		grid = newGrid;
	}

	async function selectShard(index: number) {
		if (selectedIndices.includes(index)) {
			selectedIndices = selectedIndices.filter((i) => i !== index);
			return;
		}

		selectedIndices.push(index);
		sfx.playRuneChime(grid[index]);

		if (selectedIndices.length === 3) {
			const [i1, i2, i3] = selectedIndices;
			const e1 = grid[i1];
			const e2 = grid[i2];
			const e3 = grid[i3];

			if (e1 === e2 && e2 === e3) {
				// Successful transmutation!
				resultMessage = `✨ TRANSMUTED 3 ${e1.toUpperCase()} SHARDS! (2X GOLD ELIXIR) ✨`;
				sfx.playMinigameSuccess();

				try {
					const buff = await api.claimMinigameBuff('alchemical_transmutation', 100, true, e1);
					game.applyMinigameBuff(buff);
				} catch (e) {
					console.error(e);
				}

				// Refill transmuting shards
				setTimeout(() => {
					grid[i1] = elements[Math.floor(Math.random() * elements.length)];
					grid[i2] = elements[Math.floor(Math.random() * elements.length)];
					grid[i3] = elements[Math.floor(Math.random() * elements.length)];
					selectedIndices = [];
				}, 600);
			} else {
				// Mismatched
				resultMessage = '❌ Elements must match! Selected shards reset.';
				sfx.playMinigameMiss();
				setTimeout(() => {
					selectedIndices = [];
				}, 500);
			}
		}
	}

	onMount(() => {
		if (grid.length === 0) {
			initGrid();
		}
	});
</script>

<div class="alchemy-box">
	<div class="instructions">
		<h4>Alchemical Transmutation</h4>
		<p>Select 3 matching elemental shards to transmute a powerful combat elixir!</p>
	</div>

	<!-- 3x3 Shard Grid -->
	<div class="shards-grid">
		{#each grid as elem, idx}
			<button
				class="shard-cell badge-{elem} {selectedIndices.includes(idx) ? 'selected' : ''}"
				onclick={() => selectShard(idx)}
			>
				<span class="shard-icon">{icons[elem]}</span>
			</button>
		{/each}
	</div>

	{#if resultMessage}
		<div class="result-text">{resultMessage}</div>
	{/if}

	<div class="actions">
		<button class="btn btn-sm" onclick={initGrid}>
			<span>🔄 Reshuffle Shards</span>
		</button>
	</div>
</div>

<style>
	.alchemy-box {
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

	.shards-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
		width: 220px;
		height: 220px;
	}

	.shard-cell {
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
		background: rgba(15, 23, 42, 0.8);
		border: 1px solid var(--border-medium);
	}

	.shard-cell:hover {
		transform: scale(1.08);
		border-color: #ffffff;
	}

	.shard-cell.selected {
		transform: scale(1.12);
		border-color: #ffd200;
		box-shadow: 0 0 16px rgba(255, 210, 0, 0.7);
	}

	.shard-icon {
		font-size: 2rem;
		filter: drop-shadow(0 0 6px currentColor);
	}

	.result-text {
		font-size: 0.95rem;
		font-weight: 700;
		color: #f59e0b;
		text-align: center;
		animation: pulseGlow 0.5s ease-out;
	}
</style>
