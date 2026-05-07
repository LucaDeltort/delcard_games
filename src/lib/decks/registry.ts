import type { Card } from '$lib/core/types'
import { createFrenchDeck } from '$lib/decks/FrenchDeck/cards'
import { defaultFrenchDeckPack, frenchDeckPacks } from '$lib/decks/FrenchDeck/packs'
import type { CardPack } from '$lib/decks/types'

export type DeckTypeEntry = {
	slug: string
	name: string
	packs: CardPack[]
	defaultPackId: string
	createCards: () => Card[]
}

export const deckRegistry: DeckTypeEntry[] = [
	{
		slug: 'french-deck',
		name: 'French Deck',
		packs: frenchDeckPacks,
		defaultPackId: defaultFrenchDeckPack.id,
		createCards: () => createFrenchDeck(true)
	}
]

export function getDeckBySlug(slug: string): DeckTypeEntry | undefined {
	return deckRegistry.find((d) => d.slug === slug)
}
