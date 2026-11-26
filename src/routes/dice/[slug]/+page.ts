import { error } from '@sveltejs/kit'
import { getDiceBySlug } from '$lib/dice/registry'

export function load({ params }) {
	if (!getDiceBySlug(params.slug)) error(404, 'Not found')
}
