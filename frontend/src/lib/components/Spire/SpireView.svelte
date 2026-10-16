<script lang="ts">
	import { game } from '#lib/stores/playerStore.svelte';
	import type { ActiveUpgrades } from '#lib/types/game';
	import SpireCombat from '#lib/components/SpireCombat.svelte';

	let player = $derived(game.player);
	let run = $derived(player?.active_run);
	let gold = $derived(run?.gold || 0);
	let stats = $derived(game.getEffectiveStats());

	interface UpgradeMeta {
		key: keyof ActiveUpgrades;
		name: string;
		desc: string;
		icon: string;
	}

	const upgradesList: UpgradeMeta[] = [
		{
			key: 'weapon_sharpening',
			name: 'Weapon Sharpening',
			desc: '+2 Base Attack Power',
			icon: '⚔️'
		},
		{
			key: 'swift_strike',
			name: 'Swift Strike',
			desc: '+0.06 Hits / Second',
			icon: '⚡'
		},
		{
			key: 'focus_training',
			name: 'Focus Training',
			desc: '+1.2% Critical Chance',
			icon: '🎯'
		},
		{
			key: 'deadly_precision',
			name: 'Deadly Precision',
			desc: '+8% Critical Damage',
			icon: '💥'
		},
		{
			key: 'elemental_infusion',
			name: 'Elemental Infusion',
			desc: '+6% Elemental Damage',
			icon: '🔮'
		},
		{
			key: 'midas_greed',
			name: 'Midas Greed',
			desc: '+8% Gold Bounty Multiplier',
			icon: '💰'
		}
	];
</script>

<div class="spire-view-container">
	<!-- Left / Main: Spire Combat Arena -->
	<div class="spire-combat-column">
		<SpireCombat />
	</div>

	<!-- Right: Run Gold Upgrades & Combat Telemetry -->
	<div class="spire-upgrades-column">
		<!-- Active Upgrades Shop -->
		<div class="glass-panel shop-panel">
			<div class="shop-header">
				<div>
					<span class="category-tag">SPIRE PROVIDENCE</span>
					<h3 class="shop-title">Active Run Upgrades</h3>
				</div>
				<div class="gold-badge font-mono">
					<span>🪙 {Math.floor(gold).toLocaleString()}</span>
				</div>
			</div>

			<div class="upgrades-list">
				{#each upgradesList as up (up.key)}
					{@const level = run?.upgrades ? run.upgrades[up.key] || 0 : 0}
					{@const cost = game.getUpgradeCost(up.key)}
					{@const canAfford = gold >= cost}

					<div class="upgrade-row">
						<span class="up-icon">{up.icon}</span>
						<div class="up-info">
							<div class="up-title-row">
								<span class="up-name">{up.name}</span>
								<span class="up-lvl font-mono">Lv.{level}</span>
							</div>
							<span class="up-desc">{up.desc}</span>
						</div>
						<button
							class="btn btn-sm buy-btn {canAfford ? 'can-afford' : ''}"
							disabled={!canAfford}
							onclick={() => game.buyUpgrade(up.key)}
						>
							<span class="font-mono">{cost.toLocaleString()} 🪙</span>
						</button>
					</div>
				{/each}
			</div>
		</div>

		<!-- Combat Telemetry Card -->
		<div class="glass-panel stats-panel">
			<span class="category-tag">COMBAT ATTRIBUTES</span>
			<div class="stats-grid font-mono">
				<div class="stat-box primary-box">
					<span class="stat-label">EFFECTIVE DPS</span>
					<span class="stat-val highlight-cyan">{stats.dps.toLocaleString()}</span>
				</div>
				<div class="stat-box">
					<span class="stat-label">TOTAL ATK</span>
					<span class="stat-val">{stats.totalAtk.toLocaleString()}</span>
				</div>
				<div class="stat-box">
					<span class="stat-label">ATK SPEED</span>
					<span class="stat-val">{stats.attackSpeed} / s</span>
				</div>
				<div class="stat-box">
					<span class="stat-label">CRIT CHANCE</span>
					<span class="stat-val">{(stats.critChance * 100).toFixed(1)}%</span>
				</div>
				<div class="stat-box">
					<span class="stat-label">CRIT DMG</span>
					<span class="stat-val">{(stats.critMultiplier * 100).toFixed(0)}%</span>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.spire-view-container {
		display: grid;
		grid-template-columns: 1.35fr 0.95fr;
		gap: 1.25rem;
		width: 100%;
		align-items: start;
	}

	@media (max-width: 1024px) {
		.spire-view-container {
			grid-template-columns: 1fr;
		}
	}

	.spire-combat-column {
		min-width: 0;
	}

	.spire-upgrades-column {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
	}

	/* Shop Panel */
	.shop-panel {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.shop-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		padding-bottom: 0.75rem;
	}

	.shop-title {
		font-family: var(--font-title);
		color: #ffffff;
		font-size: 1.15rem;
		margin: 0;
	}

	.gold-badge {
		font-size: 0.85rem;
		font-weight: 800;
		color: #ffd200;
		background: rgba(255, 210, 0, 0.12);
		border: 1px solid rgba(255, 210, 0, 0.35);
		padding: 0.25rem 0.65rem;
		border-radius: 999px;
	}

	.upgrades-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.upgrade-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: rgba(15, 23, 42, 0.65);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		padding: 0.5rem 0.75rem;
		transition: all 0.15s ease;
	}

	.upgrade-row:hover {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.up-icon {
		font-size: 1.3rem;
		line-height: 1;
		flex-shrink: 0;
	}

	.up-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.up-title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.up-name {
		font-family: var(--font-title);
		font-size: 0.85rem;
		font-weight: 700;
		color: #ffffff;
	}

	.up-lvl {
		font-size: 0.7rem;
		color: #00d2ff;
		font-weight: 800;
	}

	.up-desc {
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.buy-btn {
		padding: 0.45rem 0.75rem;
		font-size: 0.8rem;
		font-weight: 800;
		flex-shrink: 0;
	}

	.buy-btn.can-afford {
		background: linear-gradient(135deg, #ffd200 0%, #f59e0b 100%);
		color: #000000;
		border-color: #ffd200;
		box-shadow: 0 0 10px rgba(255, 210, 0, 0.3);
	}

	/* Stats Panel */
	.stats-panel {
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	.stat-box {
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid var(--border-subtle);
		padding: 0.4rem 0.6rem;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.stat-box.primary-box {
		grid-column: span 2;
		background: rgba(0, 210, 255, 0.08);
		border-color: rgba(0, 210, 255, 0.3);
	}

	.stat-label {
		font-size: 0.65rem;
		color: var(--text-muted);
		font-weight: 700;
	}

	.stat-val {
		font-size: 0.95rem;
		font-weight: 800;
		color: #ffffff;
	}

	.highlight-cyan {
		color: #00d2ff;
	}

	@media (max-width: 640px) {
		.spire-view-container {
			gap: 0.75rem;
		}

		.shop-panel {
			padding: 0.85rem;
		}

		.stats-panel {
			padding: 0.85rem;
		}

		.upgrade-row {
			padding: 0.5rem;
			gap: 0.5rem;
		}

		.up-name {
			font-size: 0.85rem;
		}

		.up-desc {
			font-size: 0.7rem;
		}

		.buy-btn {
			padding: 0.45rem 0.65rem;
			min-width: 75px;
		}
	}
</style>
