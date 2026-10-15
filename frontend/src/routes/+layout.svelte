<script lang="ts">
	import '../app.css';
	import type { LayoutProps } from './$types';
	import { game } from '#lib/stores/playerStore.svelte';
	import { sfx } from '#lib/audio/sfx';
	import Toast from '#lib/components/Toast.svelte';
	import AscensionModal from '#lib/components/AscensionModal.svelte';
	import InventoryModal from '#lib/components/InventoryModal.svelte';
	import LeaderboardModal from '#lib/components/LeaderboardModal.svelte';
	import OfflineModal from '#lib/components/OfflineModal.svelte';

	let { children }: LayoutProps = $props();

	let soundEnabled = $state(true);

	function toggleAudio() {
		soundEnabled = sfx.toggleSound();
	}
</script>

<div class="app-layout">
	<!-- Navbar Header -->
	<header class="app-header glass-panel">
		<div class="brand">
			<h1 class="logo-text">RAIR</h1>
			<span class="logo-sub">Rogue Ascension: Idle Role-playing</span>
		</div>

		<div class="nav-status">
			<div class="highest-badge font-mono">
				<span>👑 Record:</span>
				<strong class="highlight-cyan">Floor {game.player?.highest_floor || 1}</strong>
			</div>

			<button
				class="audio-toggle-btn {soundEnabled ? 'sound-on' : 'sound-off'}"
				onclick={toggleAudio}
				title="Toggle Sound Effects"
			>
				<span>{soundEnabled ? '🔊 SFX ON' : '🔇 SFX MUTED'}</span>
			</button>
		</div>
	</header>

	<!-- Main View Content -->
	<main class="app-main">
		{@render children()}
	</main>

	<!-- Toasts -->
	<Toast />

	<!-- Modals -->
	{#if game.activeModal === 'ascension'}
		<AscensionModal />
	{:else if game.activeModal === 'inventory'}
		<InventoryModal />
	{:else if game.activeModal === 'leaderboard'}
		<LeaderboardModal />
	{:else if game.activeModal === 'offline'}
		<OfflineModal />
	{/if}
</div>

<style>
	.app-layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		max-width: 1360px;
		margin: 0 auto;
		padding: 1rem;
		gap: 1.25rem;
	}

	.app-header {
		padding: 0.85rem 1.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.brand {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
	}

	.logo-text {
		font-family: var(--font-title);
		font-size: 1.8rem;
		font-weight: 900;
		color: #ffffff;
		letter-spacing: 0.1em;
		background: linear-gradient(135deg, #ffffff 0%, #00d2ff 60%, #b05cff 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		filter: drop-shadow(0 0 10px rgba(0, 210, 255, 0.4));
	}

	.logo-sub {
		font-size: 0.75rem;
		color: var(--text-muted);
		letter-spacing: 0.05em;
		display: none;
	}

	@media (min-width: 640px) {
		.logo-sub {
			display: inline;
		}
	}

	.nav-status {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}

	.highest-badge {
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid var(--border-subtle);
		padding: 0.35rem 0.75rem;
		border-radius: 8px;
		font-size: 0.8rem;
		color: var(--text-secondary);
		display: flex;
		gap: 0.4rem;
	}

	.highlight-cyan {
		color: #00d2ff;
	}

	.audio-toggle-btn {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--border-medium);
		color: var(--text-secondary);
		padding: 0.35rem 0.75rem;
		border-radius: 8px;
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
	}

	.audio-toggle-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		color: #ffffff;
	}

	.audio-toggle-btn.sound-on {
		border-color: rgba(0, 210, 255, 0.4);
		color: #00d2ff;
	}

	.app-main {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
</style>
