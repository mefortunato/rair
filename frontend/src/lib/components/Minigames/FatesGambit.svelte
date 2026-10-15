<script lang="ts">
	import { onMount } from 'svelte';
	import { minigameManager } from '#lib/stores/minigameStore.svelte';
	import { sfx } from '#lib/audio/sfx';

	interface Card {
		id: number;
		value: number;
		hidden?: boolean;
	}

	const diff = minigameManager.selectedDifficulty;
	const handLimit = diff === 'abyssal' ? 28 : diff === 'adept' ? 25 : 22;
	const maxCardVal = diff === 'abyssal' ? 22 : diff === 'adept' ? 14 : 8;

	let cardIdCounter = 1;
	let playerHand = $state<Card[]>([]);
	let dealerHand = $state<Card[]>([]);
	let roundOver = $state(false);
	let roundResult = $state<string | null>(null);
	let handsPlayed = $state(0);
	let wins = $state(0);
	let losses = $state(0);

	function drawCardVal(): number {
		if (diff === 'abyssal') {
			// Higher probability of larger cards (high variance)
			if (Math.random() < 0.6) {
				return Math.floor(Math.random() * (maxCardVal - 10)) + 11; // 11 to 22
			}
			return Math.floor(Math.random() * 10) + 1; // 1 to 10
		} else if (diff === 'adept') {
			if (Math.random() < 0.45) {
				return Math.floor(Math.random() * (maxCardVal - 7)) + 8; // 8 to 14
			}
			return Math.floor(Math.random() * 7) + 1; // 1 to 7
		} else {
			// Novice: mostly small cards
			return Math.floor(Math.random() * maxCardVal) + 1; // 1 to 8
		}
	}

	function calculateHandTotal(hand: Card[], ignoreHidden: boolean = false): number {
		return hand
			.filter((c) => !ignoreHidden || !c.hidden)
			.reduce((sum, c) => sum + c.value, 0);
	}

	let playerTotal = $derived(calculateHandTotal(playerHand));
	let dealerVisibleTotal = $derived(calculateHandTotal(dealerHand, !roundOver));

	function startNewHand() {
		roundOver = false;
		roundResult = null;
		playerHand = [
			{ id: cardIdCounter++, value: drawCardVal() },
			{ id: cardIdCounter++, value: drawCardVal() }
		];
		dealerHand = [
			{ id: cardIdCounter++, value: drawCardVal() },
			{ id: cardIdCounter++, value: drawCardVal(), hidden: true }
		];
		sfx.playReroll();
	}

	function playerHit() {
		if (roundOver) return;
		const newCard: Card = { id: cardIdCounter++, value: drawCardVal() };
		playerHand.push(newCard);
		sfx.playSlash();

		const total = calculateHandTotal(playerHand);
		if (total > handLimit) {
			// Bust!
			handleBust();
		} else if (total === handLimit) {
			// Exact limit hit! Auto stand
			playerStand();
		}
	}

	function handleBust() {
		roundOver = true;
		dealerHand.forEach((c) => (c.hidden = false));
		losses++;
		handsPlayed++;
		const penalty = diff === 'abyssal' ? -50 : diff === 'adept' ? -35 : -25;
		const res = minigameManager.addScore(penalty);
		roundResult = `💥 BUST! Exceeded Limit (${playerTotal} > ${handLimit}) [${res.effectiveDelta} pts]`;
		sfx.playMinigameMiss();
	}

	function playerStand() {
		if (roundOver) return;
		roundOver = true;
		dealerHand.forEach((c) => (c.hidden = false));

		// Dealer AI draws until at least handLimit - 4
		const dealerTarget = handLimit - 4;
		while (calculateHandTotal(dealerHand) < dealerTarget) {
			dealerHand.push({ id: cardIdCounter++, value: drawCardVal() });
		}

		const pTotal = calculateHandTotal(playerHand);
		const dTotal = calculateHandTotal(dealerHand);
		handsPlayed++;

		if (dTotal > handLimit) {
			// Dealer busts, player wins!
			wins++;
			const reward = diff === 'abyssal' ? 65 : diff === 'adept' ? 45 : 30;
			const res = minigameManager.addScore(reward);
			roundResult = `✨ DEALER BUSTS (${dTotal})! You win! [+${res.effectiveDelta} pts]`;
			sfx.playMinigameSuccess();
		} else if (pTotal > dTotal) {
			// Player higher than dealer
			wins++;
			const exactBonus = pTotal === handLimit ? 20 : 0;
			const baseReward = diff === 'abyssal' ? 55 : diff === 'adept' ? 40 : 25;
			const res = minigameManager.addScore(baseReward + exactBonus);
			roundResult = `🏆 VICTORY! (${pTotal} vs ${dTotal}) [+${res.effectiveDelta} pts]`;
			sfx.playMinigameSuccess();
		} else if (pTotal < dTotal) {
			// Dealer wins
			losses++;
			const penalty = diff === 'abyssal' ? -45 : diff === 'adept' ? -30 : -20;
			const res = minigameManager.addScore(penalty);
			roundResult = `💀 DEALER WINS (${dTotal} vs ${pTotal}) [${res.effectiveDelta} pts]`;
			sfx.playMinigameMiss();
		} else {
			// Push
			roundResult = `🤝 STALEMATE PUSH (${pTotal} vs ${dTotal}) [0 pts]`;
		}
	}

	onMount(() => {
		startNewHand();
	});
</script>

<div class="gambit-arena">
	<!-- Table Header / Stats -->
	<div class="table-info">
		<div class="info-pill">
			<span class="label">HAND LIMIT:</span>
			<span class="val font-mono">{handLimit}</span>
		</div>
		<div class="info-pill">
			<span class="label">MAX CARD:</span>
			<span class="val font-mono">+{maxCardVal}</span>
		</div>
		<div class="info-pill">
			<span class="label">RECORD:</span>
			<span class="val font-mono text-cyan">{wins}W / {losses}L</span>
		</div>
	</div>

	<!-- Dealer Area -->
	<div class="hand-row dealer-row">
		<div class="row-header">
			<span class="dealer-title">SHADOW DEALER</span>
			<span class="total-badge {roundOver && dealerVisibleTotal > handLimit ? 'bust' : ''}">
				Score: {dealerVisibleTotal}
			</span>
		</div>
		<div class="cards-deck">
			{#each dealerHand as card (card.id)}
				<div class="gambit-card {card.hidden ? 'hidden-card' : ''}">
					{#if card.hidden}
						<span class="card-back-icon">🔮</span>
					{:else}
						<span class="card-val font-mono">{card.value}</span>
						<span class="card-suit">♠</span>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Arena Center Felt Divider -->
	<div class="table-felt">
		{#if roundResult}
			<div class="round-banner {roundResult.includes('VICTORY') || roundResult.includes('win') ? 'win' : roundResult.includes('PUSH') ? 'push' : 'loss'}">
				{roundResult}
			</div>
		{:else}
			<div class="felt-line">
				<span>CHOOSE YOUR GAMBIT</span>
			</div>
		{/if}
	</div>

	<!-- Player Area -->
	<div class="hand-row player-row">
		<div class="row-header">
			<span class="player-title">YOUR HAND</span>
			<span class="total-badge {playerTotal > handLimit ? 'bust' : playerTotal === handLimit ? 'exact' : ''}">
				Total: {playerTotal} / {handLimit}
			</span>
		</div>
		<div class="cards-deck">
			{#each playerHand as card (card.id)}
				<div class="gambit-card player-card">
					<span class="card-val font-mono">{card.value}</span>
					<span class="card-suit">♦</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Player Action Controls -->
	<div class="gambit-controls">
		{#if !roundOver}
			<button class="btn btn-secondary action-btn" onclick={playerHit}>
				<span>🃏 DRAW CARD (HIT)</span>
			</button>
			<button class="btn btn-primary action-btn hold-btn" onclick={playerStand}>
				<span>🛡️ HOLD & REVEAL ({playerTotal})</span>
			</button>
		{:else}
			<button class="btn btn-primary action-btn next-btn" onclick={startNewHand}>
				<span>✨ DEAL NEXT HAND ✨</span>
			</button>
		{/if}
	</div>
</div>

<style>
	.gambit-arena {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		width: 100%;
		max-width: 440px;
		background: radial-gradient(circle at 50% 50%, rgba(15, 30, 25, 0.75) 0%, rgba(5, 12, 10, 0.95) 100%);
		border: 1px solid rgba(16, 185, 129, 0.25);
		border-radius: 14px;
		padding: 1rem;
		box-shadow: 0 0 25px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(16, 185, 129, 0.1);
	}

	.table-info {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.info-pill {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: rgba(0, 0, 0, 0.4);
		padding: 0.25rem 0.6rem;
		border-radius: 6px;
		border: 1px solid var(--border-subtle);
		font-size: 0.75rem;
	}

	.info-pill .label {
		color: var(--text-muted);
		font-weight: 700;
	}

	.info-pill .val {
		color: #ffffff;
		font-weight: 800;
	}

	.hand-row {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.row-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.dealer-title,
	.player-title {
		font-family: var(--font-title);
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text-secondary);
		letter-spacing: 0.05em;
	}

	.total-badge {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		font-weight: 700;
		padding: 0.15rem 0.5rem;
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid var(--border-subtle);
		color: #ffffff;
	}

	.total-badge.bust {
		background: rgba(239, 68, 68, 0.2);
		border-color: #ef4444;
		color: #ef4444;
	}

	.total-badge.exact {
		background: rgba(255, 210, 0, 0.2);
		border-color: #ffd200;
		color: #ffd200;
	}

	.cards-deck {
		display: flex;
		gap: 0.45rem;
		flex-wrap: wrap;
		min-height: 68px;
		align-items: center;
	}

	.gambit-card {
		width: 48px;
		height: 68px;
		background: #ffffff;
		border-radius: 6px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: #0f172a;
		font-weight: 800;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.6);
		animation: popIn 0.2s ease-out;
	}

	.player-card {
		background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
		color: #b91c1c;
		border: 1px solid rgba(255, 210, 0, 0.5);
	}

	.hidden-card {
		background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
		border: 1px solid #6366f1;
		color: #a5b4fc;
	}

	.card-val {
		font-size: 1.15rem;
		line-height: 1;
	}

	.card-suit {
		font-size: 0.75rem;
	}

	.card-back-icon {
		font-size: 1.3rem;
	}

	.table-felt {
		min-height: 38px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.round-banner {
		padding: 0.4rem 0.8rem;
		border-radius: 8px;
		font-size: 0.85rem;
		font-weight: 700;
		text-align: center;
		animation: pulseGlow 0.3s ease-out;
		width: 100%;
	}

	.round-banner.win {
		background: rgba(16, 185, 129, 0.2);
		border: 1px solid #10b981;
		color: #34d399;
	}

	.round-banner.loss {
		background: rgba(239, 68, 68, 0.2);
		border: 1px solid #ef4444;
		color: #f87171;
	}

	.round-banner.push {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.3);
		color: #ffffff;
	}

	.felt-line {
		color: rgba(255, 255, 255, 0.25);
		font-size: 0.7rem;
		letter-spacing: 0.15em;
		font-weight: 700;
	}

	.gambit-controls {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.action-btn {
		flex: 1;
		padding: 0.65rem 0.5rem;
		font-size: 0.85rem;
		font-weight: 700;
	}

	.hold-btn {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		border-color: #10b981;
	}

	.next-btn {
		background: linear-gradient(135deg, #ffd200 0%, #f59e0b 100%);
		color: #000000;
		border-color: #ffd200;
	}

	@keyframes popIn {
		from {
			transform: scale(0.7) translateY(10px);
			opacity: 0;
		}
		to {
			transform: scale(1) translateY(0);
			opacity: 1;
		}
	}
</style>
