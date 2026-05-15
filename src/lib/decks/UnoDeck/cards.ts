import type { Card } from '$lib/core/types'
import { createCard } from '$lib/engine/cards'

const COLORS = ['red', 'yellow', 'green', 'blue'] as const
const ACTIONS = ['Skip', 'Reverse', 'DrawTwo'] as const

export function createUnoDeck(): Card[] {
	const cards: Card[] = []

	for (const color of COLORS) {
		cards.push(createCard('0', color))
		for (let n = 1; n <= 9; n++) {
			cards.push(createCard(String(n), color))
			cards.push(createCard(String(n), color))
		}
		for (const action of ACTIONS) {
			cards.push(createCard(action, color))
			cards.push(createCard(action, color))
		}
	}

	for (let i = 0; i < 4; i++) {
		cards.push(createCard('Wild'))
		cards.push(createCard('WildDrawFour'))
	}

	return cards
}
