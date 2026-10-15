<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { minigameManager } from '#lib/stores/minigameStore.svelte';
	import { sfx } from '#lib/audio/sfx';

	interface Bubble {
		id: number;
		y: number; // 300 down to 0
		xOffset: number;
		radius: number;
		color: string;
		type: 'pure' | 'volatile';
		element: 'fire' | 'ice' | 'lightning';
		popped?: boolean;
	}

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let animId: number | null = null;

	let bubbles: Bubble[] = [];
	let bubbleId = 1;
	let spawnTimer = 0;
	let floatingTexts: { id: number; text: string; x: number; y: number; color: string; alpha: number }[] = [];
	let textCounter = 1;

	const diff = minigameManager.selectedDifficulty;
	const riseSpeed = diff === 'abyssal' ? 3.4 : diff === 'adept' ? 2.4 : 1.6;
	const spawnRate = diff === 'abyssal' ? 45 : diff === 'adept' ? 60 : 75;

	// Distillation sweet spot range in Y: between 40 and 90
	const sweetMinY = 45;
	const sweetMaxY = 95;

	function triggerDistill() {
		// Find closest unpopped bubble in sweet spot
		let closestIdx = -1;
		let closestDist = 999;

		for (let i = 0; i < bubbles.length; i++) {
			const b = bubbles[i];
			if (!b.popped) {
				const centerSweet = (sweetMinY + sweetMaxY) / 2;
				const dist = Math.abs(b.y - centerSweet);
				if (dist < closestDist) {
					closestDist = dist;
					closestIdx = i;
				}
			}
		}

		if (closestIdx !== -1 && closestDist < 45) {
			const b = bubbles[closestIdx];
			b.popped = true;

			if (b.type === 'volatile') {
				// Hit a corrupt bubble!
				const res = minigameManager.addScore(-35);
				sfx.playMinigameMiss();
				addFloat(`💥 EXPLOSION! ${res.effectiveDelta}`, 210, b.y, '#ef4444');
			} else if (closestDist < 16) {
				// Perfect distillation
				const res = minigameManager.addScore(30);
				sfx.playRuneChime(b.element);
				addFloat(`✨ PERFECT! +${res.effectiveDelta}`, 210, b.y, '#10b981');
			} else {
				// Fair distillation
				const res = minigameManager.addScore(12);
				sfx.playGold();
				addFloat(`GOOD +${res.effectiveDelta}`, 210, b.y, '#38bdf8');
			}
		} else {
			// Dry click penalty
			const res = minigameManager.addScore(-8);
			sfx.playSlash();
			addFloat(`MISFIRE ${res.effectiveDelta}`, 210, 70, '#f97316');
		}
	}

	function addFloat(text: string, x: number, y: number, color: string) {
		floatingTexts.push({ id: textCounter++, text, x, y, color, alpha: 1.0 });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.code === 'Space') {
			e.preventDefault();
			triggerDistill();
		}
	}

	function loop() {
		if (!canvas) return;
		ctx = canvas.getContext('2d');
		if (!ctx) return;

		const width = canvas.width;
		const height = canvas.height;
		ctx.clearRect(0, 0, width, height);

		// Alembic glass tube background
		const grad = ctx.createLinearGradient(0, 0, width, 0);
		grad.addColorStop(0, 'rgba(6, 15, 25, 0.9)');
		grad.addColorStop(0.5, 'rgba(15, 30, 45, 0.7)');
		grad.addColorStop(1, 'rgba(6, 15, 25, 0.9)');
		ctx.fillStyle = grad;
		ctx.fillRect(80, 0, width - 160, height);

		// Distillation Sweet Spot Zone
		ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
		ctx.strokeStyle = '#10b981';
		ctx.lineWidth = 2;
		ctx.setLineDash([4, 4]);
		ctx.strokeRect(80, sweetMinY, width - 160, sweetMaxY - sweetMinY);
		ctx.fillRect(80, sweetMinY, width - 160, sweetMaxY - sweetMinY);
		ctx.setLineDash([]);

		// Label sweet spot
		ctx.font = 'bold 11px sans-serif';
		ctx.fillStyle = '#34d399';
		ctx.textAlign = 'center';
		ctx.fillText('⚡ DISTILLATION ZONE ⚡', width / 2, sweetMinY + 28);

		// Spawn bubbles
		spawnTimer++;
		if (spawnTimer >= spawnRate) {
			spawnTimer = 0;
			const isVolatile = diff === 'abyssal' ? Math.random() < 0.35 : diff === 'adept' ? Math.random() < 0.2 : false;
			const elems: ('fire' | 'ice' | 'lightning')[] = ['fire', 'ice', 'lightning'];
			const element = elems[Math.floor(Math.random() * elems.length)];
			const color = isVolatile
				? '#7e22ce'
				: element === 'fire'
				? '#ef4444'
				: element === 'ice'
				? '#06b6d4'
				: '#eab308';

			bubbles.push({
				id: bubbleId++,
				y: height + 20,
				xOffset: (Math.random() - 0.5) * 80,
				radius: isVolatile ? 18 : 15,
				color,
				type: isVolatile ? 'volatile' : 'pure',
				element
			});
		}

		// Update & Draw bubbles
		for (let i = bubbles.length - 1; i >= 0; i--) {
			const b = bubbles[i];
			b.y -= riseSpeed;

			// Draw bubble
			if (!b.popped) {
				const bx = width / 2 + b.xOffset;
				ctx.save();
				ctx.shadowColor = b.color;
				ctx.shadowBlur = 12;
				ctx.fillStyle = b.color;
				ctx.beginPath();
				ctx.arc(bx, b.y, b.radius, 0, Math.PI * 2);
				ctx.fill();

				// Bubble gleam
				ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
				ctx.beginPath();
				ctx.arc(bx - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.3, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			}

			// Escaped unpopped pure bubble
			if (!b.popped && b.y < sweetMinY - 20) {
				b.popped = true;
				if (b.type === 'pure') {
					const res = minigameManager.addScore(-15);
					sfx.playMinigameMiss();
					addFloat(`ESCAPED ${res.effectiveDelta}`, width / 2, 35, '#ef4444');
				}
			}

			if (b.y < -30) {
				bubbles.splice(i, 1);
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
		window.addEventListener('keydown', handleKeydown);
		animId = requestAnimationFrame(loop);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
		if (animId) cancelAnimationFrame(animId);
	});
</script>

<div class="brew-arena">
	<canvas bind:this={canvas} width={420} height={340}></canvas>

	<div class="brew-controls">
		<button class="btn btn-primary distill-btn" onclick={triggerDistill}>
			<span>🧪 DISTILL VAPOR [SPACE] 🧪</span>
		</button>
	</div>
</div>

<style>
	.brew-arena {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
	}

	canvas {
		border-radius: 12px;
		border: 1px solid rgba(16, 185, 129, 0.25);
		box-shadow: 0 0 25px rgba(0, 0, 0, 0.7), inset 0 0 20px rgba(16, 185, 129, 0.1);
		max-width: 100%;
		height: auto;
		background: #030712;
	}

	.brew-controls {
		width: 100%;
		max-width: 420px;
	}

	.distill-btn {
		width: 100%;
		padding: 0.75rem;
		font-size: 0.95rem;
		font-weight: 700;
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		border-color: #10b981;
		box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
	}
</style>
