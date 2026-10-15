<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { minigameManager } from '#lib/stores/minigameStore.svelte';
	import { sfx } from '#lib/audio/sfx';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let animId: number | null = null;

	const diff = minigameManager.selectedDifficulty;
	const baseSpeed = diff === 'abyssal' ? 4.0 : diff === 'adept' ? 3.0 : 2.2;

	let spark = { x: 80, y: 150, vx: 2, vy: 1 };
	let isTethered = $state(false);

	interface Star {
		x: number;
		y: number;
		radius: number;
		color: string;
	}

	interface Particle {
		x: number;
		y: number;
		type: 'stardust' | 'asteroid';
		radius: number;
		collected?: boolean;
	}

	let stars: Star[] = [
		{ x: 130, y: 140, radius: 26, color: '#ec4899' },
		{ x: 290, y: 160, radius: 24, color: '#8b5cf6' }
	];

	let items: Particle[] = [];
	let spawnTimer = 0;
	let floatingTexts: { id: number; text: string; x: number; y: number; color: string; alpha: number }[] = [];
	let textId = 1;

	function handlePointerDown() {
		isTethered = true;
	}

	function handlePointerUp() {
		isTethered = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.code === 'Space') {
			e.preventDefault();
			isTethered = true;
		}
	}

	function handleKeyup(e: KeyboardEvent) {
		if (e.code === 'Space') {
			isTethered = false;
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
		ctx.clearRect(0, 0, width, height);

		// Deep space background
		ctx.fillStyle = '#030712';
		ctx.fillRect(0, 0, width, height);

		// Find nearest star
		let nearestStar = stars[0];
		let minStarDist = 99999;
		for (const s of stars) {
			const d = Math.hypot(s.x - spark.x, s.y - spark.y);
			if (d < minStarDist) {
				minStarDist = d;
				nearestStar = s;
			}
		}

		// Physics update
		if (isTethered) {
			// Gravity pull toward nearest star
			const dx = nearestStar.x - spark.x;
			const dy = nearestStar.y - spark.y;
			const dist = Math.hypot(dx, dy);

			// Gravitational acceleration (centripetal force)
			const force = 0.22;
			spark.vx += (dx / dist) * force;
			spark.vy += (dy / dist) * force;

			// Draw tether beam
			ctx.strokeStyle = 'rgba(236, 72, 153, 0.6)';
			ctx.lineWidth = 2;
			ctx.setLineDash([4, 4]);
			ctx.beginPath();
			ctx.moveTo(spark.x, spark.y);
			ctx.lineTo(nearestStar.x, nearestStar.y);
			ctx.stroke();
			ctx.setLineDash([]);
		}

		// Clamp speed
		const currentSpeed = Math.hypot(spark.vx, spark.vy);
		if (currentSpeed > baseSpeed * 1.5) {
			spark.vx = (spark.vx / currentSpeed) * baseSpeed * 1.5;
			spark.vy = (spark.vy / currentSpeed) * baseSpeed * 1.5;
		} else if (currentSpeed < baseSpeed) {
			spark.vx = (spark.vx / currentSpeed) * baseSpeed;
			spark.vy = (spark.vy / currentSpeed) * baseSpeed;
		}

		spark.x += spark.vx;
		spark.y += spark.vy;

		// Bounce off canvas boundaries
		if (spark.x < 15) {
			spark.x = 15;
			spark.vx = Math.abs(spark.vx);
		} else if (spark.x > width - 15) {
			spark.x = width - 15;
			spark.vx = -Math.abs(spark.vx);
		}
		if (spark.y < 15) {
			spark.y = 15;
			spark.vy = Math.abs(spark.vy);
		} else if (spark.y > height - 15) {
			spark.y = height - 15;
			spark.vy = -Math.abs(spark.vy);
		}

		// Draw Stars
		for (const star of stars) {
			ctx.save();
			ctx.fillStyle = star.color;
			ctx.shadowColor = star.color;
			ctx.shadowBlur = 20;
			ctx.beginPath();
			ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}

		// Spawn Stardust and Asteroids
		spawnTimer++;
		if (spawnTimer >= 40) {
			spawnTimer = 0;
			const isGood = Math.random() < 0.7;
			items.push({
				x: Math.random() * (width - 40) + 20,
				y: Math.random() * (height - 40) + 20,
				type: isGood ? 'stardust' : 'asteroid',
				radius: isGood ? 7 : 12
			});
		}

		// Update & Draw Items
		for (let i = items.length - 1; i >= 0; i--) {
			const item = items[i];
			if (item.collected) {
				items.splice(i, 1);
				continue;
			}

			// Draw item
			ctx.save();
			if (item.type === 'stardust') {
				ctx.fillStyle = '#ffd200';
				ctx.shadowColor = '#ffd200';
				ctx.shadowBlur = 10;
				ctx.beginPath();
				ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
				ctx.fill();
			} else {
				ctx.fillStyle = '#ef4444';
				ctx.shadowColor = '#ef4444';
				ctx.shadowBlur = 10;
				ctx.beginPath();
				ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.restore();

			// Collision check with spark
			const d = Math.hypot(spark.x - item.x, spark.y - item.y);
			if (d < item.radius + 10) {
				item.collected = true;
				if (item.type === 'stardust') {
					const res = minigameManager.addScore(20);
					sfx.playGold();
					addFloat(`+${res.effectiveDelta}`, item.x, item.y, '#ffd200');
				} else {
					const res = minigameManager.addScore(-30);
					sfx.playMinigameMiss();
					addFloat(`${res.effectiveDelta}`, item.x, item.y, '#ef4444');
				}
			}
		}

		// Draw Player Spark
		ctx.save();
		ctx.translate(spark.x, spark.y);
		ctx.fillStyle = '#00d2ff';
		ctx.shadowColor = '#00d2ff';
		ctx.shadowBlur = 16;
		ctx.beginPath();
		ctx.arc(0, 0, 9, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();

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
		window.addEventListener('keydown', handleKeydown);
		window.addEventListener('keyup', handleKeyup);
		animId = requestAnimationFrame(loop);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
		window.removeEventListener('keyup', handleKeyup);
		if (animId) cancelAnimationFrame(animId);
	});
</script>

<div class="orbit-arena">
	<canvas
		bind:this={canvas}
		width={420}
		height={300}
		onpointerdown={handlePointerDown}
		onpointerup={handlePointerUp}
	></canvas>

	<div class="orbit-hint">
		<span>HOLD [SPACE] OR CLICK TO GRAVITY-TETHER & ORBIT | RELEASE TO SLINGSHOT</span>
	</div>
</div>

<style>
	.orbit-arena {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
	}

	canvas {
		border-radius: 12px;
		border: 1px solid rgba(236, 72, 153, 0.3);
		box-shadow: 0 0 25px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(236, 72, 153, 0.1);
		max-width: 100%;
		height: auto;
		cursor: crosshair;
	}

	.orbit-hint {
		font-family: var(--font-title);
		font-size: 0.75rem;
		color: var(--text-secondary);
		text-align: center;
		font-weight: 700;
	}
</style>
