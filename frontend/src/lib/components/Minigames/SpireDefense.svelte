<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { minigameManager } from '#lib/stores/minigameStore.svelte';
	import { sfx } from '#lib/audio/sfx';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let animId: number | null = null;

	const diff = minigameManager.selectedDifficulty;
	const projectileSpeed = diff === 'abyssal' ? 2.6 : diff === 'adept' ? 1.8 : 1.2;
	const spawnRate = diff === 'abyssal' ? 35 : diff === 'adept' ? 50 : 68;

	interface VoidRift {
		id: number;
		x: number;
		y: number;
		vx: number;
		vy: number;
		radius: number;
		destroyed?: boolean;
	}

	let rifts: VoidRift[] = [];
	let nextId = 1;
	let spawnTimer = 0;
	let floatingTexts: { id: number; text: string; x: number; y: number; color: string; alpha: number }[] = [];
	let textId = 1;

	function handleCanvasClick(e: MouseEvent) {
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		const clickX = (e.clientX - rect.left) * scaleX;
		const clickY = (e.clientY - rect.top) * scaleY;

		let hit = false;
		for (let i = rifts.length - 1; i >= 0; i--) {
			const r = rifts[i];
			if (!r.destroyed) {
				const dist = Math.hypot(clickX - r.x, clickY - r.y);
				if (dist <= r.radius + 14) {
					// Direct hit!
					r.destroyed = true;
					hit = true;
					sfx.playCrit();

					const distFromCenter = Math.hypot(canvas.width / 2 - r.x, canvas.height / 2 - r.y);
					const isLongRange = distFromCenter > 110;
					const pts = isLongRange ? 30 : 18;
					const res = minigameManager.addScore(pts);
					addFloat(`+${res.effectiveDelta}${isLongRange ? ' SNIPE!' : ''}`, r.x, r.y, '#38bdf8');
					break;
				}
			}
		}

		if (!hit) {
			sfx.playSlash();
		}
	}

	function addFloat(text: string, x: number, y: number, color: string) {
		floatingTexts.push({ id: textId++, text, x, y, color, alpha: 1.0 });
	}

	function loop() {
		if (!canvas) return;
		ctx = canvas.getContext('2d');
		if (!ctx) return;

		const width = canvas.width;
		const height = canvas.height;
		const centerX = width / 2;
		const centerY = height / 2;
		const coreRadius = 24;

		ctx.clearRect(0, 0, width, height);

		// Radar dark background
		ctx.fillStyle = '#030712';
		ctx.fillRect(0, 0, width, height);

		// Radar circular concentric rings
		ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
		ctx.lineWidth = 1;
		[60, 110, 150].forEach((r) => {
			if (!ctx) return;
			ctx.beginPath();
			ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
			ctx.stroke();
		});

		// Central Spire Core
		ctx.save();
		ctx.fillStyle = '#38bdf8';
		ctx.shadowColor = '#38bdf8';
		ctx.shadowBlur = 20;
		ctx.beginPath();
		ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
		ctx.fill();

		// Core icon
		ctx.fillStyle = '#ffffff';
		ctx.font = '20px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('🛡️', centerX, centerY + 7);
		ctx.restore();

		// Spawn incoming rifts from outer perimeter
		spawnTimer++;
		if (spawnTimer >= spawnRate) {
			spawnTimer = 0;
			const angle = Math.random() * Math.PI * 2;
			const spawnDist = 180;
			const sx = centerX + Math.cos(angle) * spawnDist;
			const sy = centerY + Math.sin(angle) * spawnDist;

			const dirX = centerX - sx;
			const dirY = centerY - sy;
			const len = Math.hypot(dirX, dirY);

			rifts.push({
				id: nextId++,
				x: sx,
				y: sy,
				vx: (dirX / len) * projectileSpeed,
				vy: (dirY / len) * projectileSpeed,
				radius: 12
			});
		}

		// Update and draw rifts
		for (let i = rifts.length - 1; i >= 0; i--) {
			const r = rifts[i];
			if (r.destroyed) {
				rifts.splice(i, 1);
				continue;
			}

			r.x += r.vx;
			r.y += r.vy;

			// Draw void rift projectile
			ctx.save();
			ctx.fillStyle = '#ef4444';
			ctx.shadowColor = '#ef4444';
			ctx.shadowBlur = 14;
			ctx.beginPath();
			ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
			ctx.fill();

			// Tail
			ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(r.x, r.y);
			ctx.lineTo(r.x - r.vx * 6, r.y - r.vy * 6);
			ctx.stroke();
			ctx.restore();

			// Check core breach
			const distToCore = Math.hypot(centerX - r.x, centerY - r.y);
			if (distToCore <= coreRadius + r.radius) {
				r.destroyed = true;
				const penalty = diff === 'abyssal' ? -55 : diff === 'adept' ? -35 : -20;
				const res = minigameManager.addScore(penalty);
				sfx.playMinigameMiss();
				addFloat(`💥 BREACH! ${res.effectiveDelta}`, centerX, centerY - 30, '#ef4444');
			}
		}

		// Floating texts
		for (let i = floatingTexts.length - 1; i >= 0; i--) {
			const ft = floatingTexts[i];
			ft.y -= 1.0;
			ft.alpha -= 0.025;
			if (ft.alpha <= 0) {
				floatingTexts.splice(i, 1);
				continue;
			}
			ctx.save();
			ctx.fillStyle = ft.color;
			ctx.globalAlpha = ft.alpha;
			ctx.font = 'bold 14px monospace';
			ctx.textAlign = 'center';
			ctx.fillText(ft.text, ft.x, ft.y);
			ctx.restore();
		}

		animId = requestAnimationFrame(loop);
	}

	onMount(() => {
		animId = requestAnimationFrame(loop);
	});

	onDestroy(() => {
		if (animId) cancelAnimationFrame(animId);
	});
</script>

<div class="defense-arena">
	<canvas
		bind:this={canvas}
		width={420}
		height={320}
		onclick={handleCanvasClick}
	></canvas>

	<div class="defense-hint">
		<span>TAP / CLICK INCOMING VOID RIFTS TO INTERCEPT BEFORE THEY BREACH THE SPIRE WARD</span>
	</div>
</div>

<style>
	.defense-arena {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
	}

	canvas {
		border-radius: 12px;
		border: 1px solid rgba(239, 68, 68, 0.3);
		box-shadow: 0 0 25px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(239, 68, 68, 0.1);
		max-width: 100%;
		height: auto;
		cursor: crosshair;
	}

	.defense-hint {
		font-family: var(--font-title);
		font-size: 0.75rem;
		color: var(--text-secondary);
		text-align: center;
		font-weight: 700;
	}
</style>
