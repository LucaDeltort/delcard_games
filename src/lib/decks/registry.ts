import type { Card, DeckType } from '$lib/core/types'
import { createColorDeck } from '$lib/decks/ColorDeck/cards'
import { colorDeckMetadata } from '$lib/decks/ColorDeck/metadata'
import { colorDeckPacks, defaultColorDeckPack } from '$lib/decks/ColorDeck/packs'
import { createFrenchDeck } from '$lib/decks/FrenchDeck/cards'
import { frenchDeckMetadata } from '$lib/decks/FrenchDeck/metadata'
import { defaultFrenchDeckPack, frenchDeckPacks } from '$lib/decks/FrenchDeck/packs'
import type { CardPack, DeckMetadata } from '$lib/decks/types'
import { createWerewolfDeck, getWerewolfCardDetails } from '$lib/decks/WerewolfDeck/cards'
import { werewolfDeckMetadata } from '$lib/decks/WerewolfDeck/metadata'
import { defaultWerewolfDeckPack, werewolfDeckPacks } from '$lib/decks/WerewolfDeck/packs'

export type DeckTypeEntry = {
	slug: string
	name: string
	nameKey: string
	packs: CardPack[]
	defaultPackId: string
	metadata: DeckMetadata
	createCards: () => Card[]
	unsuitedLabelKey?: string
	getCardDetails?: (card: Card) => { nameKey: string; descKey: string } | null
	groupUnsuitedCards?: (cards: Card[]) => { labelKey: string; cards: Card[] }[]
}

const DECK_TYPE_SLUGS: Record<DeckType, string> = {
	FrenchDeckWithJoker: 'french-deck',
	FrenchDeckWithoutJoker: 'french-deck',
	ColorDeck: 'color-deck',
	WerewolfDeck: 'werewolf-deck'
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
		metadata: frenchDeckMetadata,
		createCards: () => createFrenchDeck(true)
	},
	{
		slug: 'color-deck',
		name: 'Color Deck',
		nameKey: 'decks.colorDeck',
		packs: colorDeckPacks,
		defaultPackId: defaultColorDeckPack.id,
		metadata: colorDeckMetadata,
		createCards: () => createColorDeck(),
		groupUnsuitedCards: (cards) => [
			{ labelKey: 'color.actionWild', cards: cards.filter((c) => c.face === 'Wild') },
			{
				labelKey: 'color.actionWildDrawFour',
				cards: cards.filter((c) => c.face === 'WildDrawFour')
			}
		]
	},
	{
		slug: 'werewolf-deck',
		name: 'Werewolf Deck',
		nameKey: 'decks.werewolfDeck',
		packs: werewolfDeckPacks,
		defaultPackId: defaultWerewolfDeckPack.id,
		metadata: werewolfDeckMetadata,
		createCards: () => createWerewolfDeck(),
		unsuitedLabelKey: 'decks.groupRoles',
		getCardDetails: getWerewolfCardDetails
	}
]

export function getDeckBySlug(slug: string): DeckTypeEntry | undefined {
	return deckRegistry.find((d) => d.slug === slug)
}
