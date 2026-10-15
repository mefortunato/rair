<script lang="ts">
	import { game } from '#lib/stores/playerStore.svelte';
	import type { RunPerk, PerkRarity } from '#lib/types/game';

	let player = $derived(game.player);
	let run = $derived(player?.active_run);
	let choices = $derived(game.currentPerkChoices);
	let gold = $derived(run?.gold || 0);
	let pending = $derived(run?.pending_perk_picks || 0);
	let rerollCost = $derived(game.getRerollCost());
	let canAffordReroll = $derived(gold >= rerollCost);

	const rarityColors: Record<PerkRarity, { border: string; glow: string; bg: string; text: string }> = {
		common: {
			border: 'rgba(148, 163, 184, 0.4)',
			glow: 'rgba(148, 163, 184, 0.2)',
			bg: 'rgba(30, 41, 59, 0.5)',
			text: '#cbd5e1'
		},
		rare: {
			border: 'rgba(0, 210, 255, 0.5)',
			glow: 'rgba(0, 210, 255, 0.3)',
			bg: 'rgba(8, 47, 73, 0.5)',
			text: '#38bdf8'
		},
		epic: {
			border: 'rgba(176, 92, 255, 0.5)',
			glow: 'rgba(176, 92, 255, 0.3)',
			bg: 'rgba(59, 7, 100, 0.5)',
			text: '#c084fc'
		},
		legendary: {
			border: 'rgba(245, 158, 11, 0.6)',
			glow: 'rgba(245, 158, 11, 0.35)',
			bg: 'rgba(69, 26, 3, 0.5)',
			text: '#fbbf24'
		}
	};

	function getExistingPerk(perkId: string): RunPerk | undefined {
		return run?.perks?.find((p) => p.id === perkId);
	}
</script>

<div class="modal-backdrop">
	<div class="modal-card perk-draft-card glass-panel">
		<!-- Header -->
		<div class="draft-header">
			<div class="title-cluster">
				<span class="boss-trophy">👑</span>
				<div>
					<h2 class="draft-title">BOSS VANQUISHED</h2>
					<p class="draft-subtitle">Claim 1 of 3 randomized Spire Boons to empower your run</p>
				</div>
			</div>

			<div class="header-badges">
				{#if pending > 1}
					<div class="pending-badge font-mono animate-pulse">
						<span>🎁</span>
						<span>{pending} BOONS PENDING</span>
					</div>
				{/if}
				<button class="close-btn" onclick={() => game.closePerkDraftModal()} title="Close and choose later">
					✕
				</button>
			</div>
		</div>

		<!-- 3-Card Roguelike Draft Grid -->
		<div class="cards-grid">
			{#each choices as perk, index}
				{@const colors = rarityColors[perk.rarity] || rarityColors.common}
				{@const existing = getExistingPerk(perk.id)}

				<div
					class="perk-card"
					style="--rarity-border: {colors.border}; --rarity-glow: {colors.glow}; --rarity-bg: {colors.bg}; --rarity-text: {colors.text};"
				>
					<div class="card-shimmer"></div>

					<div class="card-top-tags">
						<span class="category-pill font-mono">{perk.category.toUpperCase()}</span>
						<span class="rarity-pill font-mono" style="color: {colors.text};">{perk.rarity.toUpperCase()}</span>
					</div>

					<div class="card-icon-wrapper">
						<div class="icon-orb">
							<span class="perk-icon">{perk.icon}</span>
						</div>
					</div>

					<div class="card-info">
						<h3 class="perk-name">{perk.name}</h3>

						{#if existing}
							<div class="rank-upgrade-tag font-mono">
								<span class="rank-from">Rank {existing.rank}</span>
								<span class="rank-arrow">➔</span>
								<span class="rank-to">Rank {existing.rank + 1}</span>
							</div>
						{:else}
							<div class="rank-new-tag font-mono">
								<span>✨ NEW BOON</span>
							</div>
						{/if}

						<p class="perk-desc">{perk.description}</p>
					</div>

					<button class="btn btn-select" onclick={() => game.selectPerk(perk)}>
						<span>CLAIM BOON</span>
					</button>
				</div>
			{/each}
		</div>

		<!-- Bottom Footer: Reroll Bar -->
		<div class="draft-footer">
			<div class="gold-balance font-mono">
				<span class="coin-icon">🪙</span>
				<span class="gold-val">{Math.floor(gold).toLocaleString()}</span>
				<span class="gold-label">Run Gold</span>
			</div>

			<div class="reroll-action">
				<button
					class="btn btn-reroll {canAffordReroll ? 'can-afford' : ''}"
					disabled={!canAffordReroll}
					onclick={() => game.rerollPerkChoices()}
				>
					<span class="reroll-icon">🎲</span>
					<span>REROLL CHOICES</span>
					<span class="font-mono reroll-cost">({rerollCost} 🪙)</span>
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(4, 7, 16, 0.85);
		backdrop-filter: blur(10px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
		animation: fadeIn 0.25s ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: scale(0.97); }
		to { opacity: 1; transform: scale(1); }
	}

	.perk-draft-card {
		width: 100%;
		max-width: 960px;
		background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 30, 0.98) 100%);
		border: 1px solid rgba(245, 158, 11, 0.35);
		box-shadow: 0 0 50px rgba(245, 158, 11, 0.15), 0 25px 50px -12px rgba(0, 0, 0, 0.7);
		border-radius: 20px;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
		position: relative;
	}

	.draft-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		padding-bottom: 1.25rem;
	}

	.title-cluster {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.boss-trophy {
		font-size: 2.2rem;
		filter: drop-shadow(0 0 12px rgba(245, 158, 11, 0.6));
	}

	.draft-title {
		font-family: var(--font-title);
		font-size: 1.6rem;
		letter-spacing: 0.1em;
		font-weight: 900;
		background: linear-gradient(135deg, #ffffff 0%, #fbbf24 60%, #f59e0b 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.draft-subtitle {
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin-top: 0.15rem;
	}

	.header-badges {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.pending-badge {
		background: rgba(245, 158, 11, 0.15);
		border: 1px solid rgba(245, 158, 11, 0.4);
		color: #fbbf24;
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.35rem 0.75rem;
		border-radius: 9999px;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.animate-pulse {
		animation: pulseGlow 2s infinite;
	}

	@keyframes pulseGlow {
		0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
		50% { box-shadow: 0 0 14px 2px rgba(245, 158, 11, 0.6); }
	}

	.close-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--border-subtle);
		color: var(--text-muted);
		width: 36px;
		height: 36px;
		border-radius: 8px;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.12);
		color: #ffffff;
	}

	/* Cards Grid */
	.cards-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.25rem;
	}

	@media (max-width: 820px) {
		.cards-grid {
			grid-template-columns: 1fr;
		}
	}

	.perk-card {
		background: var(--rarity-bg);
		border: 1px solid var(--rarity-border);
		box-shadow: 0 8px 30px var(--rarity-glow);
		border-radius: 16px;
		padding: 1.5rem 1.25rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 1.25rem;
		position: relative;
		overflow: hidden;
		transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
	}

	.perk-card:hover {
		transform: translateY(-6px);
		box-shadow: 0 16px 40px var(--rarity-glow);
		border-color: rgba(255, 255, 255, 0.5);
	}

	.card-shimmer {
		position: absolute;
		top: -50%;
		left: -50%;
		width: 200%;
		height: 200%;
		background: linear-gradient(
			45deg,
			transparent 40%,
			rgba(255, 255, 255, 0.03) 50%,
			transparent 60%
		);
		pointer-events: none;
		animation: shimmer 6s infinite linear;
	}

	@keyframes shimmer {
		0% { transform: translate(-30%, -30%); }
		100% { transform: translate(30%, 30%); }
	}

	.card-top-tags {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.category-pill {
		background: rgba(0, 0, 0, 0.4);
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
		color: var(--text-muted);
	}

	.rarity-pill {
		background: rgba(0, 0, 0, 0.4);
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
	}

	.icon-orb {
		width: 76px;
		height: 76px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, rgba(0, 0, 0, 0.5) 100%);
		border: 1px solid var(--rarity-border);
		box-shadow: 0 0 20px var(--rarity-glow);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2.4rem;
	}

	.card-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		min-height: 100px;
	}

	.perk-name {
		font-family: var(--font-title);
		font-size: 1.15rem;
		font-weight: 800;
		color: #ffffff;
	}

	.rank-upgrade-tag {
		font-size: 0.75rem;
		padding: 0.2rem 0.6rem;
		border-radius: 9999px;
		background: rgba(0, 210, 255, 0.15);
		border: 1px solid rgba(0, 210, 255, 0.35);
		color: #38bdf8;
		display: flex;
		gap: 0.35rem;
		align-items: center;
	}

	.rank-new-tag {
		font-size: 0.7rem;
		padding: 0.2rem 0.6rem;
		border-radius: 9999px;
		background: rgba(245, 158, 11, 0.15);
		border: 1px solid rgba(245, 158, 11, 0.35);
		color: #fbbf24;
		font-weight: 700;
	}

	.perk-desc {
		font-size: 0.85rem;
		color: #e2e8f0;
		line-height: 1.4;
		margin-top: 0.25rem;
	}

	.btn-select {
		width: 100%;
		padding: 0.75rem;
		background: linear-gradient(135deg, #00d2ff 0%, #0077ff 100%);
		border: none;
		color: #ffffff;
		font-family: var(--font-title);
		font-size: 0.9rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		border-radius: 10px;
		cursor: pointer;
		box-shadow: 0 4px 15px rgba(0, 210, 255, 0.35);
		transition: all 0.2s;
	}

	.btn-select:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(0, 210, 255, 0.55);
		filter: brightness(1.1);
	}

	/* Footer Bar */
	.draft-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		padding-top: 1.25rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.gold-balance {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(0, 0, 0, 0.35);
		padding: 0.4rem 0.85rem;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
	}

	.coin-icon {
		font-size: 1.1rem;
	}

	.gold-val {
		color: #fbbf24;
		font-weight: 800;
		font-size: 1rem;
	}

	.gold-label {
		color: var(--text-muted);
		font-size: 0.75rem;
	}

	.btn-reroll {
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid rgba(245, 158, 11, 0.3);
		color: var(--text-muted);
		padding: 0.6rem 1.2rem;
		border-radius: 10px;
		font-weight: 700;
		font-size: 0.85rem;
		cursor: not-allowed;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.2s;
	}

	.btn-reroll.can-afford {
		background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.3) 100%);
		border-color: rgba(245, 158, 11, 0.6);
		color: #fbbf24;
		cursor: pointer;
		box-shadow: 0 0 15px rgba(245, 158, 11, 0.25);
	}

	.btn-reroll.can-afford:hover {
		background: linear-gradient(135deg, rgba(245, 158, 11, 0.35) 0%, rgba(217, 119, 6, 0.45) 100%);
		transform: translateY(-2px);
		box-shadow: 0 4px 20px rgba(245, 158, 11, 0.45);
	}

	.reroll-icon {
		font-size: 1.1rem;
	}

	.reroll-cost {
		font-weight: 800;
	}
</style>
