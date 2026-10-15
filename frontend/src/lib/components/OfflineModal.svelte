<script lang="ts">
	import { game } from '#lib/stores/playerStore.svelte';
	import { sfx } from '#lib/audio/sfx';

	let report = $derived(game.offlineReport);

	function claimOfflineRewards() {
		if (report && game.player) {
			game.player.active_run.gold += report.gold_earned;
			game.player.active_run.total_gold_this_run += report.gold_earned;
			game.player.active_run.current_floor += report.floors_cleared;
			game.player.highest_floor = Math.max(game.player.highest_floor, game.player.active_run.current_floor);

			if (report.items_found && report.items_found.length > 0) {
				game.player.inventory.push(...report.items_found);
			}

			sfx.playAscension();
			game.addToast(`Claimed ${Math.round(report.gold_earned).toLocaleString()} Gold and ${report.floors_cleared} Floors!`, 'success');
		}
		game.offlineReport = null;
		game.activeModal = null;
	}

	function formatTime(seconds: number): string {
		const hrs = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		if (hrs > 0) return `${hrs}h ${mins}m`;
		return `${mins}m`;
	}
</script>

<div class="modal-overlay">
	<div class="modal-content offline-modal">
		<div class="offline-header">
			<span class="category-tag">CHRONOS HARVEST</span>
			<h2 class="offline-title">Welcome Back, Ascendant!</h2>
			<p class="offline-subtitle">
				While you were resting, your idle hero channeled astral power and climbed the Spire.
			</p>
		</div>

		{#if report}
			<div class="gains-grid font-mono">
				<div class="gain-card">
					<span class="gain-label">TIME AWAY</span>
					<span class="gain-val">{formatTime(report.elapsed_seconds)}</span>
				</div>
				<div class="gain-card highlight-cyan">
					<span class="gain-label">FLOORS CLIMBED</span>
					<span class="gain-val">+{report.floors_cleared}</span>
				</div>
				<div class="gain-card highlight-gold">
					<span class="gain-label">GOLD HARVESTED</span>
					<span class="gain-val">+{Math.round(report.gold_earned).toLocaleString()} 🪙</span>
				</div>
				<div class="gain-card highlight-purple">
					<span class="gain-label">GEAR FOUND</span>
					<span class="gain-val">+{report.items_found?.length || 0} ⚔️</span>
				</div>
			</div>
		{/if}

		<div class="offline-actions">
			<button class="btn btn-primary btn-claim" onclick={claimOfflineRewards}>
				<span>✨ CLAIM OFFLINE GAINS ✨</span>
			</button>
		</div>
	</div>
</div>

<style>
	.offline-modal {
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		text-align: center;
		max-width: 540px;
		background: radial-gradient(circle at 50% 0%, rgba(0, 210, 255, 0.2) 0%, rgba(10, 15, 26, 0.95) 100%);
		border-color: rgba(0, 210, 255, 0.4);
	}

	.offline-title {
		font-family: var(--font-title);
		font-size: 1.6rem;
		color: #ffffff;
		margin: 0.25rem 0;
	}

	.offline-subtitle {
		color: var(--text-secondary);
		font-size: 0.85rem;
	}

	.gains-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.gain-card {
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid var(--border-subtle);
		padding: 1rem;
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.gain-label {
		font-size: 0.7rem;
		color: var(--text-muted);
		letter-spacing: 0.05em;
	}

	.gain-val {
		font-size: 1.25rem;
		font-weight: 800;
		color: #ffffff;
	}

	.highlight-cyan .gain-val { color: #38bdf8; }
	.highlight-gold .gain-val { color: #fbbf24; }
	.highlight-purple .gain-val { color: #c084fc; }

	.btn-claim {
		width: 100%;
		padding: 0.85rem;
		font-size: 1.05rem;
	}
</style>
