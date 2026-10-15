<script lang="ts">
	import { game } from '#lib/stores/playerStore.svelte';
	import type { GearItem, GearSlot } from '#lib/types/game';
	import AvatarOverlay from './AvatarOverlay.svelte';

	let player = $derived(game.player);
	let stats = $derived(game.getEffectiveStats());
	let inventory = $derived(player?.inventory || []);
	let equipped = $derived(player?.equipped_gear);
	let aether = $derived(player?.stats?.aether_essences || 0);

	let selectedSlot = $state<GearSlot | null>('weapon');
	let selectedBagItem = $state<GearItem | null>(null);
	let activeFilter = $state<GearSlot | 'all'>('all');

	// If slot selected on avatar, look up equipped item or default to first matching bag item
	let equippedItemInSlot = $derived(
		selectedSlot && equipped ? equipped[selectedSlot] : null
	);

	// Display item: either the selected bag item or the equipped item in the selected slot
	let displayedItem = $derived(
		selectedBagItem || equippedItemInSlot || null
	);

	let filteredInventory = $derived(
		activeFilter === 'all'
			? inventory
			: inventory.filter((item: GearItem) => item.slot === activeFilter)
	);

	function selectSlotFromAvatar(slot: GearSlot) {
		selectedSlot = slot;
		selectedBagItem = null; // show equipped item in slot if available
	}

	function selectItemFromBag(item: GearItem) {
		selectedBagItem = item;
		selectedSlot = item.slot;
	}

	function equipCurrentItem() {
		if (selectedBagItem) {
			game.equipItem(selectedBagItem);
			selectedBagItem = null;
		}
	}

	function unequipCurrentSlot() {
		if (selectedSlot) {
			game.unequipItem(selectedSlot);
			selectedBagItem = null;
		}
	}

	function salvageCurrentItem() {
		if (selectedBagItem) {
			game.salvageItem(selectedBagItem.id);
			selectedBagItem = null;
		}
	}
</script>

<div class="equipment-view-container">
	<!-- Left: Bag Inventory -->
	<div class="glass-panel inventory-panel">
		<div class="panel-header">
			<div class="header-titles">
				<span class="category-tag">EQUIPMENT BAG</span>
				<h4 class="panel-title">Inventory ({inventory.length} items)</h4>
			</div>
			<div class="aether-badge font-mono" title="Aether Essences from salvaging">
				<span>💠 {aether}</span>
			</div>
		</div>

		<!-- Slot Filter Pills -->
		<div class="filter-pills">
			<button
				class="pill-btn {activeFilter === 'all' ? 'active' : ''}"
				onclick={() => (activeFilter = 'all')}
			>
				All
			</button>
			<button
				class="pill-btn {activeFilter === 'weapon' ? 'active' : ''}"
				onclick={() => (activeFilter = 'weapon')}
			>
				⚔️
			</button>
			<button
				class="pill-btn {activeFilter === 'armor' ? 'active' : ''}"
				onclick={() => (activeFilter = 'armor')}
			>
				🛡️
			</button>
			<button
				class="pill-btn {activeFilter === 'amulet' ? 'active' : ''}"
				onclick={() => (activeFilter = 'amulet')}
			>
				📿
			</button>
			<button
				class="pill-btn {activeFilter === 'ring' ? 'active' : ''}"
				onclick={() => (activeFilter = 'ring')}
			>
				💍
			</button>
			<button
				class="pill-btn {activeFilter === 'catalyst' ? 'active' : ''}"
				onclick={() => (activeFilter = 'catalyst')}
			>
				🔮
			</button>
		</div>

		<!-- Bag Grid -->
		<div class="bag-grid-scroll">
			{#if filteredInventory.length === 0}
				<div class="empty-bag">
					<span>🎒 No {activeFilter !== 'all' ? activeFilter : ''} items in bag. Defeat guardians to find loot!</span>
				</div>
			{:else}
				<div class="bag-grid">
					{#each filteredInventory as item (item.id)}
						<button
							class="bag-cell rarity-{item.rarity} {selectedBagItem?.id === item.id ? 'active' : ''}"
							onclick={() => selectItemFromBag(item)}
						>
							<div class="badge-elem badge-{item.element} cell-elem">
								{item.element.substring(0, 1).toUpperCase()}
							</div>
							<span class="cell-icon">
								{item.slot === 'weapon' ? '⚔️' : item.slot === 'armor' ? '🛡️' : item.slot === 'amulet' ? '📿' : item.slot === 'ring' ? '💍' : '🔮'}
							</span>
							<span class="cell-level font-mono">Lv.{item.level}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Center: Avatar Overlay -->
	<div class="avatar-center-column">
		<AvatarOverlay
			bind:selectedSlot
			onSelectSlot={selectSlotFromAvatar}
		/>
	</div>

	<!-- Right: Item Detail, Comparison & Combat Statistics -->
	<div class="right-details-column">
		<!-- Selected Item Detail Card -->
		<div class="glass-panel detail-panel">
			{#if displayedItem}
				{@const isEquipped = displayedItem.is_equipped || (equippedItemInSlot?.id === displayedItem.id && !selectedBagItem)}
				{@const comparisonItem = isEquipped ? null : equippedItemInSlot}
				<div class="item-card rarity-{displayedItem.rarity}">
					<div class="item-card-header">
						<div>
							<span class="item-slot-type font-mono">
								{displayedItem.slot.toUpperCase()} • {displayedItem.rarity.toUpperCase()}
							</span>
							<h4 class="item-name rarity-{displayedItem.rarity}">{displayedItem.name}</h4>
						</div>
						<div class="item-header-badges">
							<span class="badge-elem badge-{displayedItem.element}">
								{displayedItem.element.toUpperCase()}
							</span>
							{#if isEquipped}
								<span class="equipped-tag">EQUIPPED</span>
							{/if}
						</div>
					</div>

					<!-- Primary Stat: Base Attack -->
					<div class="stat-line-primary font-mono">
						<span>Base Attack Power:</span>
						<strong class="highlight-cyan">+{displayedItem.base_atk}</strong>
						{#if comparisonItem}
							{@const diff = displayedItem.base_atk - comparisonItem.base_atk}
							<span class="diff-tag {diff >= 0 ? 'pos' : 'neg'}">
								({diff >= 0 ? `+${diff}` : diff})
							</span>
						{/if}
					</div>

					<!-- Affixes -->
					{#if displayedItem.affixes && displayedItem.affixes.length > 0}
						<div class="affixes-list">
							<span class="affixes-title">MAGICAL AFFIXES:</span>
							{#each displayedItem.affixes as aff}
								<div class="affix-row font-mono">
									<span>• {aff.stat.replace('_', ' ')}</span>
									<span class="affix-val">
										+{typeof aff.value === 'number' && aff.value < 1 ? `${(aff.value * 100).toFixed(1)}%` : aff.value}
									</span>
								</div>
							{/each}
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="item-actions">
						{#if !isEquipped}
							<button class="btn btn-primary equip-btn" onclick={equipCurrentItem}>
								<span>⚡ EQUIP ITEM</span>
							</button>
							<button class="btn btn-secondary salvage-btn" onclick={salvageCurrentItem}>
								<span>💠 SALVAGE (+{displayedItem.level * 3} AETHER)</span>
							</button>
						{:else}
							<button class="btn btn-secondary unequip-btn" onclick={unequipCurrentSlot}>
								<span>✕ UNEQUIP TO BAG</span>
							</button>
						{/if}
					</div>
				</div>
			{:else}
				<div class="empty-detail">
					<span>Select an equipped socket or bag item to view stats and manage gear.</span>
				</div>
			{/if}
		</div>

		<!-- Combat Statistics Breakdown -->
		<div class="glass-panel stats-panel">
			<span class="category-tag">COMBAT ATTRIBUTES</span>
			<div class="stats-grid font-mono">
				<div class="stat-box primary-box">
					<span class="stat-label">EFFECTIVE DPS</span>
					<span class="stat-value highlight-cyan">{stats.dps.toLocaleString()}</span>
				</div>
				<div class="stat-box">
					<span class="stat-label">TOTAL ATTACK</span>
					<span class="stat-value">{stats.totalAtk.toLocaleString()}</span>
				</div>
				<div class="stat-box">
					<span class="stat-label">ATTACK SPEED</span>
					<span class="stat-value">{stats.attackSpeed} / sec</span>
				</div>
				<div class="stat-box">
					<span class="stat-label">CRIT CHANCE</span>
					<span class="stat-value">{(stats.critChance * 100).toFixed(1)}%</span>
				</div>
				<div class="stat-box">
					<span class="stat-label">CRIT MULTIPLIER</span>
					<span class="stat-value">{(stats.critMultiplier * 100).toFixed(0)}%</span>
				</div>
				<div class="stat-box">
					<span class="stat-label">GOLD FIND</span>
					<span class="stat-value highlight-gold">{stats.goldMult.toFixed(2)}x</span>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.equipment-view-container {
		display: grid;
		grid-template-columns: 320px 1fr 340px;
		gap: 1.25rem;
		width: 100%;
		align-items: start;
	}

	@media (max-width: 1200px) {
		.equipment-view-container {
			grid-template-columns: 1fr 1fr;
		}
		.avatar-center-column {
			grid-column: span 2;
			display: flex;
			justify-content: center;
		}
	}

	@media (max-width: 800px) {
		.equipment-view-container {
			grid-template-columns: 1fr;
		}
		.avatar-center-column {
			grid-column: span 1;
		}
	}

	/* Left Panel: Inventory */
	.inventory-panel {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		max-height: 620px;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.panel-title {
		font-family: var(--font-title);
		color: #ffffff;
		font-size: 1rem;
		margin: 0;
	}

	.aether-badge {
		font-size: 0.75rem;
		font-weight: 800;
		color: #a855f7;
		background: rgba(168, 85, 247, 0.15);
		border: 1px solid rgba(168, 85, 247, 0.4);
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
	}

	.filter-pills {
		display: flex;
		gap: 0.35rem;
	}

	.pill-btn {
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.pill-btn:hover {
		color: #ffffff;
		background: rgba(255, 255, 255, 0.05);
	}

	.pill-btn.active {
		background: rgba(0, 210, 255, 0.2);
		border-color: #00d2ff;
		color: #00d2ff;
	}

	.bag-grid-scroll {
		overflow-y: auto;
		max-height: 480px;
		padding-right: 0.25rem;
	}

	.bag-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}

	.bag-cell {
		position: relative;
		aspect-ratio: 1;
		background: rgba(15, 23, 42, 0.8);
		border: 1.5px solid var(--border-subtle);
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.bag-cell:hover {
		transform: scale(1.05);
		border-color: #00d2ff;
		box-shadow: 0 0 10px rgba(0, 210, 255, 0.3);
	}

	.bag-cell.active {
		border-color: #ffd200 !important;
		box-shadow: 0 0 15px rgba(255, 210, 0, 0.5) !important;
		background: rgba(255, 210, 0, 0.1);
	}

	.cell-elem {
		position: absolute;
		top: 2px;
		left: 2px;
		font-size: 0.55rem;
		padding: 0 0.25rem;
		border-radius: 4px;
	}

	.cell-icon {
		font-size: 1.3rem;
	}

	.cell-level {
		font-size: 0.65rem;
		font-weight: 800;
		color: var(--text-muted);
	}

	.empty-bag {
		padding: 2rem 1rem;
		text-align: center;
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	/* Center Column: Avatar */
	.avatar-center-column {
		display: flex;
		justify-content: center;
	}

	/* Right Column */
	.right-details-column {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.detail-panel {
		padding: 1.25rem;
	}

	.item-card {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.item-card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		padding-bottom: 0.75rem;
	}

	.item-slot-type {
		font-size: 0.65rem;
		font-weight: 800;
		color: var(--text-muted);
		letter-spacing: 0.05em;
	}

	.item-name {
		font-family: var(--font-title);
		font-size: 1.15rem;
		font-weight: 800;
		margin: 0.2rem 0 0 0;
	}

	.item-header-badges {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.equipped-tag {
		font-size: 0.6rem;
		font-weight: 900;
		background: rgba(16, 185, 129, 0.2);
		border: 1px solid #10b981;
		color: #34d399;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
	}

	.stat-line-primary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
	}

	.diff-tag.pos {
		color: #34d399;
		font-weight: 800;
	}

	.diff-tag.neg {
		color: #f87171;
		font-weight: 800;
	}

	.affixes-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		background: rgba(0, 0, 0, 0.3);
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
	}

	.affixes-title {
		font-size: 0.65rem;
		font-weight: 800;
		color: var(--text-muted);
		letter-spacing: 0.05em;
	}

	.affix-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.affix-val {
		color: #ffffff;
		font-weight: 800;
	}

	.item-actions {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-top: 0.25rem;
	}

	.equip-btn {
		width: 100%;
		padding: 0.65rem;
		font-size: 0.85rem;
		font-weight: 800;
		background: linear-gradient(135deg, #00d2ff 0%, #0284c7 100%);
		border-color: #00d2ff;
	}

	.salvage-btn, .unequip-btn {
		width: 100%;
		padding: 0.55rem;
		font-size: 0.75rem;
		font-weight: 700;
	}

	.empty-detail {
		padding: 2.5rem 1rem;
		text-align: center;
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	/* Stats Panel */
	.stats-panel {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	.stat-box {
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid var(--border-subtle);
		padding: 0.45rem 0.65rem;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.stat-box.primary-box {
		grid-column: span 2;
		background: rgba(0, 210, 255, 0.08);
		border-color: rgba(0, 210, 255, 0.3);
	}

	.stat-label {
		font-size: 0.65rem;
		color: var(--text-muted);
		font-weight: 700;
	}

	.stat-value {
		font-size: 0.95rem;
		font-weight: 800;
		color: #ffffff;
	}

	.highlight-cyan {
		color: #00d2ff;
	}

	.highlight-gold {
		color: #ffd200;
	}
</style>
