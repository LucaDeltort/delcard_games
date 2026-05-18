import type { Card, DeckType } from '$lib/core/types'
import { createColorDeck } from '$lib/decks/ColorDeck/cards'
import { colorDeckPacks, defaultColorDeckPack } from '$lib/decks/ColorDeck/packs'
import { createFrenchDeck } from '$lib/decks/FrenchDeck/cards'
import { defaultFrenchDeckPack, frenchDeckPacks } from '$lib/decks/FrenchDeck/packs'
import type { CardPack } from '$lib/decks/types'

export type DeckTypeEntry = {
	slug: string
	name: string
	nameKey: string
	packs: CardPack[]
	defaultPackId: string
	createCards: () => Card[]
}

const DECK_TYPE_SLUGS: Record<DeckType, string> = {
	FrenchDeckWithJoker: 'french-deck',
	FrenchDeckWithoutJoker: 'french-deck',
	ColorDeck: 'color-deck'
}

export function getDeckSlugForType(deckType: DeckType): string {
	return DECK_TYPE_SLUGS[deckType] ?? 'french-deck'
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
		slug: 'color-deck',
		name: 'Color Deck',
		nameKey: 'decks.colorDeck',
		packs: colorDeckPacks,
		defaultPackId: defaultColorDeckPack.id,
		createCards: () => createColorDeck()
	}
]

export function getDeckBySlug(slug: string): DeckTypeEntry | undefined {
	return deckRegistry.find((d) => d.slug === slug)
}
