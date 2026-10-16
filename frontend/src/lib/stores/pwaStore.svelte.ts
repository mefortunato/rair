/**
 * PWA Store - Progressive Web App Lifecycle, Offline Management & Store Install
 */

export interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

class PwaStore {
	public canInstall = $state(false);
	public isInstalled = $state(false);
	public isOnline = $state(true);
	public updateAvailable = $state(false);
	public isInitialized = $state(false);

	private deferredPrompt: BeforeInstallPromptEvent | null = null;
	private registration: ServiceWorkerRegistration | null = null;

	public init() {
		if (typeof window === 'undefined' || this.isInitialized) return;
		this.isInitialized = true;

		// 1. Detect if running as an installed standalone PWA or TWA
		const isStandalone =
			window.matchMedia('(display-mode: standalone)').matches ||
			(navigator as unknown as { standalone?: boolean }).standalone === true ||
			document.referrer.includes('android-app://');

		this.isInstalled = isStandalone;

		// 2. Connectivity state
		this.isOnline = navigator.onLine;
		window.addEventListener('online', () => {
			this.isOnline = true;
		});
		window.addEventListener('offline', () => {
			this.isOnline = false;
		});

		// 3. Capture beforeinstallprompt event for in-app install triggers
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			this.deferredPrompt = e as BeforeInstallPromptEvent;
			this.canInstall = true;
		});

		window.addEventListener('appinstalled', () => {
			this.canInstall = false;
			this.isInstalled = true;
			this.deferredPrompt = null;
		});

		// 4. Register Service Worker and monitor updates
		if ('serviceWorker' in navigator) {
			window.addEventListener('load', () => {
				navigator.serviceWorker
					.register('/service-worker.js')
					.then((reg) => {
						this.registration = reg;

						// Check if a new service worker is already waiting
						if (reg.waiting && navigator.serviceWorker.controller) {
							this.updateAvailable = true;
						}

						reg.addEventListener('updatefound', () => {
							const newWorker = reg.installing;
							if (newWorker) {
								newWorker.addEventListener('statechange', () => {
									if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
										this.updateAvailable = true;
									}
								});
							}
						});
					})
					.catch((err) => {
						console.warn('[PWA] ServiceWorker registration failed:', err);
					});

				// Reload smoothly when new service worker takes control
				let refreshing = false;
				navigator.serviceWorker.addEventListener('controllerchange', () => {
					if (!refreshing) {
						refreshing = true;
						window.location.reload();
					}
				});
			});
		}
	}

	public async installApp(): Promise<boolean> {
		if (!this.deferredPrompt) {
			return false;
		}

		try {
			await this.deferredPrompt.prompt();
			const choiceResult = await this.deferredPrompt.userChoice;
			if (choiceResult.outcome === 'accepted') {
				this.canInstall = false;
				this.deferredPrompt = null;
				return true;
			}
		} catch (err) {
			console.error('[PWA] Prompt install error:', err);
		}
		return false;
	}

	public applyUpdate() {
		if (this.registration?.waiting) {
			this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
		} else {
			window.location.reload();
		}
	}
}

export const pwa = new PwaStore();
