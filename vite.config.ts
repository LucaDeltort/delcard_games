import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'
import { defineConfig } from 'vite'

const { version } = JSON.parse(readFileSync('package.json', 'utf-8'))

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	define: {
		__APP_VERSION__: JSON.stringify(version)
	},
	server: {
		port: 1323
	}
})
