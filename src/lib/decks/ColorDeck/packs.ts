import type { CardPack } from '$lib/decks/types'

export const colorDeckPacks: CardPack[] = [
	{
		id: 'default',
		name: 'Classic',
		basePath: '/cards/ColorDeck/default',
		ext: '.svg',
		cardSrc: (card, basePath, ext) => {
			if (!card.suit) return `${basePath}/card_${card.face.toLowerCase()}${ext}`
			return `${basePath}/card_${card.suit}_${card.face.toLowerCase()}${ext}`
		}
	}
]

export const defaultColorDeckPack = colorDeckPacks[0]
