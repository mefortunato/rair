<script lang="ts">
	import { game } from '#lib/stores/playerStore.svelte';
	import type { PerkCategory, PerkRarity } from '#lib/types/game';

	let player = $derived(game.player);
	let run = $derived(player?.active_run);
	let gold = $derived(run?.gold || 0);
	let perks = $derived(run?.perks || []);
	let pending = $derived(run?.pending_perk_picks || 0);

	let activeFilter = $state<PerkCategory | 'all'>('all');

	const rarityStyles: Record<PerkRarity, { border: string; glow: string; text: string; bg: string }> = {
		common: {
			border: 'rgba(148, 163, 184, 0.3)',
			glow: 'rgba(148, 163, 184, 0.1)',
			text: '#94a3b8',
			bg: 'rgba(30, 41, 59, 0.25)'
		},
		rare: {
			border: 'rgba(0, 210, 255, 0.4)',
			glow: 'rgba(0, 210, 255, 0.2)',
			text: '#38bdf8',
			bg: 'rgba(8, 47, 73, 0.25)'
		},
		epic: {
			border: 'rgba(176, 92, 255, 0.4)',
			glow: 'rgba(176, 92, 255, 0.2)',
			text: '#c084fc',
			bg: 'rgba(59, 7, 100, 0.25)'
		},
		legendary: {
			border: 'rgba(245, 158, 11, 0.5)',
			glow: 'rgba(245, 158, 11, 0.25)',
			text: '#fbbf24',
			bg: 'rgba(69, 26, 3, 0.3)'
		}
	};

	let filteredPerks = $derived(
		activeFilter === 'all'
			? perks
			: perks.filter((p) => p.category === activeFilter)
	);
</script>

<div class="boons-view-container">
	<!-- Header Bar -->
	<div class="glass-panel boons-header-panel">
		<div class="header-left">
			<span class="category-tag">SPIRE ASCENSION MATRIX</span>
			<h3 class="boons-title">Active Run Boons & Celestial Forge</h3>
		</div>

		<div class="header-right">
			<div class="gold-badge font-mono" title="Active Run Gold for perk forging">
				<span>🪙 {Math.floor(gold).toLocaleString()} Run Gold</span>
			</div>
			<div class="boons-count-badge font-mono">
				<span>👑 {perks.length} Active Boon{perks.length !== 1 ? 's' : ''}</span>
			</div>
		</div>
	</div>

	<!-- Pending Boss Reward Banner -->
	{#if pending > 0}
		<div class="pending-alert-banner">
			<div class="alert-info">
				<span class="crown-icon">👑</span>
				<div>
					<span class="alert-heading">Boss Defeated! Spire Boons Awaiting Claim</span>
					<p class="alert-desc">You have {pending} pending draft pick{pending > 1 ? 's' : ''}! Select from 3 randomized boons to enhance your run.</p>
				</div>
			</div>
			<button class="btn btn-primary claim-draft-btn" onclick={() => game.openPerkDraftModal()}>
				<span>CHOOSE BOON (DRAFT) ➔</span>
			</button>
		</div>
	{/if}

	<!-- Filter Tabs -->
	<div class="category-filters">
		<button
			class="filter-pill {activeFilter === 'all' ? 'active' : ''}"
			onclick={() => (activeFilter = 'all')}
		>
			<span>ALL BOONS ({perks.length})</span>
		</button>
		<button
			class="filter-pill {activeFilter === 'offensive' ? 'active' : ''}"
			onclick={() => (activeFilter = 'offensive')}
		>
			<span>⚔️ OFFENSIVE</span>
		</button>
		<button
			class="filter-pill {activeFilter === 'critical' ? 'active' : ''}"
			onclick={() => (activeFilter = 'critical')}
		>
			<span>🎯 CRITICAL</span>
		</button>
		<button
			class="filter-pill {activeFilter === 'elemental' ? 'active' : ''}"
			onclick={() => (activeFilter = 'elemental')}
		>
			<span>🔮 ELEMENTAL</span>
		</button>
		<button
			class="filter-pill {activeFilter === 'utility' ? 'active' : ''}"
			onclick={() => (activeFilter = 'utility')}
		>
			<span>⚡ UTILITY</span>
		</button>
		<button
			class="filter-pill {activeFilter === 'boss' ? 'active' : ''}"
			onclick={() => (activeFilter = 'boss')}
		>
			<span>👑 BOSS</span>
		</button>
		<button
			class="filter-pill {activeFilter === 'tactical' ? 'active' : ''}"
			onclick={() => (activeFilter = 'tactical')}
		>
			<span>🛡️ TACTICAL</span>
		</button>
	</div>

	<!-- Perks Roster Grid -->
	<div class="boons-grid-container">
		{#if perks.length === 0}
			<div class="glass-panel empty-boons-card">
				<span class="empty-icon">👑</span>
				<h4>No Active Boons Yet</h4>
				<p>
					Defeat Boss Guardians on Floors 5, 10, 15, 20... to earn Spire Boon draft picks!
					Draft powerful passive boons that reshape your build, then spend run gold to forge them into legendary ranks.
				</p>
			</div>
		{:else if filteredPerks.length === 0}
			<div class="glass-panel empty-boons-card">
				<h4>No {activeFilter.toUpperCase()} Boons Active</h4>
				<p>You have not drafted any boons in this category during the current run.</p>
			</div>
		{:else}
			<div class="perks-grid">
				{#each filteredPerks as perk (perk.id)}
					{@const style = rarityStyles[perk.rarity] || rarityStyles.common}
					{@const cost = game.getPerkUpgradeCost(perk.rarity, perk.rank)}
					{@const canAfford = gold >= cost}
					{@const isMaxRank = perk.rank >= 5}

					<div
						class="perk-card"
						style="--rarity-border: {style.border}; --rarity-glow: {style.glow}; --rarity-text: {style.text}; --rarity-bg: {style.bg};"
					>
						<div class="perk-icon-wrapper">
							<span class="perk-icon">{perk.icon}</span>
						</div>

						<div class="perk-body">
							<div class="perk-title-bar">
								<h4 class="perk-name">{perk.name}</h4>
								<div class="perk-badges">
									<span class="badge-rarity font-mono">{perk.rarity.toUpperCase()}</span>
									<span class="badge-rank font-mono">Rank {perk.rank} / 5</span>
								</div>
							</div>
							<p class="perk-description">{perk.description}</p>
						</div>

						<div class="perk-action-box">
							{#if isMaxRank}
								<span class="max-forge-tag font-mono">MAX FORGE</span>
							{:else}
								<button
									class="btn btn-sm forge-btn {canAfford ? 'can-afford' : ''}"
									disabled={!canAfford}
									onclick={() => game.upgradePerk(perk.id)}
									title="Spend Run Gold to forge this perk to Rank {perk.rank + 1}"
								>
									<span class="forge-text">⚡ FORGE</span>
									<span class="forge-cost font-mono">{cost.toLocaleString()} 🪙</span>
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.boons-view-container {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		width: 100%;
	}

	.boons-header-panel {
		padding: 1rem 1.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.boons-title {
		font-family: var(--font-title);
		color: #ffffff;
		font-size: 1.25rem;
		font-weight: 800;
		margin: 0;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.gold-badge {
		font-size: 0.85rem;
		font-weight: 800;
		color: #ffd200;
		background: rgba(255, 210, 0, 0.12);
		border: 1px solid rgba(255, 210, 0, 0.35);
		padding: 0.3rem 0.75rem;
		border-radius: 999px;
	}

	.boons-count-badge {
		font-size: 0.85rem;
		font-weight: 800;
		color: #38bdf8;
		background: rgba(56, 189, 248, 0.12);
		border: 1px solid rgba(56, 189, 248, 0.35);
		padding: 0.3rem 0.75rem;
		border-radius: 999px;
	}

	/* Pending Alert */
	.pending-alert-banner {
		background: linear-gradient(135deg, rgba(255, 210, 0, 0.2) 0%, rgba(245, 158, 11, 0.35) 100%);
		border: 1.5px solid #ffd200;
		box-shadow: 0 0 25px rgba(255, 210, 0, 0.3);
		border-radius: 12px;
		padding: 1rem 1.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.alert-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.crown-icon {
		font-size: 2.2rem;
		line-height: 1;
	}

	.alert-heading {
		font-family: var(--font-title);
		font-size: 1.1rem;
		font-weight: 800;
		color: #ffffff;
	}

	.alert-desc {
		font-size: 0.85rem;
		color: #fef08a;
		margin: 0.2rem 0 0 0;
	}

	.claim-draft-btn {
		padding: 0.65rem 1.25rem;
		font-size: 0.9rem;
		font-weight: 900;
		background: linear-gradient(135deg, #ffd200 0%, #f59e0b 100%);
		color: #000000;
		border-color: #ffd200;
		box-shadow: 0 0 20px rgba(255, 210, 0, 0.5);
	}

	/* Filter Pills */
	.category-filters {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.filter-pill {
		background: rgba(15, 23, 42, 0.7);
		border: 1px solid var(--border-subtle);
		padding: 0.4rem 0.85rem;
		border-radius: 8px;
		color: var(--text-secondary);
		font-size: 0.75rem;
		font-weight: 800;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.filter-pill:hover {
		background: rgba(255, 255, 255, 0.05);
		color: #ffffff;
	}

	.filter-pill.active {
		background: rgba(0, 210, 255, 0.2);
		border-color: #00d2ff;
		color: #00d2ff;
		box-shadow: 0 0 10px rgba(0, 210, 255, 0.25);
	}

	/* Perks Grid */
	.boons-grid-container {
		width: 100%;
	}

	.perks-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
		gap: 1rem;
	}

	.perk-card {
		background: var(--rarity-bg);
		border: 1.5px solid var(--rarity-border);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 0 15px var(--rarity-glow);
		border-radius: 12px;
		padding: 1rem 1.25rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		transition: all 0.2s ease;
	}

	.perk-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.7), 0 0 20px var(--rarity-glow);
	}

	.perk-icon-wrapper {
		width: 48px;
		height: 48px;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.perk-icon {
		font-size: 1.8rem;
		line-height: 1;
	}

	.perk-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.perk-title-bar {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.perk-name {
		font-family: var(--font-title);
		font-size: 0.95rem;
		font-weight: 800;
		color: #ffffff;
		margin: 0;
	}

	.perk-badges {
		display: flex;
		gap: 0.35rem;
	}

	.badge-rarity {
		font-size: 0.65rem;
		font-weight: 900;
		color: var(--rarity-text);
		background: rgba(0, 0, 0, 0.4);
		padding: 0.15rem 0.45rem;
		border-radius: 4px;
		border: 1px solid var(--rarity-border);
	}

	.badge-rank {
		font-size: 0.65rem;
		font-weight: 800;
		color: #ffd200;
		background: rgba(0, 0, 0, 0.4);
		padding: 0.15rem 0.45rem;
		border-radius: 4px;
	}

	.perk-description {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin: 0;
		line-height: 1.35;
	}

	.perk-action-box {
		flex-shrink: 0;
	}

	.forge-btn {
		padding: 0.5rem 0.85rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
	}

	.forge-btn.can-afford {
		background: linear-gradient(135deg, #ffd200 0%, #f59e0b 100%);
		color: #000000;
		border-color: #ffd200;
		box-shadow: 0 0 15px rgba(255, 210, 0, 0.4);
	}

	.forge-text {
		font-size: 0.75rem;
		font-weight: 900;
	}

	.forge-cost {
		font-size: 0.65rem;
		font-weight: 800;
	}

	.max-forge-tag {
		font-size: 0.7rem;
		font-weight: 900;
		color: #ffd200;
		background: rgba(255, 210, 0, 0.15);
		border: 1px solid rgba(255, 210, 0, 0.3);
		padding: 0.3rem 0.6rem;
		border-radius: 6px;
	}

	.empty-boons-card {
		padding: 3rem 1.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.75rem;
	}

	.empty-icon {
		font-size: 3rem;
		line-height: 1;
	}

	.empty-boons-card h4 {
		font-family: var(--font-title);
		font-size: 1.3rem;
		color: #ffffff;
		margin: 0;
	}

	.empty-boons-card p {
		color: var(--text-secondary);
		font-size: 0.9rem;
		max-width: 480px;
		margin: 0;
		line-height: 1.4;
	}

	@media (max-width: 640px) {
		.boons-view-container {
			gap: 0.85rem;
		}

		.boons-header-panel {
			padding: 0.85rem;
			gap: 0.75rem;
		}

		.header-right {
			width: 100%;
			justify-content: space-between;
		}

		.category-filters {
			overflow-x: auto;
			white-space: nowrap;
			flex-wrap: nowrap;
			-webkit-overflow-scrolling: touch;
			scrollbar-width: none;
			padding-bottom: 4px;
		}

		.category-filters::-webkit-scrollbar {
			display: none;
		}

		.filter-pill {
			flex-shrink: 0;
			padding: 0.35rem 0.65rem;
			font-size: 0.72rem;
		}

		.perks-grid {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}

		.perk-card {
			padding: 0.85rem;
			gap: 0.75rem;
		}

		.perk-icon-wrapper {
			width: 40px;
			height: 40px;
		}

		.perk-icon {
			font-size: 1.4rem;
		}

		.perk-name {
			font-size: 0.88rem;
		}

		.perk-description {
			font-size: 0.75rem;
		}

		.forge-btn {
			padding: 0.4rem 0.65rem;
		}
	}
</style>
