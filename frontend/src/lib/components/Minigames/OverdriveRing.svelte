<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { game } from '#lib/stores/playerStore.svelte';
	import { api } from '#lib/api/apiClient';
	import { sfx } from '#lib/audio/sfx';

	let ringRadius = $state(100); // 100% down to 0%
	let targetMin = 35;
	let targetMax = 55;
	let isRunning = $state(false);
	let resultMessage: string | null = $state(null);
	let animationFrame: number | null = null;
	let speed = 0.75; // percent per frame

	function startMinigame() {
		ringRadius = 100;
		resultMessage = null;
		isRunning = true;

		const loop = () => {
			if (!isRunning) return;
			ringRadius -= speed;

			if (ringRadius <= 0) {
				handleMiss();
				return;
			}
			animationFrame = requestAnimationFrame(loop);
		};
		animationFrame = requestAnimationFrame(loop);
	}

	async function handleStrike() {
		if (!isRunning) return;
		isRunning = false;
		if (animationFrame) cancelAnimationFrame(animationFrame);

		if (ringRadius >= targetMin && ringRadius <= targetMax) {
			// Perfect Hit!
			resultMessage = '⚡ PERFECT OVERDRIVE! (+300% FRENZY DPS) ⚡';
			sfx.playMinigameSuccess();
			try {
				const buff = await api.claimMinigameBuff('overdrive_ring', 100, true);
				game.applyMinigameBuff(buff);
			} catch (e) {
				console.error(e);
			}
		} else if (ringRadius >= targetMin - 15 && ringRadius <= targetMax + 15) {
			// Near Hit
			resultMessage = '✨ GOOD HIT! (+150% DPS) ✨';
			sfx.playMinigameSuccess();
			try {
				const buff = await api.claimMinigameBuff('overdrive_ring', 50, false);
				game.applyMinigameBuff(buff);
			} catch (e) {
				console.error(e);
			}
		} else {
			handleMiss();
		}
	}

	function handleMiss() {
		isRunning = false;
		if (animationFrame) cancelAnimationFrame(animationFrame);
		resultMessage = '❌ MISSED THE TIMING WINDOW';
		sfx.playMinigameMiss();
	}

	onDestroy(() => {
		if (animationFrame) cancelAnimationFrame(animationFrame);
	});
</script>

<div class="overdrive-box">
	<div class="instructions">
		<h4>Overdrive Timing Ring</h4>
		<p>Tap STRIKE when the shrinking ring aligns inside the neon target zone!</p>
	</div>

	<!-- Visual Ring Arena -->
	<div class="ring-arena">
		<!-- Target Ring (Sweet Spot) -->
		<div
			class="ring target-ring"
			style="width: {targetMax * 2}px; height: {targetMax * 2}px;"
		>
			<div
				class="target-inner"
				style="width: {targetMin * 2}px; height: {targetMin * 2}px;"
			></div>
		</div>

		<!-- Moving Precision Ring -->
		{#if isRunning}
			<div
				class="ring moving-ring"
				style="width: {ringRadius * 2}px; height: {ringRadius * 2}px;"
			></div>
		{/if}

		<div class="center-core">
			<span>⚡</span>
		</div>
	</div>

	{#if resultMessage}
		<div class="result-text">{resultMessage}</div>
	{/if}

	<div class="actions">
		{#if !isRunning}
			<button class="btn btn-primary" onclick={startMinigame}>
				<span>START OVERDRIVE</span>
			</button>
		{:else}
			<button class="btn btn-primary btn-strike" onclick={handleStrike}>
				<span>⚡ STRIKE NOW! ⚡</span>
			</button>
		{/if}
	</div>
</div>

<style>
	.overdrive-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		padding: 1rem;
	}

	.instructions {
		text-align: center;
	}

	.instructions h4 {
		font-family: var(--font-title);
		color: #ffffff;
		font-size: 1.15rem;
	}

	.instructions p {
		color: var(--text-secondary);
		font-size: 0.85rem;
	}

	.ring-arena {
		position: relative;
		width: 240px;
		height: 240px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: radial-gradient(circle, rgba(15, 23, 42, 0.8) 0%, rgba(3, 7, 18, 0.9) 100%);
		border: 1px solid var(--border-subtle);
		border-radius: 50%;
		overflow: hidden;
	}

	.ring {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
	}

	.target-ring {
		border: 3px solid #00d2ff;
		box-shadow: 0 0 15px rgba(0, 210, 255, 0.5), inset 0 0 15px rgba(0, 210, 255, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.target-inner {
		border: 2px dashed rgba(0, 210, 255, 0.5);
		border-radius: 50%;
	}

	.moving-ring {
		border: 4px solid #ffd200;
		box-shadow: 0 0 20px rgba(255, 210, 0, 0.8);
	}

	.center-core {
		font-size: 1.8rem;
		z-index: 2;
	}

	.result-text {
		font-size: 0.95rem;
		font-weight: 700;
		color: #ffd200;
		text-align: center;
		animation: pulseGlow 0.5s ease-out;
	}

	.btn-strike {
		font-size: 1.1rem;
		padding: 0.8rem 2rem;
		background: linear-gradient(135deg, #ffd200 0%, #ff5533 100%);
		border-color: #ffd200;
		color: #000000;
		box-shadow: 0 0 20px rgba(255, 210, 0, 0.6);
	}
</style>
