<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { minigameManager } from '#lib/stores/minigameStore.svelte';
	import { sfx } from '#lib/audio/sfx';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let animId: number | null = null;

	const diff = minigameManager.selectedDifficulty;
	const tolerance = diff === 'abyssal' ? 0.08 : diff === 'adept' ? 0.14 : 0.22;
	const shiftInterval = diff === 'abyssal' ? 250 : diff === 'adept' ? 380 : 500;

	let targetFreq = $state(2.5);
	let targetAmp = $state(45);
	let playerFreq = $state(1.5);
	let phase = 0;
	let shiftTimer = 0;
	let alignment = $state(0);
	let isResonant = $state(false);
	let tickCounter = 0;

	function loop() {
		if (!canvas) return;
		ctx = canvas.getContext('2d');
		if (!ctx) return;

		const width = canvas.width;
		const height = canvas.height;
		const centerY = height / 2;
		ctx.clearRect(0, 0, width, height);

		phase += 0.05;
		shiftTimer++;
		if (shiftTimer >= shiftInterval) {
			shiftTimer = 0;
			targetFreq = parseFloat((1.0 + Math.random() * 3.5).toFixed(2));
		}

		// Calculate frequency match
		const diffRatio = Math.abs(playerFreq - targetFreq) / targetFreq;
		alignment = Math.max(0, Math.min(1, 1 - diffRatio / (tolerance * 2)));
		isResonant = diffRatio <= tolerance;

		// Tick score every 15 frames (~4 times/sec)
		tickCounter++;
		if (tickCounter >= 15) {
			tickCounter = 0;
			if (isResonant) {
				minigameManager.addScore(6);
			} else {
				minigameManager.addScore(-4);
			}
		}

		// Draw Oscilloscope Grid
		ctx.strokeStyle = 'rgba(0, 210, 255, 0.1)';
		ctx.lineWidth = 1;
		for (let x = 0; x < width; x += 30) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, height);
			ctx.stroke();
		}
		for (let y = 0; y < height; y += 30) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(width, y);
			ctx.stroke();
		}

		// Center zero line
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
		ctx.beginPath();
		ctx.moveTo(0, centerY);
		ctx.lineTo(width, centerY);
		ctx.stroke();

		// Draw Target Wave (Gold)
		ctx.strokeStyle = '#ffd200';
		ctx.lineWidth = 2.5;
		ctx.shadowColor = '#ffd200';
		ctx.shadowBlur = 8;
		ctx.beginPath();
		for (let x = 0; x < width; x++) {
			const y = centerY + Math.sin((x * targetFreq * Math.PI) / 180 + phase) * targetAmp;
			if (x === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();

		// Draw Player Wave (Cyan or Red if desync)
		ctx.strokeStyle = isResonant ? '#00d2ff' : '#ef4444';
		ctx.lineWidth = 3;
		ctx.shadowColor = isResonant ? '#00d2ff' : '#ef4444';
		ctx.shadowBlur = isResonant ? 15 : 6;
		ctx.beginPath();
		for (let x = 0; x < width; x++) {
			const y = centerY + Math.sin((x * playerFreq * Math.PI) / 180 + phase) * targetAmp;
			if (x === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();

		animId = requestAnimationFrame(loop);
	}

	function adjustFreq(delta: number) {
		playerFreq = Math.max(1.0, Math.min(5.0, parseFloat((playerFreq + delta).toFixed(2))));
		sfx.playSlash();
	}

	onMount(() => {
		animId = requestAnimationFrame(loop);
	});

	onDestroy(() => {
		if (animId) cancelAnimationFrame(animId);
	});
</script>

<div class="vault-arena">
	<div class="oscilloscope-header">
		<div class="osc-stat">
			<span class="label">RESONANCE:</span>
			<span class="val font-mono {isResonant ? 'text-green' : 'text-red'}">
				{Math.round(alignment * 100)}% {isResonant ? '⚡ HARMONIC LOCK' : '⚠️ DESYNC'}
			</span>
		</div>
		<div class="osc-stat">
			<span class="label">TARGET FREQ:</span>
			<span class="val font-mono text-gold">{targetFreq} Hz</span>
		</div>
	</div>

	<canvas bind:this={canvas} width={420} height={220}></canvas>

	<!-- Frequency Tuning Controls -->
	<div class="tuning-bar">
		<button class="btn btn-secondary tune-btn" onclick={() => adjustFreq(-0.2)}>
			<span>- 0.2 Hz</span>
		</button>
		<input
			type="range"
			min="1.0"
			max="5.0"
			step="0.05"
			bind:value={playerFreq}
			class="freq-slider"
		/>
		<button class="btn btn-secondary tune-btn" onclick={() => adjustFreq(0.2)}>
			<span>+ 0.2 Hz</span>
		</button>
	</div>
</div>

<style>
	.vault-arena {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.85rem;
		width: 100%;
		max-width: 440px;
		background: radial-gradient(circle at 50% 50%, rgba(10, 25, 45, 0.75) 0%, rgba(3, 7, 18, 0.95) 100%);
		border: 1px solid rgba(56, 189, 248, 0.25);
		border-radius: 14px;
		padding: 1rem;
		box-shadow: 0 0 25px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(56, 189, 248, 0.1);
	}

	.oscilloscope-header {
		display: flex;
		justify-content: space-between;
		width: 100%;
	}

	.osc-stat {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.75rem;
		background: rgba(0, 0, 0, 0.5);
		padding: 0.25rem 0.6rem;
		border-radius: 6px;
		border: 1px solid var(--border-subtle);
	}

	.osc-stat .label {
		color: var(--text-muted);
		font-weight: 700;
	}

	.osc-stat .val {
		font-weight: 800;
	}

	.text-green {
		color: #10b981;
	}

	.text-red {
		color: #ef4444;
	}

	.text-gold {
		color: #ffd200;
	}

	canvas {
		border-radius: 10px;
		border: 1px solid rgba(56, 189, 248, 0.3);
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.6), inset 0 0 25px rgba(56, 189, 248, 0.15);
		max-width: 100%;
		height: auto;
		background: #020617;
	}

	.tuning-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
	}

	.tune-btn {
		padding: 0.5rem 0.75rem;
		font-size: 0.8rem;
		font-weight: 700;
	}

	.freq-slider {
		flex: 1;
		accent-color: #00d2ff;
		cursor: pointer;
	}
</style>
