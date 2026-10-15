<script lang="ts">
	import { onMount } from 'svelte';
	import { game } from '#lib/stores/playerStore.svelte';
	import { api } from '#lib/api/apiClient';

	interface LeaderEntry {
		player_id: string;
		handle: string;
		highest_floor: number;
		ascension_level: number;
	}

	let leaders: LeaderEntry[] = $state([]);
	let isLoading = $state(true);

	onMount(async () => {
		try {
			leaders = await api.getLeaderboard();
		} catch (e) {
			console.error('Failed to load leaderboard:', e);
		} finally {
			isLoading = false;
		}
	});
</script>

<div
	class="modal-overlay"
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	onkeydown={(e) => { if (e.key === 'Escape') game.activeModal = null; }}
	onclick={(e) => { if (e.target === e.currentTarget) game.activeModal = null; }}
>
	<div class="modal-content leaderboard-modal">
		<div class="modal-header">
			<div class="header-left">
				<span class="category-tag">SPIRE HALL OF FAME</span>
				<h2 class="modal-title">Global Spire Ascendants</h2>
			</div>
			<button class="btn btn-sm close-btn" onclick={() => { game.activeModal = null; }}>✕</button>
		</div>

		<div class="leaderboard-body">
			{#if isLoading}
				<div class="loading-state">
					<span>Summoning ancient ascendant records...</span>
				</div>
			{:else if leaders.length === 0}
				<div class="empty-state">
					<span>No ascendants recorded yet. Be the first to reach the upper Spire!</span>
				</div>
			{:else}
				<table class="leaderboard-table font-mono">
					<thead>
						<tr>
							<th class="rank-col">RANK</th>
							<th>ASCENDANT</th>
							<th>HIGHEST FLOOR</th>
							<th>ASCENSION</th>
						</tr>
					</thead>
					<tbody>
						{#each leaders as l, idx}
							<tr class="{l.player_id === game.player?.player_id ? 'current-player' : ''}">
								<td class="rank-col">
									{#if idx === 0} 🥇
									{:else if idx === 1} 🥈
									{:else if idx === 2} 🥉
									{:else} #{idx + 1}
									{/if}
								</td>
								<td class="handle-cell">
									<strong>{l.handle || 'Unknown Hero'}</strong>
									{#if l.player_id === game.player?.player_id}
										<span class="you-tag">YOU</span>
									{/if}
								</td>
								<td class="floor-cell">Floor {l.highest_floor}</td>
								<td class="ascend-cell">Tier {l.ascension_level}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</div>
</div>

<style>
	.leaderboard-modal {
		padding: 1.75rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		max-width: 620px;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.modal-title {
		font-family: var(--font-title);
		font-size: 1.4rem;
		color: #ffffff;
		font-weight: 700;
	}

	.leaderboard-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	.leaderboard-table th {
		text-align: left;
		padding: 0.6rem;
		color: var(--text-muted);
		border-bottom: 1px solid var(--border-medium);
		font-size: 0.75rem;
		letter-spacing: 0.05em;
	}

	.leaderboard-table td {
		padding: 0.75rem 0.6rem;
		border-bottom: 1px solid var(--border-subtle);
		color: #ffffff;
	}

	.rank-col {
		width: 65px;
	}

	.current-player {
		background: rgba(0, 210, 255, 0.1);
	}

	.current-player td {
		color: #00d2ff;
		font-weight: 700;
	}

	.you-tag {
		background: #00d2ff;
		color: #030712;
		font-size: 0.65rem;
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
		margin-left: 0.4rem;
		font-weight: 800;
	}

	.floor-cell {
		color: #fbbf24;
		font-weight: 700;
	}

	.ascend-cell {
		color: #c084fc;
	}

	.loading-state, .empty-state {
		padding: 2.5rem;
		text-align: center;
		color: var(--text-muted);
		font-size: 0.85rem;
	}
</style>
