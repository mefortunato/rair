import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const backendPort = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env?.PORT || '8001';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				pages: 'build',
				assets: 'build',
				fallback: 'index.html',
				precompress: false,
				strict: true
			})
		})
	],
	server: {
		proxy: {
			'/api': {
				target: `http://localhost:${backendPort}`,
				changeOrigin: true
			}
		}
	}
});
