<script lang="ts">
	import { onMount } from 'svelte';
	import { game } from '#lib/stores/playerStore.svelte';
	import { nav } from '#lib/stores/navigationStore.svelte';

	import SpireView from '#lib/components/Spire/SpireView.svelte';
	import EquipmentView from '#lib/components/Equipment/EquipmentView.svelte';
	import BoonsView from '#lib/components/Boons/BoonsView.svelte';
	import MinigameContainer from '#lib/components/Minigames/MinigameContainer.svelte';

	onMount(() => {
		game.init();
	});
</script>

{#if !game.isLoaded}
	<div class="loading-screen">
		<div class="loading-spinner"></div>
		<h2 class="loading-title">ASCENDING THE SPIRE...</h2>
		<p class="loading-subtitle">Syncing cosmic state with MongoDB</p>
	</div>
{:else}
	<div class="viewport-fullscreen">
		{#if nav.currentView === 'spire'}
			<SpireView />
		{:else if nav.currentView === 'equipment'}
			<EquipmentView />
		{:else if nav.currentView === 'boons'}
			<BoonsView />
		{:else if nav.currentView === 'minigames'}
			<MinigameContainer />
		{/if}
	</div>
{/if}

<style>
	.loading-screen {
		min-height: 70vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
		text-align: center;
	}

	.loading-spinner {
		width: 56px;
		height: 56px;
		border: 3px solid rgba(0, 210, 255, 0.15);
		border-top-color: #00d2ff;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading-title {
		font-family: var(--font-title);
		font-size: 1.4rem;
		letter-spacing: 0.15em;
		color: #ffffff;
		text-shadow: 0 0 12px rgba(0, 210, 255, 0.4);
	}

	.loading-subtitle {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.viewport-fullscreen {
		width: 100%;
		flex: 1;
		display: flex;
		flex-direction: column;
		animation: fadeInView 0.2s ease-out;
	}

	@keyframes fadeInView {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>

