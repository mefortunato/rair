<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { minigameManager } from '#lib/stores/minigameStore.svelte';
	import { sfx } from '#lib/audio/sfx';

	let animId: number | null = null;

	const diff = minigameManager.selectedDifficulty;
	const barHeight = diff === 'abyssal' ? 18 : diff === 'adept' ? 26 : 35; // % of track
	const fishSpeed = diff === 'abyssal' ? 1.6 : diff === 'adept' ? 1.1 : 0.7;

	let fishPos = $state(50); // 0 (bottom) to 100 (top)
	let fishTarget = 50;
	let fishChangeTimer = 0;

	let barPos = $state(40); // 0 to 100
	let barVelocity = 0;
	let isReeling = $state(false);

	let catchProgress = $state(30); // 0 to 100%
	let isHooked = $state(true);
	let fishRarity = $state<'astral' | 'leviathan' | 'void'>('astral');
	let feedbackMsg = $state<string | null>(null);

	function hookNextFish() {
		isHooked = true;
		catchProgress = 35;
		fishPos = 50;
		fishTarget = Math.random() * 80 + 10;
		const rand = Math.random();
		fishRarity = rand < 0.25 ? 'leviathan' : rand < 0.6 ? 'void' : 'astral';
		feedbackMsg = `🎣 An ancient ${fishRarity.toUpperCase()} hooked! Keep tension in the green zone!`;
		sfx.playSlash();
	}

	function handlePointerDown() {
		isReeling = true;
	}

	function handlePointerUp() {
		isReeling = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.code === 'Space') {
			e.preventDefault();
			isReeling = true;
		}
	}

	function handleKeyup(e: KeyboardEvent) {
		if (e.code === 'Space') {
			isReeling = false;
		}
	}

	function loop() {
		if (!isHooked) {
			animId = requestAnimationFrame(loop);
			return;
		}

		// Move fish towards fishTarget
		fishChangeTimer++;
		if (fishChangeTimer >= (diff === 'abyssal' ? 40 : 70)) {
			fishChangeTimer = 0;
			fishTarget = Math.random() * 80 + 10;
		}

		const fishDiff = fishTarget - fishPos;
		fishPos += Math.sign(fishDiff) * Math.min(Math.abs(fishDiff), fishSpeed);

		// Bar physics: reel lifts, gravity pulls
		if (isReeling) {
			barVelocity += 0.45;
		} else {
			barVelocity -= 0.4;
		}
		barVelocity = Math.max(-2.5, Math.min(2.5, barVelocity));
		barPos += barVelocity;

		// Clamp barPos
		if (barPos < 0) {
			barPos = 0;
			barVelocity = 0;
		} else if (barPos > 100 - barHeight) {
			barPos = 100 - barHeight;
			barVelocity = 0;
		}

		// Check if fish is inside green tension bar
		const inZone = fishPos >= barPos && fishPos <= barPos + barHeight;

		if (inZone) {
			catchProgress += diff === 'abyssal' ? 0.35 : 0.45;
			if (catchProgress >= 100) {
				// Landed the catch!
				isHooked = false;
				const baseScore = fishRarity === 'leviathan' ? 85 : fishRarity === 'void' ? 55 : 35;
				const res = minigameManager.addScore(baseScore);
				sfx.playAscension();
				feedbackMsg = `🏆 REELED IN ${fishRarity.toUpperCase()}! +${res.effectiveDelta} pts`;
				setTimeout(hookNextFish, 1800);
			}
		} else {
			catchProgress -= diff === 'abyssal' ? 0.4 : 0.25;
			if (catchProgress <= 0) {
				// Line snapped!
				isHooked = false;
				const penalty = diff === 'abyssal' ? -50 : diff === 'adept' ? -35 : -20;
				const res = minigameManager.addScore(penalty);
				sfx.playMinigameMiss();
				feedbackMsg = `❌ LINE SNAPPED! ${res.effectiveDelta} pts`;
				setTimeout(hookNextFish, 1800);
			}
		}

		animId = requestAnimationFrame(loop);
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		window.addEventListener('keyup', handleKeyup);
		hookNextFish();
		animId = requestAnimationFrame(loop);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
		window.removeEventListener('keyup', handleKeyup);
		if (animId) cancelAnimationFrame(animId);
	});
</script>

<div class="angler-arena">
	<!-- Angler Header -->
	<div class="angler-header">
		<span class="fish-icon">🎣</span>
		<div class="angler-titles">
			<h4>ETHEREAL VOID ANGLER</h4>
			<p>{feedbackMsg || 'Hold [Reel] to balance the tension gauge over the fish'}</p>
		</div>
	</div>

	<!-- Tension Reel Track -->
	<div class="reel-container">
		<!-- Vertical Track -->
		<div class="tension-track">
			<!-- Green Tension Catch Bar -->
			<div
				class="tension-bar"
				style="bottom: {barPos}%; height: {barHeight}%;"
			>
				<span class="bar-label">REEL ZONE</span>
			</div>

			<!-- Moving Fish Target -->
			<div class="fish-marker" style="bottom: {fishPos}%;">
				<span class="swimming-fish">
					{fishRarity === 'leviathan' ? '🐋' : fishRarity === 'void' ? '🦑' : '🐟'}
				</span>
			</div>
		</div>

		<!-- Catch Progress Gauge -->
		<div class="catch-progress-column">
			<span class="progress-title">CATCH</span>
			<div class="progress-meter">
				<div class="progress-fill" style="height: {catchProgress}%;"></div>
			</div>
			<span class="progress-pct font-mono">{Math.round(catchProgress)}%</span>
		</div>
	</div>

	<!-- Controls -->
	<div class="angler-actions">
		<button
			class="btn btn-primary reel-btn {isReeling ? 'active-reel' : ''}"
			onpointerdown={handlePointerDown}
			onpointerup={handlePointerUp}
		>
			<span>⚡ {isReeling ? 'REELING TENSION...' : 'HOLD TO REEL [SPACE]'} ⚡</span>
		</button>
	</div>
</div>

<style>
	.angler-arena {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		width: 100%;
		max-width: 440px;
		background: radial-gradient(circle at 50% 50%, rgba(6, 40, 55, 0.75) 0%, rgba(2, 12, 20, 0.95) 100%);
		border: 1px solid rgba(6, 182, 212, 0.3);
		border-radius: 14px;
		padding: 1.25rem;
		box-shadow: 0 0 25px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(6, 182, 212, 0.1);
	}

	.angler-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-align: left;
	}

	.fish-icon {
		font-size: 2rem;
	}

	.angler-titles h4 {
		font-family: var(--font-title);
		color: #ffffff;
		font-size: 1rem;
		margin: 0;
	}

	.angler-titles p {
		color: var(--text-secondary);
		font-size: 0.75rem;
		margin: 0;
	}

	.reel-container {
		display: flex;
		gap: 1.5rem;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 240px;
	}

	.tension-track {
		position: relative;
		width: 70px;
		height: 100%;
		background: rgba(15, 23, 42, 0.8);
		border: 2px solid rgba(6, 182, 212, 0.4);
		border-radius: 10px;
		overflow: hidden;
		box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.8);
	}

	.tension-bar {
		position: absolute;
		left: 0;
		right: 0;
		background: rgba(16, 185, 129, 0.35);
		border: 2px solid #10b981;
		box-shadow: 0 0 15px rgba(16, 185, 129, 0.6), inset 0 0 10px rgba(16, 185, 129, 0.3);
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.bar-label {
		font-size: 0.55rem;
		font-weight: 800;
		color: #ffffff;
		letter-spacing: 0.1em;
	}

	.fish-marker {
		position: absolute;
		left: 50%;
		transform: translate(-50%, 50%);
		font-size: 1.5rem;
		transition: bottom 0.1s linear;
		z-index: 2;
	}

	.catch-progress-column {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
	}

	.progress-title {
		font-size: 0.65rem;
		font-weight: 800;
		color: var(--text-muted);
		letter-spacing: 0.1em;
	}

	.progress-meter {
		width: 22px;
		height: 180px;
		background: rgba(0, 0, 0, 0.6);
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		display: flex;
		flex-direction: column-reverse;
		overflow: hidden;
		padding: 2px;
	}

	.progress-fill {
		width: 100%;
		background: linear-gradient(0deg, #06b6d4 0%, #10b981 100%);
		border-radius: 8px;
		box-shadow: 0 0 10px rgba(6, 182, 212, 0.6);
		transition: height 0.1s ease;
	}

	.progress-pct {
		font-size: 0.75rem;
		font-weight: 800;
		color: #ffffff;
	}

	.angler-actions {
		width: 100%;
	}

	.reel-btn {
		width: 100%;
		padding: 0.8rem;
		font-size: 0.95rem;
		font-weight: 800;
		background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
		border-color: #06b6d4;
		box-shadow: 0 0 20px rgba(6, 182, 212, 0.4);
		user-select: none;
	}

	.reel-btn.active-reel {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		border-color: #10b981;
		box-shadow: 0 0 25px rgba(16, 185, 129, 0.6);
	}
</style>
