<script lang="ts">
	import { game } from '#lib/stores/playerStore.svelte';
	import type { GearItem, GearSlot } from '#lib/types/game';

	let player = $derived(game.player);
	let inventory = $derived(player?.inventory || []);
	let equipped = $derived(player?.equipped_gear);
	let aether = $derived(player?.stats.aether_essences || 0);

	let selectedItem = $state<GearItem | null>(null);

	// Select first item by default if available
	$effect(() => {
		if (!selectedItem && inventory.length > 0) {
			selectedItem = inventory[0];
		}
	});

	let currentlyEquippedInSlot = $derived(
		selectedItem && equipped ? equipped[selectedItem.slot] : null
	);
</script>

<div
	class="modal-overlay"
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	onkeydown={(e) => { if (e.key === 'Escape') game.activeModal = null; }}
	onclick={(e) => { if (e.target === e.currentTarget) game.activeModal = null; }}
>
	<div class="modal-content inventory-modal">
		<div class="modal-header">
			<div class="header-left">
				<span class="category-tag">EQUIPMENT BAG</span>
				<h2 class="modal-title">Inventory & Aether Forge</h2>
			</div>

			<div class="header-right">
				<div class="aether-badge font-mono" title="Aether Essences (Used for Ascension perks & Crafting)">
					<span>💠</span>
					<span>{aether} Aether</span>
				</div>
				<button class="btn btn-sm close-btn" onclick={() => { game.activeModal = null; }}>✕</button>
			</div>
		</div>

		<div class="inventory-body">
			<!-- Bag Grid -->
			<div class="bag-section">
				<span class="section-title">BAG CAPACITY ({inventory.length} ITEMS)</span>
				{#if inventory.length === 0}
					<div class="empty-bag">
						<span>🎒 Your bag is empty. Defeat Spire Guardians and Bosses to discover rare gear!</span>
					</div>
				{:else}
					<div class="bag-grid">
						{#each inventory as item (item.id)}
							<button
								class="bag-cell rarity-{item.rarity} {selectedItem?.id === item.id ? 'active' : ''}"
								onclick={() => { selectedItem = item; }}
							>
								<div class="badge-elem badge-{item.element} cell-elem">
									{item.element.substring(0, 1).toUpperCase()}
								</div>
								<span class="cell-level font-mono">Lv.{item.level}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Item Detail Card -->
			<div class="detail-section">
				{#if selectedItem}
					<div class="item-detail-card rarity-{selectedItem.rarity}">
						<div class="item-detail-header">
							<div>
								<h3 class="detail-name rarity-{selectedItem.rarity}">{selectedItem.name}</h3>
								<span class="detail-meta">
									Level {selectedItem.level} • {selectedItem.rarity.toUpperCase()} {selectedItem.slot.toUpperCase()}
								</span>
							</div>
							<span class="badge-elem badge-{selectedItem.element}">
								{selectedItem.element.toUpperCase()}
							</span>
						</div>

						<div class="stats-preview font-mono">
							{#if selectedItem.base_atk > 0}
								<div class="stat-line">
									<span>Base Attack Power:</span>
									<strong class="highlight-stat">+{selectedItem.base_atk}</strong>
									{#if currentlyEquippedInSlot}
										{@const diff = selectedItem.base_atk - currentlyEquippedInSlot.base_atk}
										<span class="diff-tag {diff >= 0 ? 'pos' : 'neg'}">
											({diff >= 0 ? `+${diff}` : diff})
										</span>
									{/if}
								</div>
							{/if}

							{#if selectedItem.base_def > 0}
								<div class="stat-line">
									<span>Base Armor Defense:</span>
									<strong class="highlight-stat">+{selectedItem.base_def}</strong>
								</div>
							{/if}
						</div>

						<!-- Affixes List -->
						{#if selectedItem.affixes.length > 0}
							<div class="affixes-list">
								<span class="affix-title">Rogue Affixes</span>
								{#each selectedItem.affixes as aff}
									<div class="affix-line font-mono">
										<span>✦ {aff.description}</span>
									</div>
								{/each}
							</div>
						{/if}

						<div class="detail-actions">
							<button
								class="btn btn-primary"
								onclick={() => {
									if (selectedItem) {
										game.equipItem(selectedItem);
										selectedItem = null;
									}
								}}
							>
								<span>⚔️ Equip Item</span>
							</button>

							<button
								class="btn"
								onclick={() => {
									if (selectedItem) {
										const id = selectedItem.id;
										selectedItem = null;
										game.salvageItem(id);
									}
								}}
							>
								<span>💠 Salvage (+{selectedItem.salvage_value} Aether)</span>
							</button>
						</div>
					</div>
				{:else}
					<div class="no-selection">
						<span>Select an item in your bag to view affixes, stats, and actions.</span>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.inventory-modal {
		padding: 1.75rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		max-width: 780px;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.modal-title {
		font-family: var(--font-title);
		font-size: 1.4rem;
		color: #ffffff;
		font-weight: 700;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.aether-badge {
		background: rgba(236, 72, 153, 0.15);
		border: 1px solid rgba(236, 72, 153, 0.4);
		color: #f472b6;
		padding: 0.35rem 0.75rem;
		border-radius: 8px;
		font-weight: 700;
		font-size: 0.85rem;
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.inventory-body {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
	}

	@media (max-width: 640px) {
		.inventory-body {
			grid-template-columns: 1fr;
		}
	}

	.bag-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.6rem;
		max-height: 380px;
		overflow-y: auto;
		padding-right: 0.3rem;
	}

	.bag-cell {
		aspect-ratio: 1;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		padding: 0.4rem;
		cursor: pointer;
		position: relative;
		transition: all 0.2s;
	}

	.bag-cell:hover {
		transform: scale(1.05);
		border-color: var(--border-bright);
	}

	.bag-cell.active {
		border-color: #00d2ff;
		box-shadow: 0 0 12px rgba(0, 210, 255, 0.4);
	}

	.cell-elem {
		padding: 0.1rem 0.35rem;
		font-size: 0.65rem;
	}

	.cell-level {
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.empty-bag {
		padding: 2rem;
		text-align: center;
		color: var(--text-muted);
		font-size: 0.85rem;
		border: 1px dashed var(--border-subtle);
		border-radius: 12px;
	}

	.item-detail-card {
		background: rgba(0, 0, 0, 0.35);
		border: 1px solid var(--border-subtle);
		border-radius: 14px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.detail-name {
		font-family: var(--font-title);
		font-size: 1.15rem;
		font-weight: 700;
	}

	.detail-meta {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.stats-preview {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		background: rgba(255, 255, 255, 0.02);
		padding: 0.75rem;
		border-radius: 8px;
	}

	.stat-line {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
	}

	.highlight-stat {
		color: #38bdf8;
	}

	.diff-tag.pos { color: #34d399; font-size: 0.75rem; }
	.diff-tag.neg { color: #f87171; font-size: 0.75rem; }

	.affixes-list {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.affix-title {
		font-size: 0.75rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.affix-line {
		font-size: 0.8rem;
		color: #c084fc;
	}

	.detail-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.no-selection {
		padding: 3rem 1.5rem;
		text-align: center;
		color: var(--text-muted);
		font-size: 0.85rem;
		border: 1px dashed var(--border-subtle);
		border-radius: 14px;
	}
</style>
