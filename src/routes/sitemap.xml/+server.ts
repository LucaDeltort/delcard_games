import { deckRegistry } from '$lib/decks/registry'
import { diceRegistry } from '$lib/dice/registry'
import { gameList } from '$lib/games/index'
import { SITE_ORIGIN } from '$lib/seo/config'

export const prerender = true

export function GET() {
	const urls = [
		'/',
		'/join',
		'/decks',
		'/dice',
		'/games',
		...gameList.map((g) => `/games/${g.id}`),
		...deckRegistry.map((d) => `/decks/${d.slug}`),
		...diceRegistry.map((d) => `/dice/${d.slug}`)
	]

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.flatMap((u) => [u, `${u}?lang=en`].map((l) => `  <url><loc>${SITE_ORIGIN}${l}</loc></url>`)).join('\n')}
</urlset>`

	return new Response(xml, { headers: { 'Content-Type': 'application/xml' } })
}
