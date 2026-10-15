<script lang="ts">
	import { game } from '#lib/stores/playerStore.svelte';

	let player = $derived(game.player);
	let run = $derived(player?.active_run);
	let gold = $derived(run?.gold || 0);

	type UpgradeKey = keyof typeof run.upgrades;

	const upgradeList: Array<{
		key: UpgradeKey;
		name: string;
		desc: string;
		icon: string;
		unit: string;
	}> = [
		{ key: 'weapon_sharpening', name: 'Weapon Sharpening', desc: '+5 Base Attack Power', icon: '⚔️', unit: 'ATK' },
		{ key: 'swift_strike', name: 'Swift Strike', desc: '+0.15 Attacks / sec', icon: '⚡', unit: 'SPD' },
		{ key: 'focus_training', name: 'Focus Training', desc: '+2.0% Critical Strike Chance', icon: '🎯', unit: 'CRIT' },
		{ key: 'deadly_precision', name: 'Deadly Precision', desc: '+15% Critical Damage', icon: '💥', unit: 'CDMG' },
		{ key: 'elemental_infusion', name: 'Elemental Infusion', desc: '+20% Advantage Damage', icon: '🔥', unit: 'ELEM' },
		{ key: 'midas_greed', name: 'Midas Greed', desc: '+15% Gold Find Multiplier', icon: '🪙', unit: 'GOLD' }
	];
</script>

<div class="glass-panel upgrades-container">
	<div class="upgrades-header">
		<div class="header-title">
			<span class="category-tag">ACTIVE RUN SHOP</span>
			<h3 class="shop-title">Run Enhancements</h3>
		</div>
		<div class="shop-gold-badge font-mono">
			<span>🪙</span>
			<span>{Math.floor(gold).toLocaleString()} Gold</span>
		</div>
	</div>

	<div class="upgrades-grid">
		{#each upgradeList as up}
			{@const level = run?.upgrades[up.key] || 0}
			{@const cost = game.getUpgradeCost(up.key)}
			{@const canAfford = gold >= cost}

			<div class="upgrade-card {canAfford ? 'can-afford' : ''}">
				<div class="card-icon">{up.icon}</div>
				<div class="card-details">
					<div class="card-title-row">
						<span class="upgrade-name">{up.name}</span>
						<span class="upgrade-rank font-mono">Rank {level}</span>
					</div>
					<span class="upgrade-desc">{up.desc}</span>
				</div>

				<button
					class="btn btn-sm btn-gold buy-btn"
					disabled={!canAfford}
					onclick={() => game.buyUpgrade(up.key)}
				>
					<span class="font-mono">{cost.toLocaleString()} 🪙</span>
				</button>
			</div>
		{/each}
	</div>
</div>

<style>
	.upgrades-container {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.upgrades-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
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
		font-weight: 700;
	}

	.shop-gold-badge {
		background: rgba(245, 158, 11, 0.15);
		border: 1px solid rgba(245, 158, 11, 0.35);
		color: #fbbf24;
		padding: 0.3rem 0.75rem;
		border-radius: 9999px;
		font-weight: 700;
		font-size: 0.85rem;
	}

	.upgrades-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 0.75rem;
	}

	.upgrade-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid var(--border-subtle);
		padding: 0.85rem;
		border-radius: 12px;
		display: flex;
		align-items: center;
		gap: 0.85rem;
		transition: all 0.2s;
	}

	.upgrade-card.can-afford {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(251, 191, 36, 0.3);
	}

	.upgrade-card:hover {
		border-color: var(--border-medium);
	}

	.card-icon {
		font-size: 1.6rem;
		width: 44px;
		height: 44px;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid var(--border-subtle);
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
		gap: 0.2rem;
	}

	.card-title-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.upgrade-name {
		font-size: 0.9rem;
		font-weight: 700;
		color: #ffffff;
	}

	.upgrade-rank {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.upgrade-desc {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.buy-btn {
		flex-shrink: 0;
		min-width: 90px;
	}
</style>
