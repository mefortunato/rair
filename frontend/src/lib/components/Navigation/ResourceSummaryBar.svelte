<script lang="ts">
	import { game } from '#lib/stores/playerStore.svelte';
	import { nav } from '#lib/stores/navigationStore.svelte';
	import { sfx } from '#lib/audio/sfx';

	let player = $derived(game.player);
	let run = $derived(player?.active_run);
	let gold = $derived(run?.gold || 0);
	let perks = $derived(run?.perks || []);
	let pending = $derived(run?.pending_perk_picks || 0);
	let sparks = $derived(player?.ascension_tree?.sparks || 0);
	let aether = $derived(player?.stats?.aether_essences || 0);
	let floor = $derived(run?.current_floor || 1);
	let isBoss = $derived(run?.is_boss_floor || false);
	let highestFloor = $derived(player?.highest_floor || 1);
	let activeBuffs = $derived(run?.active_buffs || []);

	let soundEnabled = $state(true);

	function toggleAudio() {
		soundEnabled = sfx.toggleSound();
	}
</script>

<header class="resource-summary-bar glass-panel">
	<!-- Left: Brand & Floor Status -->
	<div class="summary-left">
		<button class="brand-btn" onclick={() => nav.setView('spire')}>
			<h1 class="logo-text">RAIR</h1>
			<span class="logo-sub">Rogue Ascension</span>
		</button>

		<div class="floor-badge-container">
			<div class="floor-badge {isBoss ? 'boss-floor' : ''}">
				<span class="floor-icon">{isBoss ? '👑' : '⚔️'}</span>
				<span class="floor-text font-mono">
					{isBoss ? 'BOSS FLOOR' : 'FLOOR'} {floor}
				</span>
			</div>
			<span class="record-badge font-mono" title="Highest Floor Conquered">
				🏆 {highestFloor}
			</span>
		</div>
	</div>

	<!-- Center: Currencies & Resources -->
	<div class="summary-center">
		<!-- Active Run Gold -->
		<div class="resource-item gold-item" title="Active Run Gold (Used for Upgrades & Boon Forging)">
			<span class="res-icon">🪙</span>
			<span class="res-val font-mono">{Math.floor(gold).toLocaleString()}</span>
			<span class="res-label">GOLD</span>
		</div>

		<!-- Spire Boons & Pending Pick Alert -->
		{#if pending > 0}
			<button
				class="resource-item boons-item pending-boons-btn"
				title="Boss Defeated! Click to draft your Spire Boon"
				onclick={() => game.openPerkDraftModal()}
			>
				<span class="res-icon">👑</span>
				<span class="res-val font-mono">{pending} PICK{pending > 1 ? 'S' : ''}!</span>
				<span class="pulse-tag">DRAFT NOW</span>
			</button>
		{:else}
			<button
				class="resource-item boons-item"
				title="Active Spire Boons (Click to view Boons)"
				onclick={() => nav.setView('boons')}
			>
				<span class="res-icon">👑</span>
				<span class="res-val font-mono">{perks.length}</span>
				<span class="res-label">BOONS</span>
			</button>
		{/if}

		<!-- Ascension Sparks (Permanent Prestige) -->
		<button
			class="resource-item sparks-item"
			title="Ascension Sparks (Permanent Prestige Currency - Click to open Constellation Tree)"
			onclick={() => (game.activeModal = 'ascension')}
		>
			<span class="res-icon">✨</span>
			<span class="res-val font-mono">{sparks}</span>
			<span class="res-label">SPARKS</span>
		</button>

		<!-- Aether Essences (Salvage & Crafting) -->
		<button
			class="resource-item aether-item"
			title="Aether Essences (From Salvaging Gear - Click to view Equipment)"
			onclick={() => nav.setView('equipment')}
		>
			<span class="res-icon">💠</span>
			<span class="res-val font-mono">{aether}</span>
			<span class="res-label">AETHER</span>
		</button>
	</div>

	<!-- Right: Active Buffs & Utilities -->
	<div class="summary-right">
		<!-- Active Buffs / Debuffs Pill -->
		{#if activeBuffs.length > 0}
			{@const hasDebuff = activeBuffs.some((b) => b.is_debuff || b.multiplier < 1.0)}
			<div
				class="buffs-summary-pill {hasDebuff ? 'has-debuff' : 'all-buffs'}"
				title="{activeBuffs.map((b) => `${b.name} (${b.multiplier}x, ${Math.ceil(b.time_remaining)}s)`).join(' | ')}"
			>
				<span>{hasDebuff ? '⚠️' : '⚡'}</span>
				<span class="font-mono">{activeBuffs.length} Effect{activeBuffs.length > 1 ? 's' : ''}</span>
			</div>
		{/if}

		<!-- Ascension Ready Button (Floor >= 15) -->
		{#if floor >= 15}
			<button
				class="btn btn-primary ascend-quick-btn"
				onclick={() => (game.activeModal = 'ascension')}
				title="Reach Spire Transcendence"
			>
				<span>⭐ ASCEND</span>
			</button>
		{/if}

		<!-- Audio Toggle -->
		<button
			class="audio-toggle-btn {soundEnabled ? 'sound-on' : 'sound-off'}"
			onclick={toggleAudio}
			title="Toggle Sound Effects"
		>
			<span>{soundEnabled ? '🔊' : '🔇'}</span>
		</button>
	</div>
</header>

<style>
	.resource-summary-bar {
		padding: 0.65rem 1.25rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
		background: rgba(10, 15, 28, 0.85);
		backdrop-filter: blur(16px);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		position: sticky;
		top: 0.5rem;
		z-index: 50;
	}

	.summary-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.brand-btn {
		background: transparent;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		padding: 0;
	}

	.logo-text {
		font-family: var(--font-title);
		font-size: 1.6rem;
		font-weight: 900;
		color: #ffffff;
		letter-spacing: 0.1em;
		background: linear-gradient(135deg, #ffffff 0%, #00d2ff 60%, #b05cff 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		filter: drop-shadow(0 0 10px rgba(0, 210, 255, 0.4));
		margin: 0;
		line-height: 1;
	}

	.logo-sub {
		font-size: 0.7rem;
		color: var(--text-muted);
		letter-spacing: 0.05em;
		display: none;
	}

	@media (min-width: 768px) {
		.logo-sub {
			display: inline;
		}
	}

	.floor-badge-container {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.floor-badge {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: rgba(0, 210, 255, 0.12);
		border: 1px solid rgba(0, 210, 255, 0.3);
		padding: 0.3rem 0.65rem;
		border-radius: 8px;
		color: #00d2ff;
		font-size: 0.8rem;
		font-weight: 800;
	}

	.floor-badge.boss-floor {
		background: rgba(239, 68, 68, 0.2);
		border-color: #ef4444;
		color: #ef4444;
		animation: pulseGlow 0.8s infinite alternate;
	}

	.record-badge {
		font-size: 0.75rem;
		color: var(--text-muted);
		background: rgba(0, 0, 0, 0.4);
		padding: 0.3rem 0.5rem;
		border-radius: 6px;
		border: 1px solid var(--border-subtle);
	}

	.summary-center {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.resource-item {
		background: rgba(15, 23, 42, 0.7);
		border: 1px solid var(--border-subtle);
		padding: 0.3rem 0.65rem;
		border-radius: 8px;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		cursor: pointer;
		transition: all 0.15s ease;
		color: inherit;
	}

	.resource-item:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.res-icon {
		font-size: 1rem;
		line-height: 1;
	}

	.res-val {
		font-size: 0.85rem;
		font-weight: 800;
		color: #ffffff;
	}

	.res-label {
		font-size: 0.65rem;
		color: var(--text-muted);
		font-weight: 800;
		letter-spacing: 0.05em;
	}

	.gold-item .res-val {
		color: #ffd200;
	}

	.pending-boons-btn {
		background: rgba(255, 210, 0, 0.2);
		border-color: #ffd200;
		box-shadow: 0 0 15px rgba(255, 210, 0, 0.3);
		animation: pulseGlow 0.7s infinite alternate;
	}

	.pulse-tag {
		font-size: 0.6rem;
		font-weight: 900;
		background: #ffd200;
		color: #000000;
		padding: 0.1rem 0.4rem;
		border-radius: 999px;
	}

	.sparks-item:hover {
		border-color: #38bdf8;
		box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
	}

	.sparks-item .res-val {
		color: #38bdf8;
	}

	.aether-item .res-val {
		color: #a855f7;
	}

	.summary-right {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.buffs-summary-pill {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.75rem;
		font-weight: 800;
		padding: 0.3rem 0.65rem;
		border-radius: 999px;
		cursor: help;
	}

	.buffs-summary-pill.all-buffs {
		background: rgba(16, 185, 129, 0.15);
		border: 1px solid rgba(16, 185, 129, 0.4);
		color: #34d399;
	}

	.buffs-summary-pill.has-debuff {
		background: rgba(239, 68, 68, 0.15);
		border: 1px solid rgba(239, 68, 68, 0.4);
		color: #f87171;
	}

	.ascend-quick-btn {
		padding: 0.35rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 800;
		background: linear-gradient(135deg, #ffd200 0%, #f59e0b 100%);
		color: #000000;
		border-color: #ffd200;
		box-shadow: 0 0 15px rgba(255, 210, 0, 0.4);
	}

	.audio-toggle-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		padding: 0.35rem 0.65rem;
		border-radius: 8px;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.audio-toggle-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #ffffff;
	}

	.audio-toggle-btn.sound-on {
		border-color: rgba(0, 210, 255, 0.4);
		color: #00d2ff;
	}

	@keyframes pulseGlow {
		from {
			transform: scale(1);
			box-shadow: 0 0 10px rgba(255, 210, 0, 0.3);
		}
		to {
			transform: scale(1.03);
			box-shadow: 0 0 20px rgba(255, 210, 0, 0.6);
		}
	}
</style>
