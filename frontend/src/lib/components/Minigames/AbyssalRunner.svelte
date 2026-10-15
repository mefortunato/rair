<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { minigameManager } from '#lib/stores/minigameStore.svelte';
	import { sfx } from '#lib/audio/sfx';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let animId: number | null = null;

	// Lanes: -1 (Left), 0 (Center), 1 (Right)
	let currentLane = $state(0);
	let targetLane = 0;
	let playerX = 0; // smoothly animates to currentLane * laneWidth

	interface Obstacle {
		id: number;
		lane: number;
		z: number; // distance away: 1000 down to 0
		type: 'gem' | 'crystal' | 'spike' | 'miasma';
		collected?: boolean;
	}

	let obstacles: Obstacle[] = [];
	let nextObstacleId = 1;
	let spawnTimer = 0;
	let floatingTexts: { id: number; text: string; x: number; y: number; color: string; alpha: number }[] = [];
	let textId = 1;

	// Difficulty speed factors
	const difficulty = minigameManager.selectedDifficulty;
	const speed = difficulty === 'abyssal' ? 14 : difficulty === 'adept' ? 9.5 : 6.5;
	const spawnRate = difficulty === 'abyssal' ? 22 : difficulty === 'adept' ? 32 : 45;

	function moveLane(dir: number) {
		const next = Math.max(-1, Math.min(1, currentLane + dir));
		if (next !== currentLane) {
			currentLane = next;
			sfx.playSlash();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
			moveLane(-1);
		} else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
			moveLane(1);
		}
	}

	function addFloatingText(text: string, x: number, y: number, color: string) {
		floatingTexts.push({ id: textId++, text, x, y, color, alpha: 1.0 });
	}

	function gameLoop() {
		if (!canvas) return;
		ctx = canvas.getContext('2d');
		if (!ctx) return;

		const width = canvas.width;
		const height = canvas.height;
		const laneWidth = width * 0.28;
		const centerX = width / 2;

		// Smooth player movement
		const targetX = currentLane * laneWidth;
		playerX += (targetX - playerX) * 0.25;

		// Clear
		ctx.clearRect(0, 0, width, height);

		// Perspective background causeway
		const grad = ctx.createLinearGradient(0, 0, 0, height);
		grad.addColorStop(0, '#060a17');
		grad.addColorStop(1, '#0f172a');
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, width, height);

		// Draw 3 lanes with perspective grid
		const topY = 40;
		const botY = height - 20;

		// Draw lane divider lines
		[-0.5, 0.5].forEach((laneDiv) => {
			if (!ctx) return;
			ctx.strokeStyle = 'rgba(0, 210, 255, 0.2)';
			ctx.lineWidth = 2;
			ctx.setLineDash([8, 8]);
			ctx.beginPath();
			ctx.moveTo(centerX + laneDiv * (laneWidth * 0.35), topY);
			ctx.lineTo(centerX + laneDiv * laneWidth, botY);
			ctx.stroke();
			ctx.setLineDash([]);
		});

		// Spawn obstacles
		spawnTimer++;
		if (spawnTimer >= spawnRate) {
			spawnTimer = 0;
			const lane = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
			const isGood = Math.random() < 0.6;
			const type: Obstacle['type'] = isGood
				? Math.random() < 0.3 ? 'crystal' : 'gem'
				: Math.random() < 0.3 ? 'miasma' : 'spike';

			obstacles.push({
				id: nextObstacleId++,
				lane,
				z: 600,
				type
			});
		}

		// Update & draw obstacles
		for (let i = obstacles.length - 1; i >= 0; i--) {
			const obs = obstacles[i];
			obs.z -= speed;

			// Perspective projection
			const progress = 1 - obs.z / 600; // 0 (far) to 1 (near)
			const scale = 0.25 + progress * 0.75;
			const laneSpread = laneWidth * (0.35 + progress * 0.65);
			const obsX = centerX + obs.lane * laneSpread;
			const obsY = topY + progress * (botY - topY);

			// Draw obstacle
			if (!obs.collected && progress > 0) {
				ctx.save();
				ctx.translate(obsX, obsY);
				ctx.scale(scale, scale);

				if (obs.type === 'gem') {
					ctx.fillStyle = '#00d2ff';
					ctx.shadowColor = '#00d2ff';
					ctx.shadowBlur = 10;
					ctx.beginPath();
					ctx.moveTo(0, -14);
					ctx.lineTo(12, 0);
					ctx.lineTo(0, 14);
					ctx.lineTo(-12, 0);
					ctx.closePath();
					ctx.fill();
				} else if (obs.type === 'crystal') {
					ctx.fillStyle = '#ffd200';
					ctx.shadowColor = '#ffd200';
					ctx.shadowBlur = 15;
					ctx.beginPath();
					ctx.arc(0, 0, 15, 0, Math.PI * 2);
					ctx.fill();
					ctx.fillStyle = '#ffffff';
					ctx.font = 'bold 12px sans-serif';
					ctx.fillText('✨', -7, 4);
				} else if (obs.type === 'spike') {
					ctx.fillStyle = '#ef4444';
					ctx.shadowColor = '#ef4444';
					ctx.shadowBlur = 10;
					ctx.beginPath();
					ctx.moveTo(-16, 12);
					ctx.lineTo(0, -16);
					ctx.lineTo(16, 12);
					ctx.closePath();
					ctx.fill();
				} else if (obs.type === 'miasma') {
					ctx.fillStyle = 'rgba(168, 85, 247, 0.85)';
					ctx.shadowColor = '#a855f7';
					ctx.shadowBlur = 15;
					ctx.beginPath();
					ctx.arc(0, 0, 16, 0, Math.PI * 2);
					ctx.fill();
					ctx.fillStyle = '#ffffff';
					ctx.font = 'bold 12px sans-serif';
					ctx.fillText('☠️', -7, 4);
				}
				ctx.restore();
			}

			// Collision check when near player (z < 60)
			if (!obs.collected && obs.z <= 60 && obs.z >= -20) {
				if (obs.lane === currentLane) {
					obs.collected = true;
					if (obs.type === 'gem') {
						const res = minigameManager.addScore(25);
						sfx.playGold();
						addFloatingText(`+${res.effectiveDelta}`, centerX + playerX, botY - 40, '#00d2ff');
					} else if (obs.type === 'crystal') {
						const res = minigameManager.addScore(50);
						sfx.playPerkSelect();
						addFloatingText(`+${res.effectiveDelta} NOVA!`, centerX + playerX, botY - 40, '#ffd200');
					} else if (obs.type === 'spike') {
						const res = minigameManager.addScore(-30);
						sfx.playMinigameMiss();
						addFloatingText(`${res.effectiveDelta}`, centerX + playerX, botY - 40, '#ef4444');
					} else if (obs.type === 'miasma') {
						const res = minigameManager.addScore(-45);
						sfx.playMinigameMiss();
						addFloatingText(`${res.effectiveDelta} CURSE!`, centerX + playerX, botY - 40, '#a855f7');
					}
				}
			}

			// Despawn past player
			if (obs.z < -40) {
				obstacles.splice(i, 1);
			}
		}

		// Draw Player Avatar
		ctx.save();
		ctx.translate(centerX + playerX, botY - 20);

		// Glow trail
		ctx.fillStyle = 'rgba(0, 210, 255, 0.4)';
		ctx.shadowColor = '#00d2ff';
		ctx.shadowBlur = 20;
		ctx.beginPath();
		ctx.ellipse(0, 12, 22, 8, 0, 0, Math.PI * 2);
		ctx.fill();

		// Character icon
		ctx.font = '32px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('🏃', 0, 6);
		ctx.restore();

		// Draw Floating Texts
		for (let i = floatingTexts.length - 1; i >= 0; i--) {
			const ft = floatingTexts[i];
			ft.y -= 1.2;
			ft.alpha -= 0.025;
			if (ft.alpha <= 0) {
				floatingTexts.splice(i, 1);
				continue;
			}
			ctx.save();
			ctx.fillStyle = ft.color;
			ctx.globalAlpha = ft.alpha;
			ctx.font = 'bold 15px monospace';
			ctx.textAlign = 'center';
			ctx.fillText(ft.text, ft.x, ft.y);
			ctx.restore();
		}

		animId = requestAnimationFrame(gameLoop);
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		animId = requestAnimationFrame(gameLoop);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
		if (animId) cancelAnimationFrame(animId);
	});
</script>

<div class="runner-arena">
	<canvas bind:this={canvas} width={420} height={360}></canvas>

	<!-- Touch/Mouse Lane Controls -->
	<div class="lane-controls">
		<button
			class="lane-btn {currentLane === -1 ? 'active' : ''}"
			onclick={() => moveLane(-1)}
		>
			<span>← LEFT</span>
		</button>
		<button
			class="lane-btn {currentLane === 0 ? 'active' : ''}"
			onclick={() => (currentLane = 0)}
		>
			<span>CENTER</span>
		</button>
		<button
			class="lane-btn {currentLane === 1 ? 'active' : ''}"
			onclick={() => moveLane(1)}
		>
			<span>RIGHT →</span>
		</button>
	</div>
</div>

<style>
	.runner-arena {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
	}

	canvas {
		border-radius: 12px;
		border: 1px solid rgba(0, 210, 255, 0.25);
		box-shadow: 0 0 25px rgba(0, 0, 0, 0.7), inset 0 0 20px rgba(0, 210, 255, 0.1);
		max-width: 100%;
		height: auto;
		background: #030712;
	}

	.lane-controls {
		display: flex;
		gap: 0.5rem;
		width: 100%;
		max-width: 420px;
	}

	.lane-btn {
		flex: 1;
		padding: 0.65rem 0.5rem;
		background: rgba(15, 23, 42, 0.8);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		color: var(--text-secondary);
		font-family: var(--font-title);
		font-size: 0.8rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.lane-btn:hover {
		background: rgba(0, 210, 255, 0.15);
		color: #ffffff;
		border-color: #00d2ff;
	}

	.lane-btn.active {
		background: rgba(0, 210, 255, 0.25);
		color: #00d2ff;
		border-color: #00d2ff;
		box-shadow: 0 0 10px rgba(0, 210, 255, 0.3);
	}
</style>
