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

	let { children }: LayoutProps = $props();
</script>

<div class="app-layout">
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
		display: flex;
		flex-direction: column;
		max-width: 1400px;
		margin: 0 auto;
		padding: 0.5rem 1rem;
		gap: 0.85rem;
		position: relative;
	}

	.app-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		width: 100%;
		padding-bottom: 0.5rem;
	}
</style>
