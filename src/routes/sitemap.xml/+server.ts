import { deckRegistry } from '$lib/decks/registry'
import { diceRegistry } from '$lib/dice/registry'
import { SITE_ORIGIN } from '$lib/seo/config'

export const prerender = true

export function GET() {
	const urls = [
		'/',
		'/join',
		'/decks',
		'/dice',
		...deckRegistry.map((d) => `/decks/${d.slug}`),
		...diceRegistry.map((d) => `/dice/${d.slug}`)
	]

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE_ORIGIN}${u}</loc></url>`).join('\n')}
</urlset>`

	return new Response(xml, { headers: { 'Content-Type': 'application/xml' } })
}
