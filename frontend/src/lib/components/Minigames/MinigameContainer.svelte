<script lang="ts">
	import { game } from '#lib/stores/playerStore.svelte';
	import OverdriveRing from './OverdriveRing.svelte';
	import RuneWeave from './RuneWeave.svelte';
	import AlchemicalGrid from './AlchemicalGrid.svelte';

	let activeTab = $state<'overdrive' | 'rune' | 'alchemy'>('overdrive');
</script>

<div class="glass-panel minigames-container">
	<div class="minigames-header">
		<div class="header-titles">
			<span class="category-tag">ACTIVE CATALYST</span>
			<h3 class="minigame-title">Progression Overdrive</h3>
		</div>

		<!-- Minigame Tab Selector -->
		<div class="tabs-bar">
			<button
				class="tab-btn {activeTab === 'overdrive' ? 'active' : ''}"
				onclick={() => { activeTab = 'overdrive'; }}
			>
				<span>⚡</span>
				<span>Overdrive Ring</span>
			</button>
			<button
				class="tab-btn {activeTab === 'rune' ? 'active' : ''}"
				onclick={() => { activeTab = 'rune'; }}
			>
				<span>🔮</span>
				<span>Rune Weave</span>
			</button>
			<button
				class="tab-btn {activeTab === 'alchemy' ? 'active' : ''}"
				onclick={() => { activeTab = 'alchemy'; }}
			>
				<span>🧪</span>
				<span>Alchemical Grid</span>
			</button>
		</div>
	</div>

	<div class="minigame-body">
		{#if activeTab === 'overdrive'}
			<OverdriveRing />
		{:else if activeTab === 'rune'}
			<RuneWeave />
		{:else}
			<AlchemicalGrid />
		{/if}
	</div>
</div>

<style>
	.minigames-container {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		background: radial-gradient(circle at 50% 10%, rgba(25, 30, 50, 0.5) 0%, rgba(10, 15, 26, 0.8) 100%);
	}

	.minigames-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.category-tag {
		font-size: 0.65rem;
		letter-spacing: 0.15em;
		color: var(--text-muted);
		font-weight: 700;
	}

	.minigame-title {
		font-family: var(--font-title);
		font-size: 1.25rem;
		color: #ffffff;
		font-weight: 700;
	}

	.tabs-bar {
		display: flex;
		gap: 0.4rem;
		background: rgba(0, 0, 0, 0.3);
		padding: 0.25rem;
		border-radius: 10px;
		border: 1px solid var(--border-subtle);
	}

	.tab-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		padding: 0.4rem 0.75rem;
		border-radius: 8px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		transition: all 0.2s;
	}

	.tab-btn:hover {
		color: #ffffff;
		background: rgba(255, 255, 255, 0.05);
	}

	.tab-btn.active {
		background: rgba(0, 210, 255, 0.15);
		color: #00d2ff;
		border: 1px solid rgba(0, 210, 255, 0.3);
		box-shadow: 0 0 10px rgba(0, 210, 255, 0.2);
	}

	.minigame-body {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 320px;
	}
</style>
