import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'jsdom',
		include: ['src/**/*.test.ts'],
		exclude: ['node_modules', '.svelte-kit'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'text-summary', 'lcov'],
			reportsDirectory: './coverage',
			include: ['src/lib/engine/**', 'src/lib/games/**'],
			thresholds: {
				lines: 70,
				functions: 70,
				branches: 60,
				statements: 70
			}
		}
	}
})
