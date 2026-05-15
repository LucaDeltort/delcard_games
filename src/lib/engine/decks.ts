import type { Card, DeckType } from '$lib/core/types'
import { createFrenchDeck } from '$lib/decks/FrenchDeck/cards'
import { createUnoDeck } from '$lib/decks/UnoDeck/cards'
import { shuffle } from './cards'

const registry: Record<DeckType, () => Card[]> = {
	FrenchDeckWithJoker: () => createFrenchDeck(true),
	FrenchDeckWithoutJoker: () => createFrenchDeck(false),
	UnoDeck: () => createUnoDeck()
}

/** Returns a new shuffled deck for the given type. */
export function createDeck(deckType: DeckType): Card[] {
	return shuffle(registry[deckType]())
}
