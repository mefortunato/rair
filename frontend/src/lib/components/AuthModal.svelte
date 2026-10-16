<script lang="ts">
	import { onMount } from 'svelte';
	import { game } from '#lib/stores/playerStore.svelte';
	import { api } from '#lib/api/apiClient';
	import type { LinkGoogleResponse, ConflictSummary } from '#lib/types/game';

	let player = $derived(game.player);
	let isCurrentlyGuest = $derived(player?.is_guest !== false);
	let currentFloor = $derived(player?.highest_floor || 1);
	let currentSparks = $derived(player?.ascension_tree?.sparks || 0);
	let currentGearCount = $derived(player?.inventory?.length || 0);

	let googleClientId = $state('');
	let isGoogleLoaded = $state(false);
	let isLoading = $state(false);
	let errorMessage = $state('');

	// Custom Google Email input for dev/demo testing
	let customGoogleEmail = $state('');
	let customGoogleName = $state('');

	// Conflict resolution state
	let conflictData: LinkGoogleResponse | null = $state(null);
	let pendingGooglePayload: any = $state(null);

	onMount(async () => {
		try {
			const cfg = await api.getAuthConfig();
			googleClientId = cfg.google_client_id;
			initializeGis();
		} catch (err) {
			console.warn('Failed to fetch auth config:', err);
		}
	});

	function initializeGis() {
		if (typeof window === 'undefined') return;
		const w = window as any;
		if (w.google?.accounts?.id && googleClientId) {
			try {
				w.google.accounts.id.initialize({
					client_id: googleClientId,
					callback: handleGisCredentialResponse
				});
				const btnContainer = document.getElementById('google-btn-container');
				if (btnContainer) {
					w.google.accounts.id.renderButton(btnContainer, {
						theme: 'outline',
						size: 'large',
						text: isCurrentlyGuest ? 'continue_with' : 'signin_with',
						shape: 'pill'
					});
				}
				isGoogleLoaded = true;
			} catch (err) {
				console.warn('GIS initialization error:', err);
			}
		}
	}

	async function handleGisCredentialResponse(response: any) {
		if (!response?.credential) return;
		await executeGoogleAuth({ credential: response.credential });
	}

	async function handleDemoLogin(name: string, email: string) {
		const googleId = `demo_google_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
		await executeGoogleAuth({
			google_id: googleId,
			name,
			email,
			picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`
		});
	}

	async function handleCustomGoogleSubmit() {
		if (!customGoogleEmail || !customGoogleEmail.includes('@')) {
			errorMessage = 'Please enter a valid Google email address';
			return;
		}
		const name = customGoogleName.trim() || customGoogleEmail.split('@')[0];
		const googleId = `google_${customGoogleEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
		await executeGoogleAuth({
			google_id: googleId,
			name,
			email: customGoogleEmail,
			picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`
		});
	}

	async function executeGoogleAuth(googlePayload: any) {
		isLoading = true;
		errorMessage = '';
		pendingGooglePayload = googlePayload;

		try {
			if (isCurrentlyGuest && (currentFloor > 1 || currentSparks > 0 || currentGearCount > 0)) {
				// Link guest account to Google
				const res: LinkGoogleResponse = await game.linkGoogleAccount(googlePayload);
				if (res.status === 'conflict') {
					conflictData = res;
				}
			} else {
				// Direct Google Sign In
				await game.loginWithGoogle(googlePayload);
			}
		} catch (err: any) {
			errorMessage = err.message || 'Authentication error';
		} finally {
			isLoading = false;
		}
	}

	async function resolveConflict(strategy: 'keep_guest' | 'load_cloud') {
		if (!pendingGooglePayload) return;
		isLoading = true;
		errorMessage = '';

		try {
			await game.linkGoogleAccount({
				...pendingGooglePayload,
				conflict_strategy: strategy
			});
			conflictData = null;
		} catch (err: any) {
			errorMessage = err.message || 'Conflict resolution failed';
		} finally {
			isLoading = false;
		}
	}

	async function handleContinueGuest() {
		if (!isCurrentlyGuest) {
			await game.loginAsGuest();
		} else {
			game.closeModal();
		}
	}
</script>

<div
	class="modal-overlay"
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	onkeydown={(e) => { if (e.key === 'Escape') game.closeModal(); }}
	onclick={(e) => { if (e.target === e.currentTarget) game.closeModal(); }}
>
	<div class="modal-card glass-panel">
		<!-- Header -->
		<div class="modal-header">
			<div class="header-title-group">
				<span class="header-icon">🔐</span>
				<div>
					<h2 class="modal-title font-title">PLAYER AUTHENTICATION</h2>
					<p class="modal-subtitle">Log in with Google to enable automatic cloud backup</p>
				</div>
			</div>
			<button class="close-btn" onclick={() => game.closeModal()} aria-label="Close">✕</button>
		</div>

		<div class="modal-body">
			{#if conflictData}
				<!-- Cloud Save Conflict Screen -->
				<div class="conflict-container">
					<div class="conflict-badge">
						<span>⚠️</span>
						<span>CLOUD SAVE CONFLICT DETECTED</span>
					</div>

					<p class="conflict-desc">
						This Google account already contains saved Spire progression. Choose whether you want to overwrite the cloud save with your current guest progress, or load your existing cloud save.
					</p>

					<div class="conflict-grid">
						<!-- Option A: Current Guest Progress -->
						<div class="conflict-card guest-card">
							<div class="card-header font-mono">CURRENT GUEST CLIMB</div>
							<div class="stat-list">
								<div class="stat-line">
									<span class="stat-label">Hero Handle:</span>
									<span class="stat-value font-bold">{conflictData.guest_summary?.handle}</span>
								</div>
								<div class="stat-line">
									<span class="stat-label">Highest Floor:</span>
									<span class="stat-value font-mono">Floor {conflictData.guest_summary?.highest_floor}</span>
								</div>
								<div class="stat-line">
									<span class="stat-label">Ascension Sparks:</span>
									<span class="stat-value font-mono">✨ {conflictData.guest_summary?.sparks}</span>
								</div>
								<div class="stat-line">
									<span class="stat-label">Inventory Gear:</span>
									<span class="stat-value font-mono">🛡️ {conflictData.guest_summary?.inventory_count} Items</span>
								</div>
							</div>

							<button
								class="btn btn-conflict-action btn-overwrite"
								onclick={() => resolveConflict('keep_guest')}
								disabled={isLoading}
							>
								{isLoading ? 'Overwriting...' : 'KEEP GUEST & OVERWRITE CLOUD'}
							</button>
						</div>

						<!-- Option B: Existing Cloud Save -->
						<div class="conflict-card cloud-card">
							<div class="card-header font-mono">EXISTING GOOGLE CLOUD SAVE</div>
							<div class="stat-list">
								<div class="stat-line">
									<span class="stat-label">Hero Handle:</span>
									<span class="stat-value font-bold">{conflictData.cloud_summary?.handle}</span>
								</div>
								<div class="stat-line">
									<span class="stat-label">Highest Floor:</span>
									<span class="stat-value font-mono">Floor {conflictData.cloud_summary?.highest_floor}</span>
								</div>
								<div class="stat-line">
									<span class="stat-label">Ascension Sparks:</span>
									<span class="stat-value font-mono">✨ {conflictData.cloud_summary?.sparks}</span>
								</div>
								<div class="stat-line">
									<span class="stat-label">Inventory Gear:</span>
									<span class="stat-value font-mono">🛡️ {conflictData.cloud_summary?.inventory_count} Items</span>
								</div>
							</div>

							<button
								class="btn btn-conflict-action btn-load-cloud"
								onclick={() => resolveConflict('load_cloud')}
								disabled={isLoading}
							>
								{isLoading ? 'Loading...' : 'LOAD CLOUD SAVE (DISCARD GUEST)'}
							</button>
						</div>
					</div>

					<button class="btn btn-secondary btn-cancel-conflict" onclick={() => (conflictData = null)}>
						Cancel
					</button>
				</div>
			{:else}
				<!-- Normal Login Screen -->
				{#if isCurrentlyGuest && (currentFloor > 1 || currentSparks > 0)}
					<div class="progress-safeguard-banner">
						<div class="banner-icon">🛡️</div>
						<div class="banner-text">
							<div class="banner-title font-mono">CURRENT PROGRESS WILL BE SAVED</div>
							<div class="banner-sub">
								You have conquered <strong>Floor {currentFloor}</strong> with <strong>{currentSparks} Sparks</strong>!
								Logging in with Google now links this active session to your Google account.
							</div>
						</div>
					</div>
				{/if}

				{#if errorMessage}
					<div class="error-banner">
						<span>⚠️</span>
						<span>{errorMessage}</span>
					</div>
				{/if}

				<!-- Official Google Sign-In Container (GIS) -->
				<div class="auth-section">
					<h3 class="auth-heading">Sign In with Google</h3>
					<div id="google-btn-container" class="google-gis-container"></div>

					<!-- Fast One-Click Sign In (Development / Instant Demo / No OAuth keys required) -->
					<div class="demo-profiles-container">
						<span class="demo-label font-mono">QUICK TEST PROFILES (ONE-CLICK)</span>
						<div class="demo-btn-group">
							<button
								class="btn btn-demo-profile"
								onclick={() => handleDemoLogin('Alex Mercer', 'alex.ascendant@gmail.com')}
								disabled={isLoading}
							>
								<span class="demo-avatar">A</span>
								<div class="demo-text">
									<span class="demo-name">Alex Mercer</span>
									<span class="demo-email font-mono">alex.ascendant@gmail.com</span>
								</div>
							</button>

							<button
								class="btn btn-demo-profile"
								onclick={() => handleDemoLogin('Nova Spire', 'nova.climber@gmail.com')}
								disabled={isLoading}
							>
								<span class="demo-avatar nova">N</span>
								<div class="demo-text">
									<span class="demo-name">Nova Spire</span>
									<span class="demo-email font-mono">nova.climber@gmail.com</span>
								</div>
							</button>
						</div>

						<!-- Custom Email Input -->
						<div class="custom-email-box">
							<input
								type="email"
								placeholder="Enter any Google email (e.g. hero@gmail.com)"
								bind:value={customGoogleEmail}
								class="email-input font-mono"
							/>
							<button
								class="btn btn-primary btn-submit-email"
								onclick={handleCustomGoogleSubmit}
								disabled={isLoading || !customGoogleEmail}
							>
								{isLoading ? 'Connecting...' : 'Sign in with Google'}
							</button>
						</div>
					</div>
				</div>

				<div class="divider">
					<span class="divider-line"></span>
					<span class="divider-text font-mono">OR</span>
					<span class="divider-line"></span>
				</div>

				<!-- Guest Mode Section -->
				<div class="guest-section">
					<button class="btn btn-guest-mode" onclick={handleContinueGuest}>
						<span class="guest-icon">👤</span>
						<div class="guest-text">
							<span class="guest-title">Play as Guest</span>
							<span class="guest-sub">Play immediately without logging in. You can link Google anytime later.</span>
						</div>
					</button>
				</div>
			{/if}
		</div>

		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => game.closeModal()}>
				Close
			</button>
		</div>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(4, 7, 14, 0.88);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
		animation: overlayFadeIn 0.2s ease-out;
	}

	@keyframes overlayFadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.modal-card {
		background: rgba(13, 19, 33, 0.96);
		border: 1px solid rgba(0, 210, 255, 0.35);
		border-radius: 18px;
		max-width: 620px;
		width: 100%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(0, 210, 255, 0.2);
		animation: modalZoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
		overflow: hidden;
	}

	@keyframes modalZoomIn {
		from {
			opacity: 0;
			transform: scale(0.96) translateY(8px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.modal-header {
		padding: 1.25rem 1.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--border-subtle);
		background: rgba(255, 255, 255, 0.02);
	}

	.header-title-group {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}

	.header-icon {
		font-size: 1.75rem;
		filter: drop-shadow(0 0 8px rgba(0, 210, 255, 0.5));
	}

	.modal-title {
		font-size: 1.25rem;
		color: #ffffff;
		letter-spacing: 0.08em;
	}

	.modal-subtitle {
		font-size: 0.8rem;
		color: var(--text-muted);
		margin-top: 2px;
	}

	.close-btn {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.12);
		color: var(--text-secondary);
		width: 32px;
		height: 32px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
	}

	.close-btn:hover {
		color: #ffffff;
		border-color: rgba(255, 255, 255, 0.3);
		background: rgba(255, 255, 255, 0.08);
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.progress-safeguard-banner {
		background: rgba(0, 210, 255, 0.08);
		border: 1px solid rgba(0, 210, 255, 0.35);
		border-radius: 12px;
		padding: 0.85rem 1.1rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.banner-icon {
		font-size: 1.8rem;
	}

	.banner-title {
		font-size: 0.75rem;
		color: #00d2ff;
		letter-spacing: 0.05em;
		font-weight: 700;
	}

	.banner-sub {
		font-size: 0.8rem;
		color: #e2e8f0;
		line-height: 1.35;
		margin-top: 2px;
	}

	.error-banner {
		background: rgba(244, 63, 94, 0.15);
		border: 1px solid #f43f5e;
		border-radius: 8px;
		padding: 0.65rem 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #fecdd3;
		font-size: 0.85rem;
	}

	.auth-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.auth-heading {
		font-size: 0.95rem;
		font-weight: 700;
		color: #ffffff;
		letter-spacing: 0.04em;
	}

	.google-gis-container {
		display: flex;
		justify-content: center;
		min-height: 44px;
	}

	.demo-profiles-container {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: rgba(18, 26, 45, 0.6);
		border: 1px solid var(--border-medium);
		border-radius: 12px;
		padding: 1rem;
	}

	.demo-label {
		font-size: 0.65rem;
		color: var(--text-muted);
		letter-spacing: 0.08em;
	}

	.demo-btn-group {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	@media (max-width: 540px) {
		.demo-btn-group {
			grid-template-columns: 1fr;
		}
	}

	.btn-demo-profile {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 10px;
		padding: 0.65rem 0.85rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-align: left;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-demo-profile:hover {
		background: rgba(0, 210, 255, 0.1);
		border-color: #00d2ff;
		transform: translateY(-1px);
	}

	.demo-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: linear-gradient(135deg, #0284c7, #2563eb);
		color: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.85rem;
		flex-shrink: 0;
	}

	.demo-avatar.nova {
		background: linear-gradient(135deg, #7c3aed, #db2777);
	}

	.demo-text {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.demo-name {
		font-size: 0.85rem;
		font-weight: 700;
		color: #ffffff;
	}

	.demo-email {
		font-size: 0.68rem;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.custom-email-box {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.email-input {
		flex: 1;
		background: rgba(10, 15, 28, 0.8);
		border: 1px solid var(--border-medium);
		border-radius: 8px;
		padding: 0.65rem 0.85rem;
		color: #ffffff;
		font-size: 0.8rem;
		outline: none;
		transition: border-color 0.2s;
	}

	.email-input:focus {
		border-color: #00d2ff;
		box-shadow: 0 0 10px rgba(0, 210, 255, 0.2);
	}

	.btn-submit-email {
		font-size: 0.8rem;
		white-space: nowrap;
		padding: 0.65rem 1rem;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 0.25rem 0;
	}

	.divider-line {
		flex: 1;
		height: 1px;
		background: rgba(255, 255, 255, 0.1);
	}

	.divider-text {
		font-size: 0.7rem;
		color: var(--text-muted);
		letter-spacing: 0.1em;
	}

	.guest-section {
		display: flex;
		flex-direction: column;
	}

	.btn-guest-mode {
		background: rgba(255, 255, 255, 0.03);
		border: 1px dashed rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		padding: 0.85rem 1rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		text-align: left;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-guest-mode:hover {
		background: rgba(255, 255, 255, 0.07);
		border-color: rgba(255, 255, 255, 0.4);
	}

	.guest-icon {
		font-size: 1.6rem;
		color: #fbbf24;
	}

	.guest-text {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.guest-title {
		font-size: 0.9rem;
		font-weight: 700;
		color: #ffffff;
	}

	.guest-sub {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	/* Conflict Resolution Styles */
	.conflict-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.conflict-badge {
		align-self: flex-start;
		background: rgba(245, 158, 11, 0.15);
		border: 1px solid #f59e0b;
		color: #f59e0b;
		padding: 0.35rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.conflict-desc {
		font-size: 0.85rem;
		color: #e2e8f0;
		line-height: 1.4;
	}

	.conflict-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	@media (max-width: 540px) {
		.conflict-grid {
			grid-template-columns: 1fr;
		}
	}

	.conflict-card {
		background: rgba(20, 28, 48, 0.7);
		border-radius: 12px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.conflict-card.guest-card {
		border: 1px solid rgba(251, 191, 36, 0.4);
	}

	.conflict-card.cloud-card {
		border: 1px solid rgba(0, 210, 255, 0.4);
	}

	.card-header {
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		font-weight: 700;
		color: #ffffff;
	}

	.stat-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.stat-line {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
	}

	.stat-label {
		color: var(--text-muted);
	}

	.stat-value {
		color: #ffffff;
	}

	.btn-conflict-action {
		font-size: 0.75rem;
		font-weight: 800;
		padding: 0.65rem 0.5rem;
		letter-spacing: 0.04em;
	}

	.btn-overwrite {
		background: linear-gradient(135deg, #d97706, #b45309);
		border: 1px solid #fbbf24;
		color: #ffffff;
	}

	.btn-overwrite:hover {
		box-shadow: 0 0 15px rgba(245, 158, 11, 0.5);
	}

	.btn-load-cloud {
		background: linear-gradient(135deg, #0284c7, #0369a1);
		border: 1px solid #38bdf8;
		color: #ffffff;
	}

	.btn-load-cloud:hover {
		box-shadow: 0 0 15px rgba(56, 189, 248, 0.5);
	}

	.btn-cancel-conflict {
		align-self: center;
	}

	.modal-footer {
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--border-subtle);
		display: flex;
		justify-content: flex-end;
		background: rgba(255, 255, 255, 0.02);
	}
</style>
