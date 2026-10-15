<script lang="ts">
	import { onMount } from 'svelte';
	import { game } from '#lib/stores/playerStore.svelte';
	import SpireCombat from '#lib/components/SpireCombat.svelte';
	import HeroPanel from '#lib/components/HeroPanel.svelte';
	import ActiveUpgrades from '#lib/components/ActiveUpgrades.svelte';
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
	<div class="dashboard-grid">
		<!-- Top Row: Combat & Character -->
		<div class="combat-column">
			<SpireCombat />
		</div>

		<div class="hero-column">
			<HeroPanel />
		</div>

		<!-- Bottom Row: Run Upgrades & Active Minigames -->
		<div class="upgrades-column">
			<ActiveUpgrades />
		</div>

		<div class="minigames-column">
			<MinigameContainer />
		</div>
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
		to { transform: rotate(360deg); }
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

	.dashboard-grid {
		display: grid;
		grid-template-columns: 1.15fr 0.85fr;
		gap: 1.25rem;
	}

	@media (max-width: 980px) {
		.dashboard-grid {
			grid-template-columns: 1fr;
		}
	}

	.combat-column, .hero-column, .upgrades-column, .minigames-column {
		min-width: 0;
	}
</style>
