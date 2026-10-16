<script lang="ts">
	import '../app.css';
	import type { LayoutProps } from './$types';
	import { game } from '#lib/stores/playerStore.svelte';
	import ResourceSummaryBar from '#lib/components/Navigation/ResourceSummaryBar.svelte';
	import BottomNavDock from '#lib/components/Navigation/BottomNavDock.svelte';
	import Toast from '#lib/components/Toast.svelte';
	import AscensionModal from '#lib/components/AscensionModal.svelte';
	import InventoryModal from '#lib/components/InventoryModal.svelte';
	import LeaderboardModal from '#lib/components/LeaderboardModal.svelte';
	import OfflineModal from '#lib/components/OfflineModal.svelte';
	import PerkDraftModal from '#lib/components/PerkDraftModal.svelte';
	import GameOptionsModal from '#lib/components/GameOptionsModal.svelte';
	import AuthModal from '#lib/components/AuthModal.svelte';
	import { onMount } from 'svelte';
	import { pwa } from '#lib/stores/pwaStore.svelte';

	let { children }: LayoutProps = $props();

	onMount(() => {
		pwa.init();
	});
</script>

<div class="app-layout">
	<!-- PWA Update Notification Banner -->
	{#if pwa.updateAvailable}
		<div class="pwa-update-banner glass-panel">
			<div class="update-info">
				<span class="update-icon">✨</span>
				<span>A new version of RAIR is ready to launch!</span>
			</div>
			<button class="btn btn-primary btn-sm" onclick={() => pwa.applyUpdate()}>
				Update Now
			</button>
		</div>
	{/if}

	<!-- PWA Offline Pill Indicator -->
	{#if !pwa.isOnline}
		<div class="offline-status-banner">
			<span class="offline-dot"></span>
			<span class="font-mono">Offline Mode Active - Progress Stored Locally</span>
		</div>
	{/if}

	<!-- Persistent Top Resource Summary Bar -->
	<ResourceSummaryBar />

	<!-- Main Viewport Content (Full-Screen Viewports) -->
	<main class="app-main">
		{@render children()}
	</main>

	<!-- Fixed Bottom Navigation Dock -->
	<BottomNavDock />

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
	{:else if game.activeModal === 'perk_draft'}
		<PerkDraftModal />
	{:else if game.activeModal === 'game_options'}
		<GameOptionsModal />
	{:else if game.activeModal === 'auth'}
		<AuthModal />
	{/if}
</div>

<style>
	.app-layout {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		max-width: 1400px;
		margin: 0 auto;
		padding-top: max(0.5rem, env(safe-area-inset-top));
		padding-bottom: max(0.85rem, env(safe-area-inset-bottom));
		padding-left: max(1rem, env(safe-area-inset-left));
		padding-right: max(1rem, env(safe-area-inset-right));
		gap: 0.85rem;
		position: relative;
	}

	@media (max-width: 640px) {
		.app-layout {
			padding-left: max(0.5rem, env(safe-area-inset-left));
			padding-right: max(0.5rem, env(safe-area-inset-right));
			gap: 0.6rem;
		}
	}

	.pwa-update-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.65rem 1rem;
		background: rgba(16, 24, 48, 0.95);
		border: 1px solid #00d2ff;
		box-shadow: 0 4px 20px rgba(0, 210, 255, 0.3);
		border-radius: 10px;
		gap: 1rem;
		z-index: 100;
		animation: slideDown 0.3s ease-out;
	}

	.offline-status-banner {
		display: inline-flex;
		align-self: center;
		align-items: center;
		gap: 0.5rem;
		background: rgba(245, 158, 11, 0.15);
		border: 1px solid rgba(245, 158, 11, 0.4);
		color: #fbbf24;
		font-size: 0.75rem;
		padding: 0.3rem 0.75rem;
		border-radius: 9999px;
		z-index: 90;
	}

	.offline-dot {
		width: 8px;
		height: 8px;
		background: #f59e0b;
		border-radius: 50%;
		box-shadow: 0 0 8px #f59e0b;
		animation: pulseDot 1.5s infinite;
	}

	@keyframes pulseDot {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.5; transform: scale(0.8); }
	}

	@keyframes slideDown {
		from { opacity: 0; transform: translateY(-10px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.update-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: #f8fafc;
	}

	.app-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		width: 100%;
		padding-bottom: 0.5rem;
	}
</style>
