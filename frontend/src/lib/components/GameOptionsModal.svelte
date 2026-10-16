<script lang="ts">
	import { game } from '#lib/stores/playerStore.svelte';
	import { sfx } from '#lib/audio/sfx';

	import { pwa } from '#lib/stores/pwaStore.svelte';

	let player = $derived(game.player);
	let isGuest = $derived(player?.is_guest !== false);
	let handle = $derived(player?.handle || 'Ascendant Rogue');
	let email = $derived(player?.email);
	let avatar = $derived(player?.avatar_url);
	let floor = $derived(player?.highest_floor || 1);
	let sparks = $derived(player?.ascension_tree?.sparks || 0);

	let soundEnabled = $state(sfx.enabled);
	let showResetConfirm = $state(false);
	let isResetting = $state(false);

	function toggleSound() {
		soundEnabled = sfx.toggleSound();
	}

	async function handleHardReset() {
		isResetting = true;
		try {
			await game.resetEverything();
			showResetConfirm = false;
		} finally {
			isResetting = false;
		}
	}

	function handleOpenAuth() {
		game.openAuthModal();
	}

	async function handleLogout() {
		await game.logout();
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
				<span class="header-icon">⚙️</span>
				<div>
					<h2 class="modal-title font-title">GAME OPTIONS & SETTINGS</h2>
					<p class="modal-subtitle">Manage cloud save, player account, and game progression</p>
				</div>
			</div>
			<button class="close-btn" onclick={() => game.closeModal()} aria-label="Close">✕</button>
		</div>

		<div class="modal-body">
			<!-- Section 1: Player Account & Cloud Save -->
			<div class="options-section account-section">
				<div class="section-header">
					<span class="section-badge font-mono">ACCOUNT STATUS</span>
					<h3 class="section-title">Cosmic Identity & Cloud Save</h3>
				</div>

				<div class="account-card {isGuest ? 'guest-mode' : 'google-mode'}">
					<div class="account-info-row">
						<div class="avatar-container">
							{#if avatar}
								<img src={avatar} alt="Profile" class="user-avatar" />
							{:else}
								<div class="avatar-placeholder">
									{handle.charAt(0).toUpperCase()}
								</div>
							{/if}
							<span class="status-indicator {isGuest ? 'guest-indicator' : 'cloud-indicator'}"></span>
						</div>

						<div class="account-text">
							<div class="account-name-badge">
								<span class="account-handle">{handle}</span>
								{#if isGuest}
									<span class="account-tag guest-tag">👤 Guest Mode</span>
								{:else}
									<span class="account-tag google-tag">✨ Google Cloud Saved</span>
								{/if}
							</div>
							{#if email}
								<span class="account-email font-mono">{email}</span>
							{:else}
								<span class="account-sub font-mono">Progress stored in local browser cache</span>
							{/if}
						</div>
					</div>

					<!-- Account Action Buttons -->
					<div class="account-actions">
						{#if isGuest}
							<div class="guest-upsell-banner">
								<p class="upsell-text">
									Playing as Guest means your Spire climb ({floor} Floors conquered) will be lost if you clear your browser cache.
								</p>
								<button class="btn btn-google-save" onclick={handleOpenAuth}>
									<span class="g-icon">🔐</span>
									<span>Sign in with Google to Save Progress</span>
								</button>
							</div>
						{:else}
							<div class="cloud-verified-banner">
								<span class="verified-icon">☁️</span>
								<span class="verified-text">Your Spire climb is securely synchronized to Google Cloud.</span>
								<button class="btn btn-secondary btn-sm" onclick={handleLogout}>
									Sign Out
								</button>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Section 2: Preferences & Sound -->
			<div class="options-section">
				<div class="section-header">
					<span class="section-badge font-mono">PREFERENCES</span>
					<h3 class="section-title">Sound & Audio Synthesis</h3>
				</div>

				<div class="setting-row">
					<div class="setting-meta">
						<span class="setting-label">Web Audio Synthesizer</span>
						<span class="setting-desc">Procedural slash, crit, gold, and ascension chimes</span>
					</div>
					<button class="toggle-btn {soundEnabled ? 'active' : ''}" onclick={toggleSound}>
						<span class="toggle-icon">{soundEnabled ? '🔊 ON' : '🔇 MUTED'}</span>
					</button>
				</div>
			</div>

			<!-- Section 3: Progressive Web App & Offline Play -->
			<div class="options-section">
				<div class="section-header">
					<span class="section-badge font-mono">PWA & APP</span>
					<h3 class="section-title">App Installation & Offline Engine</h3>
				</div>

				<div class="pwa-settings-card">
					<div class="pwa-status-row">
						<div class="pwa-icon-box">
							<img src="/icons/icon-72.png" alt="RAIR" class="pwa-preview-icon" />
						</div>
						<div class="pwa-meta">
							<div class="pwa-title-row">
								<span class="pwa-app-title">RAIR Mobile & Desktop PWA</span>
								{#if pwa.isInstalled}
									<span class="pwa-badge installed-badge">✓ Installed Standalone App</span>
								{:else}
									<span class="pwa-badge browser-badge">🌐 Browser View</span>
								{/if}
							</div>
							<p class="pwa-app-desc">
								{pwa.isInstalled
									? 'Running in full-screen standalone mode with offline asset caching and hardware acceleration.'
									: 'Install RAIR for distraction-free full-screen gameplay, faster startup, and offline Spire climbing.'}
							</p>
						</div>
					</div>

					<div class="pwa-controls-row">
						{#if pwa.canInstall}
							<button class="btn btn-primary btn-install-app" onclick={() => pwa.installApp()}>
								<span>📲 Install RAIR to Home Screen</span>
							</button>
						{:else if pwa.isInstalled}
							<div class="installed-notice">
								<span class="check-icon">✨</span>
								<span>App is installed and running natively</span>
							</div>
						{:else}
							<div class="install-hint font-mono">
								Tip: On mobile devices, use the browser menu (or Share → Add to Home Screen) to install.
							</div>
						{/if}

						<button class="btn btn-secondary btn-sm" onclick={() => pwa.applyUpdate()}>
							<span>🔄 Check for App Updates</span>
						</button>
					</div>

					<div class="pwa-connectivity-row font-mono">
						<span class="conn-dot {pwa.isOnline ? 'online' : 'offline'}"></span>
						<span>{pwa.isOnline ? 'Cloud Synced & Online' : 'Offline Play Active (Local Cache)'}</span>
					</div>
				</div>
			</div>

			<!-- Section 4: Progression & Danger Zone -->
			<div class="options-section danger-section">
				<div class="section-header">
					<span class="section-badge danger-badge font-mono">DANGER ZONE</span>
					<h3 class="section-title danger-title">Hard Reset Progression</h3>
				</div>

				<div class="danger-card">
					<div class="danger-meta">
						<h4 class="danger-heading">Reset Everything to First-Time Start</h4>
						<p class="danger-description">
							Reset all game progression back to as if you just started playing for the first time.
							This permanently wipes active floors, boons, constellation sparks ({sparks}), inventory gear,
							and gold, re-arming you with only the Novice Spire Blade on Floor 1.
						</p>
					</div>

					{#if !showResetConfirm}
						<button class="btn btn-danger-trigger" onclick={() => (showResetConfirm = true)}>
							<span>💀 Reset Everything</span>
						</button>
					{:else}
						<div class="reset-confirm-box">
							<div class="warning-callout">
								<span class="warn-icon">⚠️</span>
								<div class="warn-text">
									<strong>ARE YOU ABSOLUTELY SURE?</strong>
									<span>This action is completely permanent and cannot be reversed!</span>
								</div>
							</div>

							<div class="confirm-btn-row">
								<button
									class="btn btn-danger-confirm"
									onclick={handleHardReset}
									disabled={isResetting}
								>
									{isResetting ? 'WIPING PROGRESS...' : 'YES, PERMANENTLY RESET EVERYTHING'}
								</button>
								<button
									class="btn btn-cancel"
									onclick={() => (showResetConfirm = false)}
									disabled={isResetting}
								>
									Cancel
								</button>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => game.closeModal()}>
				Close Options
			</button>
		</div>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(4, 7, 14, 0.85);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
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
		border: 1px solid rgba(0, 210, 255, 0.25);
		border-radius: 18px;
		max-width: 680px;
		width: 100%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(0, 210, 255, 0.15);
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
		filter: drop-shadow(0 0 8px rgba(0, 210, 255, 0.4));
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
		gap: 1.5rem;
	}

	.options-section {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.section-badge {
		font-size: 0.65rem;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		background: rgba(0, 210, 255, 0.15);
		color: #00d2ff;
		letter-spacing: 0.1em;
	}

	.section-title {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--text-primary);
		letter-spacing: 0.04em;
	}

	.account-card {
		background: rgba(20, 28, 48, 0.6);
		border: 1px solid var(--border-medium);
		border-radius: 12px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.account-card.guest-mode {
		border-color: rgba(251, 191, 36, 0.3);
	}

	.account-card.google-mode {
		border-color: rgba(56, 189, 248, 0.4);
	}

	.account-info-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.avatar-container {
		position: relative;
		width: 48px;
		height: 48px;
		border-radius: 50%;
	}

	.user-avatar {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid #00d2ff;
	}

	.avatar-placeholder {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: linear-gradient(135deg, #2563eb, #9333ea);
		color: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 1.2rem;
		border: 2px solid rgba(255, 255, 255, 0.2);
	}

	.status-indicator {
		position: absolute;
		bottom: 0;
		right: 0;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 2px solid #0d1321;
	}

	.status-indicator.guest-indicator {
		background: #f59e0b;
		box-shadow: 0 0 6px #f59e0b;
	}

	.status-indicator.cloud-indicator {
		background: #10b981;
		box-shadow: 0 0 6px #10b981;
	}

	.account-text {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.account-name-badge {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.account-handle {
		font-size: 1.1rem;
		font-weight: 700;
		color: #ffffff;
	}

	.account-tag {
		font-size: 0.7rem;
		padding: 0.15rem 0.5rem;
		border-radius: 9999px;
		font-weight: 600;
	}

	.guest-tag {
		background: rgba(245, 158, 11, 0.15);
		color: #fbbf24;
		border: 1px solid rgba(245, 158, 11, 0.3);
	}

	.google-tag {
		background: rgba(16, 185, 129, 0.15);
		color: #34d399;
		border: 1px solid rgba(16, 185, 129, 0.3);
	}

	.account-email, .account-sub {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.guest-upsell-banner {
		background: rgba(251, 191, 36, 0.08);
		border: 1px dashed rgba(251, 191, 36, 0.35);
		border-radius: 10px;
		padding: 0.85rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.upsell-text {
		font-size: 0.8rem;
		color: #e2e8f0;
		line-height: 1.4;
	}

	.btn-google-save {
		background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
		border: 1px solid rgba(96, 165, 250, 0.4);
		color: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		font-weight: 700;
		box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
		transition: all 0.2s;
	}

	.btn-google-save:hover {
		box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5);
		transform: translateY(-1px);
	}

	.cloud-verified-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		background: rgba(16, 185, 129, 0.08);
		border: 1px solid rgba(16, 185, 129, 0.25);
		border-radius: 8px;
		padding: 0.65rem 0.85rem;
	}

	.verified-text {
		font-size: 0.8rem;
		color: #a7f3d0;
		flex: 1;
	}

	.setting-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.85rem 1rem;
		background: rgba(20, 28, 48, 0.5);
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
	}

	.setting-meta {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.setting-label {
		font-weight: 600;
		font-size: 0.9rem;
		color: #ffffff;
	}

	.setting-desc {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.toggle-btn {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: var(--text-secondary);
		padding: 0.4rem 0.85rem;
		border-radius: 8px;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
	}

	.toggle-btn.active {
		background: rgba(0, 210, 255, 0.15);
		border-color: #00d2ff;
		color: #00d2ff;
		box-shadow: 0 0 10px rgba(0, 210, 255, 0.2);
	}

	/* Danger Zone Styles */
	.danger-badge {
		background: rgba(244, 63, 94, 0.15);
		color: #f43f5e;
	}

	.danger-title {
		color: #f43f5e;
	}

	.danger-card {
		background: rgba(36, 14, 23, 0.45);
		border: 1px solid rgba(244, 63, 94, 0.35);
		border-radius: 12px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.danger-meta {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.danger-heading {
		font-size: 0.95rem;
		font-weight: 700;
		color: #fca5a5;
	}

	.danger-description {
		font-size: 0.8rem;
		color: #fecdd3;
		line-height: 1.45;
		opacity: 0.9;
	}

	.btn-danger-trigger {
		align-self: flex-start;
		background: linear-gradient(135deg, rgba(244, 63, 94, 0.2), rgba(225, 29, 72, 0.4));
		border: 1px solid #f43f5e;
		color: #ffe4e6;
		font-weight: 700;
		padding: 0.65rem 1.25rem;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-danger-trigger:hover {
		background: rgba(244, 63, 94, 0.5);
		box-shadow: 0 0 18px rgba(244, 63, 94, 0.4);
		transform: translateY(-1px);
	}

	.reset-confirm-box {
		background: rgba(20, 5, 10, 0.9);
		border: 2px solid #ef4444;
		border-radius: 10px;
		padding: 1.2rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		animation: confirmPulse 0.3s ease-out;
	}

	@keyframes confirmPulse {
		from {
			opacity: 0;
			transform: scale(0.98);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.warning-callout {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.warn-icon {
		font-size: 1.6rem;
	}

	.warn-text {
		display: flex;
		flex-direction: column;
		font-size: 0.85rem;
		color: #fca5a5;
	}

	.confirm-btn-row {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.btn-danger-confirm {
		background: #dc2626;
		border: 1px solid #f87171;
		color: #ffffff;
		font-weight: 800;
		font-size: 0.85rem;
		padding: 0.75rem 1.25rem;
		border-radius: 8px;
		cursor: pointer;
		letter-spacing: 0.05em;
		box-shadow: 0 0 20px rgba(220, 38, 38, 0.6);
		transition: all 0.2s;
	}

	.btn-danger-confirm:hover:not(:disabled) {
		background: #b91c1c;
		box-shadow: 0 0 30px rgba(220, 38, 38, 0.8);
	}

	.btn-danger-confirm:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-cancel {
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: var(--text-primary);
		padding: 0.75rem 1.25rem;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 600;
	}

	.btn-cancel:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	/* PWA Card Styles */
	.pwa-settings-card {
		background: rgba(16, 24, 44, 0.6);
		border: 1px solid rgba(0, 210, 255, 0.2);
		border-radius: 12px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.pwa-status-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.pwa-icon-box {
		width: 56px;
		height: 56px;
		border-radius: 12px;
		overflow: hidden;
		flex-shrink: 0;
		border: 1.5px solid rgba(0, 210, 255, 0.4);
		box-shadow: 0 0 14px rgba(0, 210, 255, 0.2);
	}

	.pwa-preview-icon {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.pwa-meta {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.pwa-title-row {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		flex-wrap: wrap;
	}

	.pwa-app-title {
		font-weight: 700;
		font-size: 1rem;
		color: #ffffff;
	}

	.pwa-badge {
		font-size: 0.7rem;
		padding: 0.15rem 0.55rem;
		border-radius: 9999px;
		font-weight: 600;
	}

	.installed-badge {
		background: rgba(16, 185, 129, 0.15);
		color: #34d399;
		border: 1px solid rgba(16, 185, 129, 0.35);
	}

	.browser-badge {
		background: rgba(56, 189, 248, 0.15);
		color: #38bdf8;
		border: 1px solid rgba(56, 189, 248, 0.35);
	}

	.pwa-app-desc {
		font-size: 0.8rem;
		color: var(--text-muted);
		line-height: 1.4;
	}

	.pwa-controls-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.btn-install-app {
		background: linear-gradient(135deg, #00d2ff 0%, #2563eb 100%);
		border-color: #38bdf8;
		color: #050b14;
		font-weight: 700;
		padding: 0.65rem 1.15rem;
		box-shadow: 0 4px 14px rgba(0, 210, 255, 0.35);
	}

	.installed-notice {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: #a7f3d0;
	}

	.install-hint {
		font-size: 0.72rem;
		color: var(--text-muted);
		flex: 1;
	}

	.pwa-connectivity-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: var(--text-secondary);
		padding-top: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.conn-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.conn-dot.online {
		background: #10b981;
		box-shadow: 0 0 6px #10b981;
	}

	.conn-dot.offline {
		background: #f59e0b;
		box-shadow: 0 0 6px #f59e0b;
	}

	.modal-footer {
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--border-subtle);
		display: flex;
		justify-content: flex-end;
		background: rgba(255, 255, 255, 0.02);
	}

	@media (max-width: 640px) {
		.modal-overlay {
			padding: 0.5rem;
		}

		.modal-card {
			border-radius: 14px;
			max-height: 94dvh;
		}

		.modal-header {
			padding: 1rem;
		}

		.modal-body {
			padding: 1rem;
			gap: 1rem;
		}

		.account-card, .danger-card, .pwa-settings-card {
			padding: 0.85rem;
		}

		.confirm-btn-row {
			flex-direction: column;
		}

		.btn-danger-confirm, .btn-cancel {
			width: 100%;
			text-align: center;
		}
	}
</style>
