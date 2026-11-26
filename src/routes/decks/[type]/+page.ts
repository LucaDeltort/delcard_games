import { error } from '@sveltejs/kit'
import { getDeckBySlug } from '$lib/decks/registry'

export function load({ params }) {
	if (!getDeckBySlug(params.type)) error(404, 'Not found')
}
