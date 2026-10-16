/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { assets, immutable, prerendered } from '$app/manifest';
import { version } from '$app/env';

const CACHE_NAME = `rair-cache-v${version}`;

// Assets to precache during service worker installation
const ASSETS_TO_PRECACHE = Array.from(
	new Set([
		'/',
		'/index.html',
		...immutable.map((entry) => entry.path),
		...assets
			.map((entry) => entry.path)
			.filter((path) => !path.startsWith('/.well-known/')),
		...prerendered.map((entry) => entry.path)
	])
);

const sw = self as unknown as ServiceWorkerGlobalScope;

// Installation: Cache core app shell and static resources
sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then(async (cache) => {
			for (const asset of ASSETS_TO_PRECACHE) {
				try {
					await cache.add(asset);
				} catch (err) {
					console.warn(`[ServiceWorker] Could not precache asset: ${asset}`, err);
				}
			}
			return sw.skipWaiting();
		})
	);
});

// Activation: Clean up stale caches from previous versions and claim clients
sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (key !== CACHE_NAME) {
					await caches.delete(key);
				}
			}
			return sw.clients.claim();
		})
	);
});

// Fetch: Strategy depending on request type
sw.addEventListener('fetch', (event) => {
	const request = event.request;

	// Only handle GET requests
	if (request.method !== 'GET') {
		return;
	}

	const url = new URL(request.url);

	// Bypass service worker for API calls and Google Auth
	if (url.pathname.startsWith('/api') || url.hostname.includes('accounts.google.com')) {
		return;
	}

	// Bypass non-http(s) schemes (e.g. chrome-extension:)
	if (!url.protocol.startsWith('http')) {
		return;
	}

	// Navigation requests (HTML documents): Network-first with Cache / Offline fallback
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					if (response && response.status === 200) {
						const clone = response.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
					}
					return response;
				})
				.catch(async () => {
					const cachedResponse = await caches.match(request);
					if (cachedResponse) {
						return cachedResponse;
					}
					const fallbackIndex = await caches.match('/index.html');
					if (fallbackIndex) {
						return fallbackIndex;
					}
					return caches.match('/');
				})
		);
		return;
	}

	// Static assets, fonts, icons, audio, and scripts: Cache-first with Network fallback
	event.respondWith(
		caches.match(request).then((cachedResponse) => {
			if (cachedResponse) {
				return cachedResponse;
			}

			return fetch(request)
				.then((response) => {
					if (
						response &&
						response.status === 200 &&
						(response.type === 'basic' || response.type === 'cors')
					) {
						const clone = response.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
					}
					return response;
				})
				.catch((err) => {
					console.warn(`[ServiceWorker] Network fetch failed for: ${request.url}`, err);
					throw err;
				});
		})
	);
});

// Support manual skipWaiting trigger from client
sw.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		sw.skipWaiting();
	}
});
