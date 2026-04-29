import type { Card, DeckType } from '$lib/core/types'
import { createFrenchDeck } from '$lib/decks/FrenchDeck/cards'
import { shuffle } from './cards'

const registry: Record<DeckType, () => Card[]> = {
	FrenchDeckWithJoker: () => createFrenchDeck(true),
	FrenchDeckWithoutJoker: () => createFrenchDeck(false)
}

/** Returns a new shuffled deck for the given type. */
export function createDeck(deckType: DeckType): Card[] {
	return shuffle(registry[deckType]())
}
