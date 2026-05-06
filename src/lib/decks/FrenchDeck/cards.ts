import type { Card } from '$lib/core/types'
import { createCard } from '$lib/engine/cards'

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const
const FACES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const

export function createFrenchDeck(withJokers: boolean): Card[] {
	const cards = SUITS.flatMap((suit) => FACES.map((face) => createCard(face, suit)))
	if (withJokers) {
		cards.push(createCard('Joker', 'black'), createCard('Joker', 'red'))
	}
	return cards
}
