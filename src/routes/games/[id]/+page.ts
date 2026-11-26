import { error } from '@sveltejs/kit'
import { gameList } from '$lib/games/index'

export function load({ params }) {
	if (!gameList.some((g) => g.id === params.id)) error(404, 'Not found')
}
