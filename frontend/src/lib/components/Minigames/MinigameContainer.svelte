<script lang="ts">
	import { minigameManager } from '#lib/stores/minigameStore.svelte';
	import { game } from '#lib/stores/playerStore.svelte';
	import { sfx } from '#lib/audio/sfx';
	import {
		MINIGAME_REGISTRY,
		GAMBLE_STATS_REGISTRY,
		type DifficultyLevel
	} from '#lib/types/minigames';

	import AbyssalRunner from './AbyssalRunner.svelte';
	import FatesGambit from './FatesGambit.svelte';
	import AlchemicalBrewmaster from './AlchemicalBrewmaster.svelte';
	import RuneScribe from './RuneScribe.svelte';
	import VaultCracker from './VaultCracker.svelte';
	import TitansForge from './TitansForge.svelte';
	import CelestialOrbit from './CelestialOrbit.svelte';
	import SpireDefense from './SpireDefense.svelte';
	import AstralAngler from './AstralAngler.svelte';
	import ArcaneDecryption from './ArcaneDecryption.svelte';

	let state = $derived(minigameManager.state);
	let selectedChoice = $derived(minigameManager.selectedChoice);
	let selectedDiff = $derived(minigameManager.selectedDifficulty);
	let projected = $derived(minigameManager.projectedEffect);
	let activeBuffs = $derived(game.player?.active_run?.active_buffs || []);

	function setDifficulty(diff: DifficultyLevel) {
		minigameManager.startMinigame(diff);
	}
</script>

<div class="glass-panel minigames-container">
	<!-- Container Header -->
	<div class="minigames-header">
		<div class="header-titles">
			<span class="category-tag">ASTRAL NEXUS GAMBIT</span>
			<h3 class="minigame-title">Risk & Resonance Trials</h3>
		</div>

		<!-- Status Badge -->
		<div class="status-indicator">
			{#if state === 'COOLDOWN'}
				<span class="state-pill cooldown-pill font-mono">
					⏳ RECHARGING ({minigameManager.cooldownRemaining}s)
				</span>
			{:else if state === 'CHOICE_DRAFT'}
				<span class="state-pill draft-pill">
					✨ DRAFT TRIAL
				</span>
			{:else if state === 'DIFFICULTY_SELECT'}
				<span class="state-pill select-pill">
					⚖️ SELECT RISK TIER
				</span>
			{:else if state === 'PLAYING'}
				<span class="state-pill live-pill animate-pulse">
					⚡ LIVE GAMBIT
				</span>
			{:else if state === 'RESULT_SUMMARY'}
				<span class="state-pill summary-pill">
					🏆 TRIAL COMPLETE
				</span>
			{/if}
		</div>
	</div>

	<!-- Main Body State Switcher -->
	<div class="minigame-body">
		<!-- 1. COOLDOWN STATE -->
		{#if state === 'COOLDOWN'}
			<div class="cooldown-view">
				<div class="recharge-dial">
					<div
						class="dial-spinner"
						style="--pct: {((minigameManager.cooldownDuration - minigameManager.cooldownRemaining) / minigameManager.cooldownDuration) * 100}%;"
					></div>
					<div class="dial-inner">
						<span class="cooldown-number font-mono">{minigameManager.cooldownRemaining}</span>
						<span class="cooldown-sec">SECONDS</span>
					</div>
				</div>

				<div class="cooldown-text">
					<h4>Astral Leylines Recharging...</h4>
					<p>The nexus channels celestial energies. Prepare your strategy for the next trial draft.</p>
				</div>

				<!-- Active Buffs Overview -->
				{#if activeBuffs.length > 0}
					<div class="active-buffs-recap">
						<span class="recap-title">ACTIVE GAMBIT EFFECTS:</span>
						<div class="recap-chips">
							{#each activeBuffs as b (b.id)}
								<div class="recap-chip {b.is_debuff || b.multiplier < 1.0 ? 'debuff' : 'buff'}">
									<span>{b.is_debuff || b.multiplier < 1.0 ? '⚠️' : '✨'}</span>
									<span class="font-mono">{b.multiplier}x {b.name}</span>
									<span class="chip-time font-mono">({Math.ceil(b.time_remaining)}s)</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

		<!-- 2. CHOICE DRAFT STATE -->
		{:else if state === 'CHOICE_DRAFT' && minigameManager.draftChoices}
			<div class="draft-view">
				<div class="draft-heading">
					<h4>Choose Your Trial & Gambled Stat</h4>
					<p>Select which challenge you will face and which combat stat you will wager.</p>
				</div>

				<div class="draft-cards-grid">
					{#each minigameManager.draftChoices as choice, idx}
						{@const gameMeta = MINIGAME_REGISTRY[choice.gameId]}
						{@const statMeta = GAMBLE_STATS_REGISTRY[choice.targetStat]}
						<div class="draft-card" style="--accent: {gameMeta.accentColor};">
							<div class="card-glow"></div>
							<div class="card-header">
								<span class="choice-tag">TRIAL {idx === 0 ? 'ALPHA' : 'BETA'}</span>
								<div class="stat-wager-pill" style="--stat-color: {statMeta.color};">
									<span class="stat-icon">{statMeta.icon}</span>
									<span class="stat-name">{statMeta.label}</span>
								</div>
							</div>

							<div class="game-info">
								<span class="game-icon">{gameMeta.icon}</span>
								<h5 class="game-title">{gameMeta.title}</h5>
								<span class="game-subtitle">{gameMeta.subtitle}</span>
								<p class="game-summary">{gameMeta.summary}</p>
							</div>

							<div class="wager-desc">
								<span class="wager-label">Gambling:</span>
								<span>{statMeta.description}</span>
							</div>

							<button
								class="btn btn-primary select-trial-btn"
								onclick={() => minigameManager.selectChoice(choice)}
							>
								<span>ACCEPT TRIAL →</span>
							</button>
						</div>
					{/each}
				</div>
			</div>

		<!-- 3. DIFFICULTY SELECT STATE -->
		{:else if state === 'DIFFICULTY_SELECT' && selectedChoice}
			{@const gameMeta = MINIGAME_REGISTRY[selectedChoice.gameId]}
			{@const statMeta = GAMBLE_STATS_REGISTRY[selectedChoice.targetStat]}
			<div class="difficulty-view">
				<div class="trial-banner" style="--accent: {gameMeta.accentColor};">
					<span class="banner-icon">{gameMeta.icon}</span>
					<div class="banner-info">
						<h4>{gameMeta.title}</h4>
						<span class="wager-target">
							Gambling: <strong>{statMeta.icon} {statMeta.label}</strong>
						</span>
					</div>
					<button
						class="btn btn-secondary back-btn"
						onclick={() => (minigameManager.state = 'CHOICE_DRAFT')}
					>
						<span>← Change Trial</span>
					</button>
				</div>

				<div class="diff-prompt">
					<h4>Select Risk & Reward Tier</h4>
					<p>Higher difficulties accelerate trial mechanics and bust rates, but offer massive multipliers.</p>
				</div>

				<div class="difficulty-cards-grid">
					<!-- Novice -->
					<button
						class="diff-card novice-card"
						onclick={() => setDifficulty('novice')}
					>
						<span class="diff-badge">NOVICE</span>
						<span class="diff-risk">Low Risk / Safe</span>
						<div class="diff-stats">
							<span class="stat-row text-green">Max Buff: +75% (1.75x)</span>
							<span class="stat-row text-muted">Max Debuff: -15%</span>
							<span class="mult-tag font-mono">1.4x Scale • ~3x Floor Gold</span>
						</div>
						<p class="diff-desc">Gentle speeds, wide hit zones, safe instant gold payout.</p>
					</button>

					<!-- Adept -->
					<button
						class="diff-card adept-card featured"
						onclick={() => setDifficulty('adept')}
					>
						<span class="featured-tag">BALANCED</span>
						<span class="diff-badge">ADEPT</span>
						<span class="diff-risk">Moderate Stakes</span>
						<div class="diff-stats">
							<span class="stat-row text-green">Max Buff: +180% (2.8x)</span>
							<span class="stat-row text-muted">Max Debuff: -35%</span>
							<span class="mult-tag font-mono">2.4x Scale • ~6x Floor Gold</span>
						</div>
						<p class="diff-desc">Standard speeds, moving sweet spots, powerful short-term burst.</p>
					</button>

					<!-- Abyssal -->
					<button
						class="diff-card abyssal-card"
						onclick={() => setDifficulty('abyssal')}
					>
						<span class="diff-badge">ABYSSAL</span>
						<span class="diff-risk text-red">High Risk / Brutal</span>
						<div class="diff-stats">
							<span class="stat-row text-green">Max Buff: +350% (4.5x)</span>
							<span class="stat-row text-red">Max Debuff: -55%</span>
							<span class="mult-tag font-mono">4.0x Scale • ~12x Floor Gold</span>
						</div>
						<p class="diff-desc">Blistering speeds, razor zones, godlike combat surge & fortune!</p>
					</button>
				</div>
			</div>

		<!-- 4. PLAYING STATE -->
		{:else if state === 'PLAYING' && selectedChoice}
			{@const gameMeta = MINIGAME_REGISTRY[selectedChoice.gameId]}
			{@const statMeta = GAMBLE_STATS_REGISTRY[selectedChoice.targetStat]}
			<div class="playing-wrapper">
				<!-- Universal Live HUD -->
				<div class="game-hud-bar">
					<!-- Left: Gambled Target -->
					<div class="hud-left">
						<span class="game-tag">{gameMeta.icon} {gameMeta.title}</span>
						<div class="hud-stat-badge" style="--color: {statMeta.color};">
							<span>{statMeta.icon}</span>
							<span>{statMeta.label}</span>
							<span class="diff-pill font-mono">[{selectedDiff.toUpperCase()}]</span>
						</div>
					</div>

					<!-- Middle: Score & Resonance Decay -->
					<div class="hud-center">
						<div class="score-display">
							<span class="score-label">EFFECTIVE SCORE:</span>
							<span class="score-val font-mono {minigameManager.currentScore >= 0 ? 'text-green' : 'text-red'}">
								{minigameManager.currentScore >= 0 ? '+' : ''}{Math.round(minigameManager.currentScore)}
							</span>
						</div>

						<!-- Instantaneous Resonance Decay Gauge -->
						<div class="resonance-gauge">
							<div class="resonance-header">
								<span class="res-label">⚡ LEYLINE HARMONY:</span>
								<span class="res-status {minigameManager.resonanceStatus}">
									{minigameManager.resonancePercent}% ({minigameManager.resonanceStatus})
								</span>
							</div>
							<div class="res-bar-track">
								<div
									class="res-bar-fill {minigameManager.resonanceStatus}"
									style="width: {minigameManager.resonancePercent}%;"
								></div>
							</div>
						</div>
					</div>

					<!-- Right: Projected Effect & Cash Out -->
					<div class="hud-right">
						<div class="projected-badge {projected.isDebuff ? 'debuff' : 'buff'}">
							<span class="proj-label">PROJECTED EFFECT:</span>
							<span class="proj-val font-mono">
								{projected.percent >= 0 ? '+' : ''}{projected.percent}% {statMeta.label}
							</span>
						</div>

						<button
							class="btn btn-primary cashout-btn {minigameManager.resonanceStatus === 'DEPLETED' ? 'pulsate-cashout' : ''}"
							onclick={() => minigameManager.cashOut()}
						>
							<span>⚡ BANK & CASH OUT ⚡</span>
						</button>
					</div>
				</div>

				<!-- Active Minigame Mount -->
				<div class="active-minigame-mount">
					{#if selectedChoice.gameId === 'abyssal_runner'}
						<AbyssalRunner />
					{:else if selectedChoice.gameId === 'fates_gambit'}
						<FatesGambit />
					{:else if selectedChoice.gameId === 'alchemical_brewmaster'}
						<AlchemicalBrewmaster />
					{:else if selectedChoice.gameId === 'rune_scribe'}
						<RuneScribe />
					{:else if selectedChoice.gameId === 'vault_cracker'}
						<VaultCracker />
					{:else if selectedChoice.gameId === 'titans_forge'}
						<TitansForge />
					{:else if selectedChoice.gameId === 'celestial_orbit'}
						<CelestialOrbit />
					{:else if selectedChoice.gameId === 'spire_defense'}
						<SpireDefense />
					{:else if selectedChoice.gameId === 'astral_angler'}
						<AstralAngler />
					{:else if selectedChoice.gameId === 'arcane_decryption'}
						<ArcaneDecryption />
					{/if}
				</div>
			</div>

		<!-- 5. RESULT SUMMARY STATE -->
		{:else if state === 'RESULT_SUMMARY' && minigameManager.lastResultBuff}
			{@const buff = minigameManager.lastResultBuff}
			{@const isDebuff = buff.is_debuff || buff.multiplier < 1.0}
			<div class="summary-view {isDebuff ? 'affliction-view' : 'victory-view'}">
				<div class="summary-card">
					<span class="summary-icon">{isDebuff ? '💀' : '✨'}</span>
					<h3 class="summary-title">
						{isDebuff ? 'TRIAL AFFLICTION' : 'TRIAL VICTORIOUS!'}
					</h3>
					<p class="summary-desc">
						{isDebuff
							? 'The trial pushed past your mastery, incurring a temporary combat affliction.'
							: 'You harnessed the leylines and channeled an empowering combat catalyst!'}
					</p>

					<div class="buff-award-box {isDebuff ? 'debuff-box' : 'buff-box'}">
						<span class="award-name">{buff.name}</span>
						<span class="award-mult font-mono">
							{buff.multiplier >= 1.0 ? '+' : ''}{Math.round((buff.multiplier - 1) * 100)}%
							({buff.multiplier}x Multiplier)
						</span>
						<span class="award-dur font-mono">Duration: {Math.round(buff.duration_seconds)}s</span>
					</div>

					{#if buff.gold_reward && buff.gold_reward > 0}
						<div class="gold-award-box font-mono">
							<span class="gold-icon">🪙</span>
							<span class="gold-text">Astral Bounty Harvested: <strong>+{Math.round(buff.gold_reward).toLocaleString()} Gold!</strong></span>
						</div>
					{/if}

					<div class="session-stats">
						<span>Played: {minigameManager.lastSessionDuration}s</span>
						<span>Final Score: {Math.round(minigameManager.currentScore)} pts</span>
					</div>

					<button class="btn btn-primary proceed-btn" onclick={() => minigameManager.dismissSummary()}>
						<span>CONTINUE TO RECHARGE ({minigameManager.cooldownDuration}s) →</span>
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.minigames-container {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		background: radial-gradient(circle at 50% 10%, rgba(20, 25, 45, 0.6) 0%, rgba(8, 12, 22, 0.9) 100%);
		border: 1px solid var(--border-subtle);
		min-height: 440px;
	}

	.minigames-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		padding-bottom: 0.75rem;
	}

	.category-tag {
		font-size: 0.65rem;
		letter-spacing: 0.15em;
		color: var(--text-muted);
		font-weight: 700;
	}

	.minigame-title {
		font-family: var(--font-title);
		font-size: 1.2rem;
		color: #ffffff;
		font-weight: 800;
		margin: 0;
	}

	.state-pill {
		font-size: 0.75rem;
		font-weight: 800;
		padding: 0.3rem 0.75rem;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.cooldown-pill {
		background: rgba(148, 163, 184, 0.15);
		color: #cbd5e1;
		border: 1px solid rgba(148, 163, 184, 0.3);
	}

	.draft-pill {
		background: rgba(0, 210, 255, 0.15);
		color: #00d2ff;
		border: 1px solid rgba(0, 210, 255, 0.3);
	}

	.select-pill {
		background: rgba(255, 210, 0, 0.15);
		color: #ffd200;
		border: 1px solid rgba(255, 210, 0, 0.3);
	}

	.live-pill {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.4);
	}

	.summary-pill {
		background: rgba(16, 185, 129, 0.15);
		color: #10b981;
		border: 1px solid rgba(16, 185, 129, 0.3);
	}

	.minigame-body {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 340px;
		width: 100%;
	}

	/* Cooldown View */
	.cooldown-view {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		text-align: center;
		padding: 1.5rem 1rem;
	}

	.recharge-dial {
		position: relative;
		width: 120px;
		height: 120px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.dial-spinner {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: conic-gradient(#00d2ff var(--pct), rgba(255, 255, 255, 0.05) 0%);
		mask: radial-gradient(circle, transparent 52px, #000 53px);
		-webkit-mask: radial-gradient(circle, transparent 52px, #000 53px);
	}

	.dial-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.cooldown-number {
		font-size: 2rem;
		font-weight: 800;
		color: #ffffff;
		line-height: 1;
	}

	.cooldown-sec {
		font-size: 0.65rem;
		color: var(--text-muted);
		font-weight: 800;
		letter-spacing: 0.1em;
	}

	.cooldown-text h4 {
		font-family: var(--font-title);
		color: #ffffff;
		font-size: 1.15rem;
		margin: 0 0 0.3rem 0;
	}

	.cooldown-text p {
		color: var(--text-secondary);
		font-size: 0.85rem;
		max-width: 380px;
		margin: 0;
	}

	.active-buffs-recap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.recap-title {
		font-size: 0.65rem;
		letter-spacing: 0.1em;
		color: var(--text-muted);
		font-weight: 800;
	}

	.recap-chips {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.recap-chip {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.25rem 0.65rem;
		border-radius: 6px;
		font-size: 0.75rem;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid var(--border-subtle);
	}

	.recap-chip.buff {
		border-color: rgba(16, 185, 129, 0.4);
		color: #34d399;
	}

	.recap-chip.debuff {
		border-color: rgba(239, 68, 68, 0.4);
		color: #f87171;
	}

	.chip-time {
		font-size: 0.65rem;
		opacity: 0.75;
	}

	/* Draft View */
	.draft-view {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
	}

	.draft-heading {
		text-align: center;
	}

	.draft-heading h4 {
		font-family: var(--font-title);
		color: #ffffff;
		font-size: 1.15rem;
		margin: 0 0 0.25rem 0;
	}

	.draft-heading p {
		color: var(--text-secondary);
		font-size: 0.85rem;
		margin: 0;
	}

	.draft-cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
		width: 100%;
	}

	.draft-card {
		position: relative;
		background: rgba(15, 23, 42, 0.75);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		transition: all 0.2s ease;
		overflow: hidden;
	}

	.draft-card:hover {
		border-color: var(--accent);
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.6);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.choice-tag {
		font-size: 0.65rem;
		font-weight: 800;
		color: var(--text-muted);
		letter-spacing: 0.1em;
	}

	.stat-wager-pill {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid var(--stat-color);
		color: var(--stat-color);
		font-size: 0.75rem;
		font-weight: 800;
	}

	.game-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.game-icon {
		font-size: 2.2rem;
		line-height: 1;
		margin-bottom: 0.25rem;
	}

	.game-title {
		font-family: var(--font-title);
		color: #ffffff;
		font-size: 1.15rem;
		margin: 0;
	}

	.game-subtitle {
		font-size: 0.75rem;
		color: var(--accent);
		font-weight: 700;
	}

	.game-summary {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin: 0.25rem 0 0 0;
		line-height: 1.35;
	}

	.wager-desc {
		font-size: 0.75rem;
		color: var(--text-muted);
		background: rgba(0, 0, 0, 0.3);
		padding: 0.5rem;
		border-radius: 6px;
	}

	.wager-label {
		color: #ffffff;
		font-weight: 700;
	}

	.select-trial-btn {
		width: 100%;
		padding: 0.65rem;
		font-size: 0.85rem;
		font-weight: 800;
		background: linear-gradient(135deg, var(--accent) 0%, rgba(0, 0, 0, 0.8) 150%);
		border-color: var(--accent);
	}

	/* Difficulty Select View */
	.difficulty-view {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		width: 100%;
	}

	.trial-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: rgba(15, 23, 42, 0.75);
		border: 1px solid var(--accent);
		border-radius: 10px;
	}

	.banner-icon {
		font-size: 1.8rem;
	}

	.banner-info h4 {
		font-family: var(--font-title);
		color: #ffffff;
		font-size: 1.05rem;
		margin: 0;
	}

	.wager-target {
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.diff-prompt {
		text-align: center;
	}

	.diff-prompt h4 {
		font-family: var(--font-title);
		color: #ffffff;
		font-size: 1.15rem;
		margin: 0 0 0.25rem 0;
	}

	.diff-prompt p {
		color: var(--text-secondary);
		font-size: 0.85rem;
		margin: 0;
	}

	.difficulty-cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.85rem;
		width: 100%;
	}

	.diff-card {
		position: relative;
		background: rgba(15, 23, 42, 0.75);
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		padding: 1.25rem 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.4rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.diff-card:hover {
		transform: translateY(-3px);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
	}

	.diff-card.featured {
		border-color: #ffd200;
		background: rgba(255, 210, 0, 0.05);
	}

	.featured-tag {
		position: absolute;
		top: -10px;
		background: #ffd200;
		color: #000000;
		font-size: 0.6rem;
		font-weight: 900;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
	}

	.novice-card:hover {
		border-color: #38bdf8;
	}

	.abyssal-card:hover {
		border-color: #ef4444;
	}

	.diff-badge {
		font-family: var(--font-title);
		font-size: 1.1rem;
		font-weight: 800;
		color: #ffffff;
	}

	.diff-risk {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--text-muted);
	}

	.diff-stats {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		margin: 0.35rem 0;
	}

	.stat-row {
		font-size: 0.75rem;
		font-weight: 700;
	}

	.mult-tag {
		font-size: 0.8rem;
		font-weight: 800;
		color: #ffffff;
		margin-top: 0.2rem;
	}

	.diff-desc {
		font-size: 0.75rem;
		color: var(--text-secondary);
		margin: 0;
		line-height: 1.3;
	}

	/* Playing Wrapper & HUD */
	.playing-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		width: 100%;
	}

	.game-hud-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
		background: rgba(15, 23, 42, 0.8);
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		padding: 0.75rem 1rem;
	}

	.hud-left {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.game-tag {
		font-family: var(--font-title);
		font-size: 0.95rem;
		font-weight: 800;
		color: #ffffff;
	}

	.hud-stat-badge {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.75rem;
		font-weight: 800;
		color: var(--color);
	}

	.diff-pill {
		font-size: 0.65rem;
		opacity: 0.8;
	}

	.hud-center {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 220px;
	}

	.score-display {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.score-label {
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--text-muted);
	}

	.score-val {
		font-size: 1.15rem;
		font-weight: 900;
	}

	.resonance-gauge {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.resonance-header {
		display: flex;
		justify-content: space-between;
		font-size: 0.65rem;
		font-weight: 800;
	}

	.res-label {
		color: var(--text-muted);
	}

	.res-status.PEAK {
		color: #00d2ff;
	}

	.res-status.STEADY {
		color: #ffd200;
	}

	.res-status.WANING {
		color: #f97316;
	}

	.res-status.DEPLETED {
		color: #ef4444;
	}

	.res-bar-track {
		height: 6px;
		background: rgba(0, 0, 0, 0.5);
		border-radius: 999px;
		overflow: hidden;
	}

	.res-bar-fill {
		height: 100%;
		border-radius: 999px;
		transition: width 0.2s ease;
	}

	.res-bar-fill.PEAK {
		background: linear-gradient(90deg, #00d2ff, #38bdf8);
		box-shadow: 0 0 10px #00d2ff;
	}

	.res-bar-fill.STEADY {
		background: linear-gradient(90deg, #38bdf8, #ffd200);
	}

	.res-bar-fill.WANING {
		background: linear-gradient(90deg, #ffd200, #f97316);
	}

	.res-bar-fill.DEPLETED {
		background: #ef4444;
		box-shadow: 0 0 10px #ef4444;
	}

	.hud-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.4rem;
	}

	.projected-badge {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.75rem;
	}

	.proj-label {
		color: var(--text-muted);
		font-weight: 700;
	}

	.projected-badge.buff .proj-val {
		color: #10b981;
		font-weight: 800;
	}

	.projected-badge.debuff .proj-val {
		color: #ef4444;
		font-weight: 800;
	}

	.cashout-btn {
		padding: 0.55rem 1.15rem;
		font-size: 0.85rem;
		font-weight: 900;
		background: linear-gradient(135deg, #ffd200 0%, #f59e0b 100%);
		color: #000000;
		border-color: #ffd200;
		box-shadow: 0 0 15px rgba(255, 210, 0, 0.4);
	}

	.pulsate-cashout {
		animation: pulseGlow 0.8s infinite alternate;
	}

	.active-minigame-mount {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
	}

	/* Summary View */
	.summary-view {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		padding: 1.5rem 0;
	}

	.summary-card {
		background: rgba(15, 23, 42, 0.9);
		border-radius: 14px;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 1rem;
		max-width: 440px;
		box-shadow: 0 0 35px rgba(0, 0, 0, 0.8);
	}

	.victory-view .summary-card {
		border: 1px solid #10b981;
		box-shadow: 0 0 30px rgba(16, 185, 129, 0.25);
	}

	.affliction-view .summary-card {
		border: 1px solid #ef4444;
		box-shadow: 0 0 30px rgba(239, 68, 68, 0.25);
	}

	.summary-icon {
		font-size: 3rem;
		line-height: 1;
	}

	.summary-title {
		font-family: var(--font-title);
		font-size: 1.4rem;
		font-weight: 800;
		color: #ffffff;
		margin: 0;
	}

	.summary-desc {
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin: 0;
		line-height: 1.4;
	}

	.buff-award-box {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 1rem;
		border-radius: 10px;
		width: 100%;
	}

	.buff-box {
		background: rgba(16, 185, 129, 0.15);
		border: 1px solid #10b981;
	}

	.debuff-box {
		background: rgba(239, 68, 68, 0.15);
		border: 1px solid #ef4444;
	}

	.award-name {
		font-family: var(--font-title);
		font-size: 1.1rem;
		font-weight: 800;
		color: #ffffff;
	}

	.buff-box .award-mult {
		font-size: 1.25rem;
		font-weight: 900;
		color: #34d399;
	}

	.debuff-box .award-mult {
		font-size: 1.25rem;
		font-weight: 900;
		color: #f87171;
	}

	.gold-award-box {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		background: rgba(255, 210, 0, 0.12);
		border: 1px solid rgba(255, 210, 0, 0.4);
		color: #ffd200;
		padding: 0.65rem 1rem;
		border-radius: 10px;
		width: 100%;
		font-size: 0.88rem;
		box-shadow: 0 0 12px rgba(255, 210, 0, 0.2);
	}

	.gold-award-box strong {
		color: #ffffff;
	}

	.award-dur {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.session-stats {
		display: flex;
		gap: 1.5rem;
		font-size: 0.8rem;
		color: var(--text-muted);
		font-weight: 700;
	}

	.proceed-btn {
		width: 100%;
		padding: 0.8rem;
		font-size: 0.95rem;
		font-weight: 800;
	}

	.text-green {
		color: #10b981;
	}

	.text-red {
		color: #ef4444;
	}

	.text-muted {
		color: var(--text-muted);
	}

	@keyframes pulseGlow {
		from {
			transform: scale(1);
			box-shadow: 0 0 15px rgba(255, 210, 0, 0.4);
		}
		to {
			transform: scale(1.03);
			box-shadow: 0 0 25px rgba(255, 210, 0, 0.8);
		}
	}

	@media (max-width: 640px) {
		.minigames-container {
			padding: 0.75rem;
			gap: 0.75rem;
			min-height: 380px;
		}

		.minigames-header {
			padding-bottom: 0.5rem;
			gap: 0.5rem;
		}

		.minigame-title {
			font-size: 1.05rem;
		}

		.draft-cards-grid {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}

		.draft-card {
			padding: 1rem;
		}

		.difficulty-cards-grid {
			grid-template-columns: 1fr;
			gap: 0.65rem;
		}

		.diff-card {
			padding: 0.85rem;
		}

		.trial-banner {
			padding: 0.6rem 0.75rem;
		}

		.game-hud-bar {
			padding: 0.5rem 0.75rem;
			gap: 0.5rem;
		}

		.hud-title {
			font-size: 0.95rem;
		}

		.hud-timer {
			font-size: 1.15rem;
		}

		.hud-score-val {
			font-size: 1.15rem;
		}

		.result-summary-card {
			padding: 1rem;
			gap: 1rem;
		}

		.award-badge {
			padding: 0.75rem 1rem;
		}

		.award-mult {
			font-size: 1.4rem;
		}
	}
</style>
