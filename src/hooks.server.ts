import type { Handle } from '@sveltejs/kit'
import { urlLocale } from '$lib/i18n'

export const handle: Handle = ({ event, resolve }) => {
	const lang = urlLocale(event.url)
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', lang)
	})
}
