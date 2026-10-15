<script lang="ts">
	import { game } from '#lib/stores/playerStore.svelte';
	import type { ElementType } from '#lib/types/game';

	const elementNames: Record<ElementType, string> = {
		fire: 'Inferno Guardian',
		ice: 'Glacier Warden',
		lightning: 'Tempest Sentinel',
		void: 'Void Anomaly',
		neutral: 'Spire Monolith'
	};

	const elementIcons: Record<ElementType, string> = {
		fire: '🔥',
		ice: '❄️',
		lightning: '⚡',
		void: '🌌',
		neutral: '🗿'
	};

	let run = $derived(game.player?.active_run);
	let stats = $derived(game.getEffectiveStats());
	let hpPercent = $derived(run ? Math.max(0, Math.min(100, (run.guardian_hp_current / run.guardian_hp_max) * 100)) : 100);
</script>

<div class="glass-panel spire-container">
	<!-- Spire Header -->
	<div class="spire-header">
		<div class="floor-badge">
			<span class="floor-label">ASCENSION SPIRE</span>
			<span class="floor-number">FLOOR {run?.current_floor || 1}</span>
		</div>

		{#if run?.is_boss_floor}
			<div class="boss-tag">
				<span class="boss-icon">⚠️</span>
				<span>BOSS ENCOUNTER • REWARD: SPIRE BOON</span>
			</div>
		{/if}

		{#if run?.pending_perk_picks && run.pending_perk_picks > 0}
			<button class="claim-boon-btn font-mono" onclick={() => game.openPerkDraftModal()}>
				<span>👑 CLAIM BOON ({run.pending_perk_picks})</span>
			</button>
		{/if}

		<div class="badge-elem badge-{run?.guardian_element || 'fire'}">
			<span>{elementIcons[run?.guardian_element || 'fire']}</span>
			<span>{run?.guardian_element?.toUpperCase() || 'FIRE'} AFFINITY</span>
		</div>
	</div>

	<!-- Central Visual Stage: Monolith / Guardian -->
	<div class="guardian-stage">
		<!-- Floating Combat Damage Numbers -->
		{#each game.floatingDamages as dmg (dmg.id)}
			<div
				class="damage-number elem-{dmg.element} {dmg.isCrit ? 'crit' : ''}"
				style="left: {dmg.x}%; top: {dmg.y}%; font-size: {dmg.isCrit ? '1.8rem' : '1.3rem'};"
			>
				{dmg.text}
			</div>
		{/each}

		<!-- Elemental Aura Glow -->
		<div class="guardian-aura elem-{run?.guardian_element || 'fire'}-aura"></div>

		<!-- Guardian Monolith Visual -->
		<div class="guardian-entity elem-{run?.guardian_element || 'fire'}">
			<div class="monolith-core">
				<div class="core-glyph">{elementIcons[run?.guardian_element || 'fire']}</div>
			</div>
			<div class="monolith-ring ring-outer"></div>
			<div class="monolith-ring ring-inner"></div>
		</div>

		<!-- Name & Target Subtitle -->
		<div class="guardian-title">
			<h2 class="guardian-name">{elementNames[run?.guardian_element || 'fire']}</h2>
			<span class="guardian-type">
				{run?.is_boss_floor ? 'Major Spire Sovereign' : 'Astral Keystone'}
			</span>
		</div>
	</div>

	<!-- Guardian HP Bar -->
	<div class="hp-section">
		<div class="hp-meta">
			<span class="hp-label">GUARDIAN INTEGRITY</span>
			<span class="hp-values font-mono">
				{Math.round(run?.guardian_hp_current || 0).toLocaleString()} / {Math.round(run?.guardian_hp_max || 0).toLocaleString()}
			</span>
		</div>

		<div class="progress-bar-container">
			<div
				class="progress-bar-fill hp-fill-{run?.guardian_element || 'fire'}"
				style="width: {hpPercent}%;"
			></div>
		</div>
	</div>

	<!-- Active Buffs Tracker -->
	{#if run && run.active_buffs.length > 0}
		<div class="active-buffs-bar">
			{#each run.active_buffs as buff (buff.id)}
				{@const isDebuff = buff.is_debuff || buff.multiplier < 1.0}
				<div class="buff-chip {isDebuff ? 'debuff' : 'buff'}">
					<span class="buff-icon">{isDebuff ? '⚠️' : '✨'}</span>
					<span class="buff-name">{buff.name}</span>
					<span class="buff-mult font-mono">x{buff.multiplier}</span>
					<span class="buff-time font-mono">({Math.ceil(buff.time_remaining)}s)</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.spire-container {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		position: relative;
		overflow: hidden;
		min-height: 480px;
		background: radial-gradient(circle at 50% 30%, rgba(20, 32, 58, 0.6) 0%, rgba(10, 15, 26, 0.85) 100%);
	}

	.spire-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.floor-badge {
		display: flex;
		flex-direction: column;
	}

	.floor-label {
		font-size: 0.7rem;
		letter-spacing: 0.15em;
		color: var(--text-muted);
		font-weight: 700;
	}

	.floor-number {
		font-family: var(--font-title);
		font-size: 1.6rem;
		font-weight: 900;
		color: #ffffff;
		letter-spacing: 0.05em;
		text-shadow: 0 0 14px rgba(0, 210, 255, 0.4);
	}

	.boss-tag {
		background: rgba(239, 68, 68, 0.2);
		border: 1px solid #ef4444;
		color: #fca5a5;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		animation: pulseGlow 1.5s infinite;
	}

	.claim-boon-btn {
		background: linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.4) 100%);
		border: 1px solid #fbbf24;
		box-shadow: 0 0 16px rgba(245, 158, 11, 0.4);
		color: #fbbf24;
		padding: 0.3rem 0.85rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 800;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		animation: pulseBanner 2s infinite;
		transition: all 0.2s;
	}

	.claim-boon-btn:hover {
		transform: scale(1.05);
		filter: brightness(1.2);
	}

	.guardian-stage {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
		min-height: 260px;
	}

	.guardian-aura {
		position: absolute;
		width: 220px;
		height: 220px;
		border-radius: 50%;
		filter: blur(40px);
		opacity: 0.35;
		pointer-events: none;
	}

	.elem-fire-aura { background: var(--elem-fire); }
	.elem-ice-aura { background: var(--elem-ice); }
	.elem-lightning-aura { background: var(--elem-lightning); }
	.elem-void-aura { background: var(--elem-void); }

	.guardian-entity {
		position: relative;
		width: 140px;
		height: 140px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1.25rem;
		animation: floatEntity 3s ease-in-out infinite;
	}

	@keyframes floatEntity {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-10px); }
	}

	.monolith-core {
		width: 80px;
		height: 80px;
		background: rgba(15, 23, 42, 0.9);
		border: 2px solid currentColor;
		border-radius: 18px;
		transform: rotate(45deg);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 0 25px currentColor;
		z-index: 2;
	}

	.core-glyph {
		transform: rotate(-45deg);
		font-size: 2.2rem;
		filter: drop-shadow(0 0 8px currentColor);
	}

	.monolith-ring {
		position: absolute;
		border: 1px dashed currentColor;
		border-radius: 50%;
		opacity: 0.6;
		pointer-events: none;
	}

	.ring-outer {
		width: 130px;
		height: 130px;
		animation: spinRing 12s linear infinite;
	}

	.ring-inner {
		width: 105px;
		height: 105px;
		animation: spinRing 8s linear infinite reverse;
	}

	@keyframes spinRing {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.guardian-title {
		text-align: center;
		z-index: 2;
	}

	.guardian-name {
		font-family: var(--font-title);
		font-size: 1.4rem;
		font-weight: 700;
		color: #ffffff;
		letter-spacing: 0.05em;
	}

	.guardian-type {
		font-size: 0.8rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.hp-section {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.hp-meta {
		display: flex;
		justify-content: space-between;
		font-size: 0.8rem;
	}

	.hp-label {
		color: var(--text-secondary);
		font-weight: 600;
		letter-spacing: 0.05em;
	}

	.hp-values {
		color: #ffffff;
		font-weight: 600;
	}

	.active-buffs-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--border-subtle);
	}

	.buff-chip {
		background: rgba(176, 92, 255, 0.15);
		border: 1px solid rgba(176, 92, 255, 0.4);
		color: #e9d5ff;
		padding: 0.25rem 0.6rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.buff-chip.buff {
		background: rgba(16, 185, 129, 0.15);
		border-color: rgba(16, 185, 129, 0.4);
		color: #a7f3d0;
	}

	.buff-chip.buff .buff-mult {
		color: #34d399;
	}

	.buff-chip.debuff {
		background: rgba(239, 68, 68, 0.15);
		border-color: rgba(239, 68, 68, 0.4);
		color: #fca5a5;
	}

	.buff-chip.debuff .buff-mult {
		color: #ef4444;
	}

	.buff-mult {
		color: #fbbf24;
		font-weight: 700;
	}

	.buff-time {
		color: #94a3b8;
		font-size: 0.7rem;
	}
</style>
