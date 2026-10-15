<script lang="ts">
	import { game } from '#lib/stores/playerStore.svelte';
</script>

<div class="toast-container">
	{#each game.toasts as t (t.id)}
		<div class="toast-item toast-{t.type}">
			{#if t.type === 'loot'}
				<span class="toast-icon">🎁</span>
			{:else if t.type === 'ascend'}
				<span class="toast-icon">🌌</span>
			{:else if t.type === 'success'}
				<span class="toast-icon">✨</span>
			{:else if t.type === 'warning'}
				<span class="toast-icon">⚠️</span>
			{:else}
				<span class="toast-icon">ℹ️</span>
			{/if}
			<span class="toast-message">{t.message}</span>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		top: 1.25rem;
		right: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		z-index: 2000;
		pointer-events: none;
	}

	.toast-item {
		background: rgba(15, 23, 42, 0.95);
		border: 1px solid var(--border-medium);
		backdrop-filter: blur(8px);
		padding: 0.65rem 1rem;
		border-radius: 10px;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.85rem;
		font-weight: 600;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
		animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
		max-width: 360px;
		pointer-events: auto;
	}

	.toast-loot { border-color: #fbbf24; color: #fef3c7; }
	.toast-ascend { border-color: #c084fc; color: #f3e8ff; box-shadow: 0 0 16px rgba(192, 132, 252, 0.4); }
	.toast-success { border-color: #34d399; color: #ecfdf5; }
	.toast-warning { border-color: #f87171; color: #fef2f2; }
	.toast-info { border-color: #38bdf8; color: #f0f9ff; }

	@keyframes slideIn {
		from { opacity: 0; transform: translateX(40px); }
		to { opacity: 1; transform: translateX(0); }
	}
</style>
