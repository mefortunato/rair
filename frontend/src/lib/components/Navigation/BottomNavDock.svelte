<script lang="ts">
	import { nav, type ActiveView } from '#lib/stores/navigationStore.svelte';
	import { game } from '#lib/stores/playerStore.svelte';
	import { minigameManager } from '#lib/stores/minigameStore.svelte';

	let currentView = $derived(nav.currentView);
	let pendingBoons = $derived(game.player?.active_run?.pending_perk_picks || 0);
	let minigameLive = $derived(minigameManager.isSessionRunning);

	const navItems: {
		id: ActiveView;
		label: string;
		shortLabel: string;
		subtitle: string;
		icon: string;
		badge?: number;
		badgeType?: 'alert' | 'pulse';
	}[] = $derived([
		{
			id: 'spire',
			label: 'Ascension Spire',
			shortLabel: 'Spire',
			subtitle: 'Idle Combat & Climb',
			icon: '🗼'
		},
		{
			id: 'equipment',
			label: 'Equipment & Forge',
			shortLabel: 'Forge',
			subtitle: 'Avatar Gear & Bag',
			icon: '🛡️'
		},
		{
			id: 'boons',
			label: 'Spire Boons',
			shortLabel: 'Boons',
			subtitle: 'Roguelike Perks',
			icon: '👑',
			badge: pendingBoons,
			badgeType: 'alert'
		},
		{
			id: 'minigames',
			label: 'Nexus Gambit',
			shortLabel: 'Gambit',
			subtitle: '10 Endless Trials',
			icon: '⚡',
			badge: minigameLive ? 1 : 0,
			badgeType: 'pulse'
		}
	]);
</script>

<nav class="bottom-nav-dock glass-panel">
	<div class="dock-container">
		{#each navItems as item (item.id)}
			<button
				class="nav-tab {currentView === item.id ? 'active' : ''}"
				onclick={() => nav.setView(item.id)}
			>
				<div class="tab-icon-wrapper">
					<span class="tab-icon">{item.icon}</span>
					{#if item.badge && item.badge > 0}
						{#if item.badgeType === 'alert'}
							<span class="nav-badge alert-badge font-mono">{item.badge}</span>
						{:else if item.badgeType === 'pulse'}
							<span class="nav-badge pulse-badge">●</span>
						{/if}
					{/if}
				</div>

				<div class="tab-labels">
					<span class="tab-title">
						<span class="title-full">{item.label}</span>
						<span class="title-short">{item.shortLabel}</span>
					</span>
					<span class="tab-subtitle">{item.subtitle}</span>
				</div>

				{#if currentView === item.id}
					<div class="active-indicator"></div>
				{/if}
			</button>
		{/each}
	</div>
</nav>

<style>
	.bottom-nav-dock {
		position: sticky;
		bottom: 0.5rem;
		width: 100%;
		z-index: 50;
		padding: 0.4rem;
		background: rgba(10, 15, 28, 0.88);
		backdrop-filter: blur(18px);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 14px;
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 210, 255, 0.1);
	}

	.dock-container {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}

	.nav-tab {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 0.65rem 0.5rem;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
		color: var(--text-secondary);
	}

	.nav-tab:hover {
		background: rgba(255, 255, 255, 0.05);
		color: #ffffff;
	}

	.nav-tab.active {
		background: rgba(0, 210, 255, 0.12);
		border-color: rgba(0, 210, 255, 0.35);
		color: #ffffff;
		box-shadow: inset 0 0 15px rgba(0, 210, 255, 0.15);
	}

	.tab-icon-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.tab-icon {
		font-size: 1.5rem;
		line-height: 1;
		transition: transform 0.2s ease;
	}

	.nav-tab:hover .tab-icon {
		transform: scale(1.15);
	}

	.nav-tab.active .tab-icon {
		transform: scale(1.15);
	}

	.tab-labels {
		display: flex;
		flex-direction: column;
		text-align: left;
		line-height: 1.2;
	}

	.tab-title {
		font-family: var(--font-title);
		font-size: 0.85rem;
		font-weight: 800;
		letter-spacing: 0.03em;
	}

	.title-short {
		display: none;
	}

	.tab-subtitle {
		font-size: 0.65rem;
		color: var(--text-muted);
		display: none;
	}

	@media (min-width: 768px) {
		.tab-subtitle {
			display: inline;
		}
	}

	@media (max-width: 768px) {
		.bottom-nav-dock {
			padding: 0.3rem;
			bottom: max(0.35rem, env(safe-area-inset-bottom));
			border-radius: 12px;
		}

		.dock-container {
			gap: 0.25rem;
		}

		.nav-tab {
			flex-direction: column;
			gap: 0.15rem;
			padding: 0.35rem 0.15rem;
			min-height: 50px;
		}

		.tab-icon {
			font-size: 1.35rem;
		}

		.tab-labels {
			align-items: center;
			text-align: center;
		}

		.title-full {
			display: none;
		}

		.title-short {
			display: inline;
			font-size: 0.72rem;
			font-weight: 800;
		}

		.active-indicator {
			top: auto;
			bottom: -1px;
			left: 15%;
			right: 15%;
			height: 2px;
		}
	}

	.active-indicator {
		position: absolute;
		top: -1px;
		left: 20%;
		right: 20%;
		height: 3px;
		background: linear-gradient(90deg, transparent, #00d2ff, transparent);
		box-shadow: 0 0 8px #00d2ff;
		border-radius: 999px;
	}

	.nav-badge {
		position: absolute;
		top: -6px;
		right: -8px;
		border-radius: 999px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 900;
	}

	.alert-badge {
		background: #ffd200;
		color: #000000;
		font-size: 0.65rem;
		width: 18px;
		height: 18px;
		box-shadow: 0 0 10px rgba(255, 210, 0, 0.6);
		animation: pulseGlow 0.8s infinite alternate;
	}

	.pulse-badge {
		color: #ef4444;
		font-size: 0.8rem;
		animation: pulseGlow 0.6s infinite alternate;
	}

	@keyframes pulseGlow {
		from {
			transform: scale(1);
			opacity: 0.8;
		}
		to {
			transform: scale(1.2);
			opacity: 1;
		}
	}
</style>
