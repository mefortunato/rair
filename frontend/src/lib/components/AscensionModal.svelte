<script lang="ts">
	import { game } from '#lib/stores/playerStore.svelte';
	import type { ConstellationNode } from '#lib/types/game';

	let player = $derived(game.player);
	let tree = $derived(player?.ascension_tree);
	let sparks = $derived(tree?.sparks || 0);
	let currentFloor = $derived(player?.active_run.current_floor || 1);
	let canAscend = $derived(currentFloor >= 15);

	// Estimate sparks
	let estimatedSparks = $derived(
		Math.max(1, Math.floor(Math.pow(currentFloor / 10, 2.4) * Math.pow(1 + (player?.active_run.total_gold_this_run || 0) / 10000, 0.15)))
	);

	function getNodeCost(node: ConstellationNode) {
		return Math.floor(node.cost_base * Math.pow(node.cost_multiplier, node.current_rank));
	}
</script>

<div
	class="modal-overlay"
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	onkeydown={(e) => { if (e.key === 'Escape') game.activeModal = null; }}
	onclick={(e) => { if (e.target === e.currentTarget) game.activeModal = null; }}
>
	<div class="modal-content ascension-modal">
		<div class="modal-header">
			<div class="header-left">
				<span class="category-tag">ASTRAL CONSTELLATION</span>
				<h2 class="modal-title">Ascension & Astral Sparks</h2>
			</div>
			<button class="btn btn-sm close-btn" onclick={() => { game.activeModal = null; }}>✕</button>
		</div>

		<!-- Ascension Reset Action Callout -->
		<div class="ascension-callout">
			<div class="callout-info">
				<span class="callout-tag">PRESTIGE TRANSMUTATION</span>
				<h3 class="callout-title">Ascend to the Astral Cosmos</h3>
				<p class="callout-desc">
					Ascension wipes your active run floor, run gold, and active boons/perks ({player?.active_run.perks?.length || 0} active), but permanently awards 
					<strong class="highlight-sparks font-mono">+{canAscend ? estimatedSparks : 0} Ascension Sparks</strong> 
					and raises your Ascension Level!
				</p>
			</div>

			<div class="callout-action">
				{#if canAscend}
					<button class="btn btn-ascend" onclick={() => game.ascend()}>
						<span>🌌 ASCEND (+{estimatedSparks} SPARKS)</span>
					</button>
				{:else}
					<div class="locked-ascend">
						<span>🔒 Reaching Floor 15 Required (Currently Floor {currentFloor})</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Constellation Sparks Count -->
		<div class="sparks-banner">
			<div class="sparks-meta">
				<span class="sparks-label">AVAILABLE ASCENSION SPARKS</span>
				<span class="sparks-number font-mono">{sparks} ✨</span>
			</div>
			<div class="sparks-lifetime">
				<span>Times Ascended: <strong>{tree?.times_ascended || 0}</strong></span>
			</div>
		</div>

		<!-- Constellation Perk Tree -->
		<div class="perks-section">
			<span class="section-title">PERMANENT CONSTELLATION PERKS</span>
			<div class="perks-grid">
				{#if tree && tree.nodes}
					{#each (Object.values(tree.nodes) as ConstellationNode[]) as node (node.id)}
						{@const cost = getNodeCost(node)}
						{@const isMax = node.current_rank >= node.max_rank}
						{@const canAfford = sparks >= cost && !isMax}

						<div class="perk-card {canAfford ? 'can-afford' : ''} {isMax ? 'maxed' : ''}">
							<div class="perk-header">
								<span class="perk-name">{node.name}</span>
								<span class="perk-rank font-mono">
									{isMax ? 'MAX' : `${node.current_rank}/${node.max_rank}`}
								</span>
							</div>

							<p class="perk-desc">{node.description}</p>

							<div class="perk-footer">
								{#if isMax}
									<span class="badge-max">MASTERED</span>
								{:else}
									<button
										class="btn btn-sm btn-primary perk-buy-btn"
										disabled={!canAfford}
										onclick={() => game.upgradeConstellation(node.id)}
									>
										<span>Upgrade: {cost} ✨</span>
									</button>
								{/if}
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.ascension-modal {
		padding: 1.75rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		background: radial-gradient(circle at 50% 0%, rgba(176, 92, 255, 0.2) 0%, rgba(10, 15, 26, 0.95) 100%);
		border-color: rgba(176, 92, 255, 0.4);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.modal-title {
		font-family: var(--font-title);
		font-size: 1.5rem;
		color: #ffffff;
		font-weight: 700;
	}

	.close-btn {
		font-size: 1.1rem;
		padding: 0.3rem 0.6rem;
	}

	.ascension-callout {
		background: rgba(176, 92, 255, 0.1);
		border: 1px solid rgba(176, 92, 255, 0.4);
		padding: 1.25rem;
		border-radius: 14px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.callout-info {
		max-width: 420px;
	}

	.callout-tag {
		font-size: 0.65rem;
		font-weight: 800;
		color: #c084fc;
		letter-spacing: 0.15em;
	}

	.callout-title {
		font-family: var(--font-title);
		font-size: 1.2rem;
		color: #ffffff;
		margin: 0.2rem 0;
	}

	.callout-desc {
		font-size: 0.85rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.highlight-sparks {
		color: #38bdf8;
	}

	.locked-ascend {
		font-size: 0.85rem;
		color: var(--text-muted);
		background: rgba(0, 0, 0, 0.4);
		padding: 0.5rem 1rem;
		border-radius: 8px;
		border: 1px dashed var(--border-subtle);
	}

	.sparks-banner {
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid var(--border-subtle);
		padding: 0.85rem 1.25rem;
		border-radius: 12px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.sparks-label {
		font-size: 0.75rem;
		color: var(--text-muted);
		font-weight: 700;
		letter-spacing: 0.1em;
		display: block;
	}

	.sparks-number {
		font-size: 1.6rem;
		font-weight: 900;
		color: #38bdf8;
		text-shadow: 0 0 12px rgba(56, 189, 248, 0.5);
	}

	.sparks-lifetime {
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.perks-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 0.85rem;
		margin-top: 0.5rem;
	}

	.perk-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--border-subtle);
		padding: 1rem;
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		transition: all 0.2s;
	}

	.perk-card.can-afford {
		border-color: rgba(56, 189, 248, 0.4);
	}

	.perk-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.perk-name {
		font-weight: 700;
		color: #ffffff;
		font-size: 0.95rem;
	}

	.perk-rank {
		font-size: 0.75rem;
		color: #c084fc;
	}

	.perk-desc {
		font-size: 0.8rem;
		color: var(--text-secondary);
		flex: 1;
	}

	.perk-footer {
		display: flex;
		justify-content: flex-end;
		margin-top: 0.25rem;
	}

	.badge-max {
		font-size: 0.75rem;
		font-weight: 800;
		color: #34d399;
		letter-spacing: 0.1em;
	}
</style>
