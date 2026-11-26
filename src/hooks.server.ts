import type { Handle } from '@sveltejs/kit'
import { building } from '$app/environment'
import { urlLocale } from '$lib/i18n'

export const handle: Handle = ({ event, resolve }) => {
	// Prerendered routes (sitemap.xml) can't read url.searchParams
	const lang = building ? 'fr' : urlLocale(event.url)
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', lang)
	})
}
