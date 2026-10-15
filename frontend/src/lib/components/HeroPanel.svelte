<script lang="ts">
	import { game } from '#lib/stores/playerStore.svelte';
	import type { GearSlot, GearItem } from '#lib/types/game';

	let player = $derived(game.player);
	let stats = $derived(game.getEffectiveStats());
	let equipped = $derived(player?.equipped_gear);

	const slotLabels: Record<GearSlot, { name: string; icon: string }> = {
		weapon: { name: 'Weapon', icon: '⚔️' },
		armor: { name: 'Armor', icon: '🛡️' },
		ring: { name: 'Ring', icon: '💍' },
		amulet: { name: 'Amulet', icon: '📿' },
		catalyst: { name: 'Catalyst', icon: '🔮' }
	};

	let selectedItem: GearItem | null = $state(null);
</script>

<div class="glass-panel hero-container">
	<div class="hero-header">
		<div class="hero-identity">
			<span class="hero-handle">{player?.handle || 'Ascendant Rogue'}</span>
			<span class="hero-title">Spire Ascendant • Level {player?.ascension_level || 0}</span>
		</div>

		<div class="currency-group">
			<div class="currency-badge badge-gold" title="Active Run Gold: Used for perk rerolls & rarity forging (resets on Ascension)">
				<span>🪙</span>
				<span class="font-mono">{Math.floor(player?.active_run.gold || 0).toLocaleString()}</span>
			</div>
			<div class="currency-badge badge-perks" title="Active Spire Boons (Earned from defeating Bosses, resets on Ascension)">
				<span>👑</span>
				<span class="font-mono">{player?.active_run.perks?.length || 0} Boons</span>
			</div>
			<div class="currency-badge badge-sparks" title="Ascension Sparks (Permanent Prestige Currency)">
				<span>✨</span>
				<span class="font-mono">{player?.ascension_tree.sparks || 0} Sparks</span>
			</div>
			<div class="currency-badge badge-aether" title="Aether Essences (Crafting & Salvage)">
				<span>💠</span>
				<span class="font-mono">{player?.stats.aether_essences || 0}</span>
			</div>
		</div>
	</div>

	<!-- Equipment Grid -->
	<div class="equipment-section">
		<span class="section-title">EQUIPPED GEAR</span>
		<div class="equipment-grid">
			{#each (['weapon', 'armor', 'ring', 'amulet', 'catalyst'] as GearSlot[]) as slot}
				{@const item = equipped ? equipped[slot] : null}
				<button
					class="slot-card {item ? `rarity-${item.rarity}` : 'empty'}"
					onclick={() => { selectedItem = item; }}
				>
					<div class="slot-icon">{slotLabels[slot].icon}</div>
					<div class="slot-info">
						<span class="slot-type">{slotLabels[slot].name}</span>
						<span class="item-name {item ? `rarity-${item.rarity}` : ''}">
							{item ? item.name : 'Empty Slot'}
						</span>
					</div>
					{#if item}
						<span class="badge-elem badge-{item.element} elem-mini">
							{item.element.substring(0, 1).toUpperCase()}
						</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<!-- Character Statistics Breakdown -->
	<div class="stats-section">
		<span class="section-title">COMBAT STATISTICS</span>
		<div class="stats-grid font-mono">
			<div class="stat-box primary-box">
				<span class="stat-label">EFFECTIVE DPS</span>
				<span class="stat-value highlight-cyan">{stats.dps.toLocaleString()}</span>
			</div>
			<div class="stat-box">
				<span class="stat-label">TOTAL ATTACK</span>
				<span class="stat-value">{stats.totalAtk.toLocaleString()}</span>
			</div>
			<div class="stat-box">
				<span class="stat-label">ATTACK SPEED</span>
				<span class="stat-value">{stats.attackSpeed} / sec</span>
			</div>
			<div class="stat-box">
				<span class="stat-label">CRIT CHANCE</span>
				<span class="stat-value">{(stats.critChance * 100).toFixed(1)}%</span>
			</div>
			<div class="stat-box">
				<span class="stat-label">CRIT MULTIPLIER</span>
				<span class="stat-value">{(stats.critMultiplier * 100).toFixed(0)}%</span>
			</div>
			<div class="stat-box">
				<span class="stat-label">GOLD FIND</span>
				<span class="stat-value highlight-gold">{stats.goldMult.toFixed(2)}x</span>
			</div>
		</div>
	</div>

	<!-- Action Modals Trigger Bar -->
	<div class="action-buttons-bar">
		<button
			class="btn btn-sm"
			onclick={() => { game.activeModal = 'inventory'; }}
		>
			<span>🎒</span>
			<span>Inventory ({player?.inventory.length || 0})</span>
		</button>
		<button
			class="btn btn-sm btn-ascend"
			onclick={() => { game.activeModal = 'ascension'; }}
		>
			<span>🌌</span>
			<span>Ascension ({player?.ascension_tree.sparks || 0})</span>
		</button>
		<button
			class="btn btn-sm"
			onclick={() => { game.activeModal = 'leaderboard'; }}
		>
			<span>🏆</span>
			<span>Leaderboard</span>
		</button>
	</div>
</div>

<style>
	.hero-container {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.hero-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.hero-identity {
		display: flex;
		flex-direction: column;
	}

	.hero-handle {
		font-family: var(--font-title);
		font-size: 1.3rem;
		font-weight: 700;
		color: #ffffff;
		letter-spacing: 0.05em;
	}

	.hero-title {
		font-size: 0.8rem;
		color: var(--text-muted);
		letter-spacing: 0.05em;
	}

	.currency-group {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.currency-badge {
		padding: 0.35rem 0.75rem;
		border-radius: 8px;
		font-size: 0.85rem;
		font-weight: 700;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.badge-gold {
		background: rgba(245, 158, 11, 0.15);
		border: 1px solid rgba(245, 158, 11, 0.4);
		color: #fbbf24;
	}

	.badge-perks {
		background: rgba(176, 92, 255, 0.15);
		border: 1px solid rgba(176, 92, 255, 0.4);
		color: #c084fc;
	}

	.badge-sparks {
		background: rgba(56, 189, 248, 0.15);
		border: 1px solid rgba(56, 189, 248, 0.4);
		color: #38bdf8;
	}

	.badge-aether {
		background: rgba(236, 72, 153, 0.15);
		border: 1px solid rgba(236, 72, 153, 0.4);
		color: #f472b6;
	}

	.section-title {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: var(--text-muted);
		display: block;
		margin-bottom: 0.5rem;
	}

	.equipment-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
		gap: 0.6rem;
	}

	.slot-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--border-subtle);
		padding: 0.6rem;
		border-radius: 10px;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		cursor: pointer;
		text-align: left;
		transition: all 0.2s;
	}

	.slot-card:hover {
		background: rgba(255, 255, 255, 0.07);
		border-color: var(--border-medium);
	}

	.slot-card.rarity-rare { border-color: rgba(56, 189, 248, 0.4); }
	.slot-card.rarity-epic { border-color: rgba(192, 132, 252, 0.4); }
	.slot-card.rarity-legendary { border-color: rgba(251, 191, 36, 0.5); }
	.slot-card.rarity-mythic { border-color: rgba(244, 63, 94, 0.6); }

	.slot-icon {
		font-size: 1.2rem;
	}

	.slot-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}

	.slot-type {
		font-size: 0.65rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.item-name {
		font-size: 0.8rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.elem-mini {
		padding: 0.1rem 0.35rem;
		font-size: 0.65rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
		gap: 0.6rem;
	}

	.stat-box {
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid var(--border-subtle);
		padding: 0.6rem;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.primary-box {
		background: rgba(0, 210, 255, 0.08);
		border-color: rgba(0, 210, 255, 0.3);
	}

	.stat-label {
		font-size: 0.65rem;
		color: var(--text-muted);
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: 0.95rem;
		font-weight: 700;
		color: #ffffff;
	}

	.highlight-cyan {
		color: #38bdf8;
		font-size: 1.1rem;
		text-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
	}

	.highlight-gold {
		color: #fbbf24;
	}

	.action-buttons-bar {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
		padding-top: 0.5rem;
		border-top: 1px solid var(--border-subtle);
	}
</style>
