import type { Card } from '$lib/core/types'
import { createFrenchDeck } from '$lib/decks/FrenchDeck/cards'
import { defaultFrenchDeckPack, frenchDeckPacks } from '$lib/decks/FrenchDeck/packs'
import { createUnoDeck } from '$lib/decks/UnoDeck/cards'
import { defaultUnoDeckPack, unoDeckPacks } from '$lib/decks/UnoDeck/packs'
import type { CardPack } from '$lib/decks/types'

export type DeckTypeEntry = {
	slug: string
	name: string
	nameKey: string
	packs: CardPack[]
	defaultPackId: string
	createCards: () => Card[]
}

export const deckRegistry: DeckTypeEntry[] = [
	{
		slug: 'french-deck',
		name: 'French Deck',
		nameKey: 'decks.frenchDeck',
		packs: frenchDeckPacks,
		defaultPackId: defaultFrenchDeckPack.id,
		createCards: () => createFrenchDeck(true)
	},
	{
		slug: 'uno-deck',
		name: 'Uno Deck',
		nameKey: 'decks.unoDeck',
		packs: unoDeckPacks,
		defaultPackId: defaultUnoDeckPack.id,
		createCards: () => createUnoDeck()
	}
]

export function getDeckBySlug(slug: string): DeckTypeEntry | undefined {
	return deckRegistry.find((d) => d.slug === slug)
}
