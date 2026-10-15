<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { minigameManager } from '#lib/stores/minigameStore.svelte';
	import { sfx } from '#lib/audio/sfx';

	let animId: number | null = null;

	const diff = minigameManager.selectedDifficulty;
	const hammerSpeed = diff === 'abyssal' ? 2.4 : diff === 'adept' ? 1.6 : 1.1;
	const zoneWidth = diff === 'abyssal' ? 14 : diff === 'adept' ? 22 : 32;

	let hammerPos = $state(50); // 0 to 100
	let hammerDir = 1;
	let zoneCenter = $state(50);
	let zoneDriftDir = 1;
	let strikes = $state(0);
	let streak = $state(0);
	let lastHitMsg = $state<string | null>(null);

	function strikeAnvil() {
		strikes++;
		const dist = Math.abs(hammerPos - zoneCenter);
		const halfZone = zoneWidth / 2;

		if (dist <= halfZone * 0.4) {
			// Master strike
			streak++;
			const res = minigameManager.addScore(35);
			sfx.playCrit();
			lastHitMsg = `✨ MASTER STRIKE! +${res.effectiveDelta} pts`;
		} else if (dist <= halfZone) {
			// Good temper strike
			streak++;
			const res = minigameManager.addScore(18);
			sfx.playGold();
			lastHitMsg = `🔥 TEMPERED HIT! +${res.effectiveDelta} pts`;
		} else {
			// Dented blade
			streak = 0;
			const penalty = diff === 'abyssal' ? -40 : diff === 'adept' ? -25 : -15;
			const res = minigameManager.addScore(penalty);
			sfx.playMinigameMiss();
			lastHitMsg = `❌ COLD METAL! ${res.effectiveDelta} pts`;
		}

		// Shift zone after strike
		if (diff !== 'novice') {
			zoneCenter = Math.floor(Math.random() * 60) + 20; // 20 to 80
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.code === 'Space') {
			e.preventDefault();
			strikeAnvil();
		}
	}

	function loop() {
		hammerPos += hammerSpeed * hammerDir;
		if (hammerPos >= 100) {
			hammerPos = 100;
			hammerDir = -1;
		} else if (hammerPos <= 0) {
			hammerPos = 0;
			hammerDir = 1;
		}

		// Slowly drift zone in adept and abyssal
		if (diff === 'abyssal') {
			zoneCenter += 0.3 * zoneDriftDir;
			if (zoneCenter > 80) zoneDriftDir = -1;
			if (zoneCenter < 20) zoneDriftDir = 1;
		}

		animId = requestAnimationFrame(loop);
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		animId = requestAnimationFrame(loop);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
		if (animId) cancelAnimationFrame(animId);
	});
</script>

<div class="forge-arena">
	<div class="forge-header">
		<span class="anvil-icon">🔨</span>
		<div class="forge-titles">
			<h4>TITAN'S CELESTIAL FORGE</h4>
			<p>Strike when the hammer aligns with the Golden Temper Zone</p>
		</div>
	</div>

	<!-- Forge Heat Bar & Temper Meter -->
	<div class="heat-gauge-container">
		<div class="heat-gauge">
			<!-- Golden Temper Zone -->
			<div
				class="temper-zone"
				style="left: {zoneCenter - zoneWidth / 2}%; width: {zoneWidth}%;"
			>
				<span class="zone-glow"></span>
			</div>

			<!-- Oscillating Hammer Indicator -->
			<div class="hammer-cursor" style="left: {hammerPos}%;">
				<div class="hammer-head">⚡</div>
			</div>
		</div>

		<div class="gauge-ticks">
			<span>COLD</span>
			<span>GOLDEN TEMPER</span>
			<span>OVERHEAT</span>
		</div>
	</div>

	{#if lastHitMsg}
		<div class="hit-feedback {lastHitMsg.includes('STRIKE') || lastHitMsg.includes('TEMPERED') ? 'good' : 'bad'}">
			{lastHitMsg}
		</div>
	{/if}

	<div class="forge-actions">
		<button class="btn btn-primary strike-btn" onclick={strikeAnvil}>
			<span>🔥 STRIKE ANVIL [SPACE] 🔥</span>
		</button>
	</div>
</div>

<style>
	.forge-arena {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		width: 100%;
		max-width: 440px;
		background: radial-gradient(circle at 50% 50%, rgba(35, 15, 10, 0.75) 0%, rgba(15, 5, 5, 0.95) 100%);
		border: 1px solid rgba(249, 115, 22, 0.3);
		border-radius: 14px;
		padding: 1.25rem;
		box-shadow: 0 0 25px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(249, 115, 22, 0.1);
	}

	.forge-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.anvil-icon {
		font-size: 2rem;
	}

	.forge-titles h4 {
		font-family: var(--font-title);
		color: #ffffff;
		font-size: 1rem;
		margin: 0;
	}

	.forge-titles p {
		color: var(--text-secondary);
		font-size: 0.75rem;
		margin: 0;
	}

	.heat-gauge-container {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.heat-gauge {
		position: relative;
		height: 38px;
		background: linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%);
		border: 1px solid rgba(249, 115, 22, 0.4);
		border-radius: 8px;
		overflow: hidden;
		box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.6);
	}

	.temper-zone {
		position: absolute;
		top: 0;
		bottom: 0;
		background: linear-gradient(180deg, rgba(255, 210, 0, 0.4) 0%, rgba(249, 115, 22, 0.4) 100%);
		border: 2px solid #ffd200;
		box-shadow: 0 0 15px rgba(255, 210, 0, 0.6), inset 0 0 10px rgba(255, 210, 0, 0.4);
		border-radius: 4px;
	}

	.hammer-cursor {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 4px;
		background: #ffffff;
		box-shadow: 0 0 12px #ffffff;
		transform: translateX(-50%);
		z-index: 2;
	}

	.hammer-head {
		position: absolute;
		top: -18px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 1.1rem;
	}

	.gauge-ticks {
		display: flex;
		justify-content: space-between;
		font-size: 0.65rem;
		color: var(--text-muted);
		font-weight: 700;
		letter-spacing: 0.05em;
	}

	.hit-feedback {
		font-family: var(--font-title);
		font-size: 0.85rem;
		font-weight: 700;
		padding: 0.35rem 0.8rem;
		border-radius: 6px;
		animation: pulseGlow 0.3s ease-out;
	}

	.hit-feedback.good {
		background: rgba(16, 185, 129, 0.2);
		border: 1px solid #10b981;
		color: #34d399;
	}

	.hit-feedback.bad {
		background: rgba(239, 68, 68, 0.2);
		border: 1px solid #ef4444;
		color: #f87171;
	}

	.forge-actions {
		width: 100%;
	}

	.strike-btn {
		width: 100%;
		padding: 0.75rem;
		font-size: 0.95rem;
		font-weight: 800;
		background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
		border-color: #f97316;
		box-shadow: 0 0 20px rgba(249, 115, 22, 0.5);
	}
</style>
