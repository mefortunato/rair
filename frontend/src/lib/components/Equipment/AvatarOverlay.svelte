<script lang="ts">
	import { game } from '#lib/stores/playerStore.svelte';
	import type { GearSlot, GearItem } from '#lib/types/game';

	let {
		selectedSlot = $bindable<GearSlot | null>(null),
		onSelectSlot = (_slot: GearSlot) => {}
	}: {
		selectedSlot?: GearSlot | null;
		onSelectSlot?: (slot: GearSlot) => void;
	} = $props();

	let player = $derived(game.player);
	let equipped = $derived(player?.equipped_gear);

	interface SlotMeta {
		slot: GearSlot;
		label: string;
		icon: string;
		top: string;
		left?: string;
		right?: string;
		transform: string;
	}

	const slotPositions: SlotMeta[] = [
		{
			slot: 'amulet',
			label: 'Amulet',
			icon: '📿',
			top: '16%',
			left: '50%',
			transform: 'translate(-50%, -50%)'
		},
		{
			slot: 'armor',
			label: 'Armor',
			icon: '🛡️',
			top: '36%',
			left: '50%',
			transform: 'translate(-50%, -50%)'
		},
		{
			slot: 'weapon',
			label: 'Weapon',
			icon: '⚔️',
			top: '38%',
			right: '6%',
			transform: 'translateY(-50%)'
		},
		{
			slot: 'catalyst',
			label: 'Catalyst',
			icon: '🔮',
			top: '36%',
			left: '6%',
			transform: 'translateY(-50%)'
		},
		{
			slot: 'ring',
			label: 'Ring',
			icon: '💍',
			top: '62%',
			left: '12%',
			transform: 'translateY(-50%)'
		}
	];

	function handleSlotClick(slot: GearSlot) {
		selectedSlot = slot;
		onSelectSlot(slot);
	}
</script>

<div class="avatar-overlay-stage">
	<!-- Hero Avatar Art Backdrop -->
	<div class="avatar-backdrop">
		<img
			src="/images/ascendant_avatar.jpg"
			alt="Ascendant Rogue Avatar"
			class="avatar-image"
		/>
		<div class="avatar-vignette"></div>
		<div class="avatar-ground-glow"></div>
	</div>

	<!-- Hero Title & Identity Overlay -->
	<div class="avatar-hero-header">
		<span class="hero-rank">LEVEL {player?.ascension_level || 0} ASCENDANT</span>
		<h3 class="hero-name">{player?.handle || 'Ascendant Rogue'}</h3>
	</div>

	<!-- Equipment Sockets Overlay -->
	<div class="sockets-layer">
		{#each slotPositions as meta (meta.slot)}
			{@const item = equipped ? equipped[meta.slot] : null}
			{@const isSelected = selectedSlot === meta.slot}
			<button
				class="gear-socket {item ? `rarity-${item.rarity}` : 'empty-socket'} {isSelected ? 'selected' : ''}"
				style="top: {meta.top}; {meta.left ? `left: ${meta.left};` : ''} {meta.right ? `right: ${meta.right};` : ''} transform: {meta.transform};"
				onclick={() => handleSlotClick(meta.slot)}
			>
				<div class="socket-connector"></div>
				<div class="socket-circle">
					<span class="socket-icon">{meta.icon}</span>
					{#if item}
						<span class="socket-elem-gem elem-{item.element}">
							{item.element.substring(0, 1).toUpperCase()}
						</span>
					{/if}
				</div>

				<div class="socket-details">
					<span class="socket-label">{meta.label}</span>
					<span class="socket-item-name {item ? `rarity-${item.rarity}` : ''}">
						{item ? item.name : 'Empty Slot'}
					</span>
					{#if item}
						<span class="socket-level font-mono">Lv.{item.level}</span>
					{/if}
				</div>
			</button>
		{/each}
	</div>
</div>

<style>
	.avatar-overlay-stage {
		position: relative;
		width: 100%;
		max-width: 520px;
		height: 620px;
		border-radius: 16px;
		overflow: hidden;
		background: radial-gradient(circle at 50% 40%, rgba(20, 28, 50, 0.7) 0%, rgba(4, 7, 15, 0.98) 100%);
		border: 1px solid rgba(0, 210, 255, 0.25);
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), inset 0 0 30px rgba(0, 210, 255, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.avatar-backdrop {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.avatar-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center top;
		filter: brightness(0.9) contrast(1.1);
	}

	.avatar-vignette {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at 50% 50%, transparent 40%, rgba(4, 7, 15, 0.85) 85%, #04070f 100%);
	}

	.avatar-ground-glow {
		position: absolute;
		bottom: 0;
		left: 10%;
		right: 10%;
		height: 80px;
		background: radial-gradient(ellipse at center, rgba(0, 210, 255, 0.3) 0%, transparent 70%);
		filter: blur(15px);
	}

	.avatar-hero-header {
		position: absolute;
		top: 1rem;
		left: 1.25rem;
		display: flex;
		flex-direction: column;
		z-index: 10;
		pointer-events: none;
	}

	.hero-rank {
		font-size: 0.65rem;
		font-weight: 800;
		color: #00d2ff;
		letter-spacing: 0.15em;
	}

	.hero-name {
		font-family: var(--font-title);
		font-size: 1.3rem;
		font-weight: 900;
		color: #ffffff;
		margin: 0;
		text-shadow: 0 0 15px rgba(0, 0, 0, 0.9);
	}

	.sockets-layer {
		position: absolute;
		inset: 0;
		z-index: 20;
		pointer-events: none;
	}

	.gear-socket {
		position: absolute;
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		background: rgba(10, 16, 30, 0.82);
		backdrop-filter: blur(10px);
		border: 1.5px solid var(--border-subtle);
		border-radius: 12px;
		padding: 0.45rem 0.65rem;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
		max-width: 175px;
	}

	.gear-socket:hover {
		transform: scale(1.08) !important;
		background: rgba(15, 23, 42, 0.95);
		border-color: #00d2ff;
		box-shadow: 0 0 20px rgba(0, 210, 255, 0.4);
		z-index: 30;
	}

	.gear-socket.selected {
		border-color: #ffd200 !important;
		box-shadow: 0 0 25px rgba(255, 210, 0, 0.5) !important;
		background: rgba(255, 210, 0, 0.1) !important;
		z-index: 30;
	}

	.empty-socket {
		border-style: dashed;
		border-color: rgba(255, 255, 255, 0.2);
		opacity: 0.8;
	}

	.gear-socket.rarity-common {
		border-color: rgba(148, 163, 184, 0.5);
	}

	.gear-socket.rarity-rare {
		border-color: #00d2ff;
		box-shadow: 0 0 15px rgba(0, 210, 255, 0.25);
	}

	.gear-socket.rarity-epic {
		border-color: #b05cff;
		box-shadow: 0 0 15px rgba(176, 92, 255, 0.25);
	}

	.gear-socket.rarity-legendary {
		border-color: #ffd200;
		box-shadow: 0 0 20px rgba(255, 210, 0, 0.35);
	}

	.socket-circle {
		position: relative;
		width: 36px;
		height: 36px;
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border: 1px solid rgba(255, 255, 255, 0.15);
	}

	.socket-icon {
		font-size: 1.25rem;
		line-height: 1;
	}

	.socket-elem-gem {
		position: absolute;
		top: -4px;
		right: -4px;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		font-size: 0.55rem;
		font-weight: 900;
		color: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid #ffffff;
	}

	.elem-fire {
		background: #ef4444;
	}

	.elem-ice {
		background: #06b6d4;
	}

	.elem-lightning {
		background: #eab308;
	}

	.elem-void {
		background: #a855f7;
	}

	.socket-details {
		display: flex;
		flex-direction: column;
		text-align: left;
		overflow: hidden;
	}

	.socket-label {
		font-size: 0.6rem;
		font-weight: 800;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.socket-item-name {
		font-family: var(--font-title);
		font-size: 0.75rem;
		font-weight: 700;
		color: #ffffff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.socket-level {
		font-size: 0.65rem;
		color: #ffd200;
		font-weight: 800;
	}

	.rarity-common {
		color: #cbd5e1;
	}

	.rarity-rare {
		color: #38bdf8;
	}

	.rarity-epic {
		color: #c084fc;
	}

	.rarity-legendary {
		color: #fbbf24;
	}

	@media (max-width: 640px) {
		.avatar-overlay-stage {
			height: clamp(330px, 46vh, 420px);
			border-radius: 12px;
		}

		.avatar-hero-header {
			top: 0.65rem;
			left: 0.75rem;
		}

		.hero-name {
			font-size: 1.05rem;
		}

		.gear-socket {
			width: 44px;
			height: 44px;
			padding: 0;
			justify-content: center;
			border-radius: 10px;
			max-width: 44px;
		}

		.socket-details {
			display: none;
		}

		.socket-circle {
			width: 100%;
			height: 100%;
			border: none;
			background: transparent;
		}

		.socket-icon {
			font-size: 1.35rem;
		}
	}
</style>
