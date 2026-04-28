import type { Card } from '$lib/core/types'
import { createCard, shuffle } from './cards'

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const
const FACES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const

/** Returns a new unshuffled standard 52-card deck. */
export function createStandardDeck(): Card[] {
	return SUITS.flatMap((suit) => FACES.map((face) => createCard(face, suit)))
}

/** Returns a new shuffled standard 52-card deck. */
export function createShuffledDeck(): Card[] {
	return shuffle(createStandardDeck())
}
