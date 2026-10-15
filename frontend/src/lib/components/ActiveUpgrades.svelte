<script lang="ts">
	import { game } from '#lib/stores/playerStore.svelte';
	import type { PerkRarity } from '#lib/types/game';

	let player = $derived(game.player);
	let run = $derived(player?.active_run);
	let gold = $derived(run?.gold || 0);
	let perks = $derived(run?.perks || []);
	let pending = $derived(run?.pending_perk_picks || 0);

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
</script>

<div class="glass-panel upgrades-container">
	<div class="upgrades-header">
		<div class="header-title">
			<span class="category-tag">SPIRE BOONS & FORGE</span>
			<h3 class="shop-title">Active Run Perks</h3>
		</div>
		<div class="shop-gold-badge font-mono" title="Active Run Gold: Used for perk rerolls and rarity forging">
			<span class="gold-icon">🪙</span>
			<span>{Math.floor(gold).toLocaleString()} Run Gold</span>
		</div>
	</div>

	<!-- Pending Boss Reward Banner -->
	{#if pending > 0}
		<div class="pending-alert-banner">
			<div class="alert-info">
				<span class="crown-icon">👑</span>
				<div>
					<span class="alert-heading">Boss Defeated!</span>
					<p class="alert-desc">{pending} Spire Boon{pending > 1 ? 's' : ''} available to claim</p>
				</div>
			</div>
			<button class="btn btn-sm btn-claim" onclick={() => game.openPerkDraftModal()}>
				<span>CHOOSE BOON ➔</span>
			</button>
		</div>
	{/if}

	<!-- Perks Roster / Grid -->
	{#if perks.length === 0}
		<div class="empty-perks-card">
			<div class="empty-icon">🛡️</div>
			<h4 class="empty-title">No Active Boons</h4>
			<p class="empty-desc">
				Vanquish Boss Guardians on Floors 5, 10, 15... to draft 3 randomized roguelike perks!
				Spend active run gold to reroll choices or forge perks into higher rarities.
			</p>
		</div>
	{:else}
		<div class="upgrades-grid">
			{#each perks as perk (perk.id)}
				{@const style = rarityStyles[perk.rarity] || rarityStyles.common}
				{@const cost = game.getPerkUpgradeCost(perk.rarity, perk.rank)}
				{@const canAfford = gold >= cost}
				{@const isMaxRank = perk.rank >= 5}

				<div
					class="perk-card"
					style="--rarity-border: {style.border}; --rarity-glow: {style.glow}; --rarity-text: {style.text}; --rarity-bg: {style.bg};"
				>
					<div class="card-icon">{perk.icon}</div>

					<div class="card-details">
						<div class="card-title-row">
							<span class="perk-name">{perk.name}</span>
							<div class="badges-row">
								<span class="rarity-badge font-mono">{perk.rarity.toUpperCase()}</span>
								<span class="rank-badge font-mono">Rank {perk.rank}</span>
							</div>
						</div>
						<span class="perk-desc">{perk.description}</span>
					</div>

					<div class="card-action">
						{#if isMaxRank}
							<div class="max-badge font-mono">MAX FORGE</div>
						{:else}
							<button
								class="btn btn-sm btn-forge {canAfford ? 'can-afford' : ''}"
								disabled={!canAfford}
								onclick={() => game.upgradePerk(perk.id)}
								title="Spend run gold to upgrade this perk's rank and rarity"
							>
								<span class="forge-label">⚡ FORGE</span>
								<span class="font-mono forge-cost">{cost.toLocaleString()} 🪙</span>
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.upgrades-container {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.upgrades-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.category-tag {
		font-size: 0.65rem;
		letter-spacing: 0.15em;
		color: var(--text-muted);
		font-weight: 700;
	}

	.shop-title {
		font-family: var(--font-title);
		font-size: 1.25rem;
		color: #ffffff;
		font-weight: 800;
	}

	.shop-gold-badge {
		background: rgba(245, 158, 11, 0.12);
		border: 1px solid rgba(245, 158, 11, 0.4);
		color: #fbbf24;
		padding: 0.35rem 0.85rem;
		border-radius: 9999px;
		font-weight: 700;
		font-size: 0.85rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.gold-icon {
		font-size: 1rem;
	}

	/* Pending Alert Banner */
	.pending-alert-banner {
		background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.3) 100%);
		border: 1px solid rgba(245, 158, 11, 0.6);
		box-shadow: 0 0 20px rgba(245, 158, 11, 0.25);
		border-radius: 12px;
		padding: 0.85rem 1.25rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		animation: pulseBanner 2.5s infinite;
	}

	@keyframes pulseBanner {
		0%, 100% { border-color: rgba(245, 158, 11, 0.5); }
		50% { border-color: rgba(245, 158, 11, 0.9); box-shadow: 0 0 25px rgba(245, 158, 11, 0.4); }
	}

	.alert-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.crown-icon {
		font-size: 1.6rem;
	}

	.alert-heading {
		font-family: var(--font-title);
		font-weight: 800;
		color: #fbbf24;
		font-size: 0.95rem;
	}

	.alert-desc {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.btn-claim {
		background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
		border: none;
		color: #000000;
		font-family: var(--font-title);
		font-weight: 800;
		font-size: 0.8rem;
		letter-spacing: 0.05em;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		cursor: pointer;
		white-space: nowrap;
		box-shadow: 0 2px 10px rgba(245, 158, 11, 0.4);
		transition: all 0.2s;
	}

	.btn-claim:hover {
		filter: brightness(1.15);
		transform: translateY(-2px);
	}

	/* Empty State */
	.empty-perks-card {
		background: rgba(255, 255, 255, 0.015);
		border: 1px dashed var(--border-medium);
		border-radius: 14px;
		padding: 2rem 1.5rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.empty-icon {
		font-size: 2.2rem;
		opacity: 0.6;
		margin-bottom: 0.25rem;
	}

	.empty-title {
		font-family: var(--font-title);
		font-size: 1rem;
		color: #ffffff;
		font-weight: 700;
	}

	.empty-desc {
		font-size: 0.8rem;
		color: var(--text-muted);
		max-width: 440px;
		line-height: 1.45;
	}

	/* Perks Grid */
	.upgrades-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
		gap: 0.85rem;
	}

	.perk-card {
		background: var(--rarity-bg);
		border: 1px solid var(--rarity-border);
		box-shadow: 0 4px 18px var(--rarity-glow);
		padding: 0.9rem;
		border-radius: 12px;
		display: flex;
		align-items: center;
		gap: 0.85rem;
		transition: all 0.2s;
	}

	.perk-card:hover {
		border-color: rgba(255, 255, 255, 0.4);
		transform: translateY(-2px);
	}

	.card-icon {
		font-size: 1.6rem;
		width: 44px;
		height: 44px;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid var(--rarity-border);
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.card-details {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.card-title-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.perk-name {
		font-size: 0.9rem;
		font-weight: 700;
		color: #ffffff;
	}

	.badges-row {
		display: flex;
		gap: 0.3rem;
	}

	.rarity-badge {
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--rarity-text);
		background: rgba(0, 0, 0, 0.35);
		padding: 0.15rem 0.45rem;
		border-radius: 4px;
	}

	.rank-badge {
		font-size: 0.65rem;
		color: var(--text-muted);
		background: rgba(0, 0, 0, 0.25);
		padding: 0.15rem 0.45rem;
		border-radius: 4px;
	}

	.perk-desc {
		font-size: 0.75rem;
		color: var(--text-secondary);
		line-height: 1.35;
	}

	.card-action {
		flex-shrink: 0;
	}

	.btn-forge {
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid rgba(245, 158, 11, 0.3);
		color: var(--text-muted);
		padding: 0.4rem 0.7rem;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		min-width: 84px;
		cursor: not-allowed;
		transition: all 0.2s;
	}

	.btn-forge.can-afford {
		background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.3) 100%);
		border-color: rgba(245, 158, 11, 0.6);
		color: #fbbf24;
		cursor: pointer;
		box-shadow: 0 0 10px rgba(245, 158, 11, 0.2);
	}

	.btn-forge.can-afford:hover {
		background: linear-gradient(135deg, rgba(245, 158, 11, 0.35) 0%, rgba(217, 119, 6, 0.5) 100%);
		transform: translateY(-2px);
		box-shadow: 0 2px 14px rgba(245, 158, 11, 0.4);
	}

	.forge-label {
		font-size: 0.7rem;
		font-weight: 800;
	}

	.forge-cost {
		font-size: 0.7rem;
	}

	.max-badge {
		font-size: 0.65rem;
		font-weight: 800;
		color: #10b981;
		background: rgba(16, 185, 129, 0.15);
		border: 1px solid rgba(16, 185, 129, 0.35);
		padding: 0.35rem 0.6rem;
		border-radius: 6px;
	}
</style>
