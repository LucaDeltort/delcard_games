import type { CardPack } from '$lib/decks/types'

export const unoDeckPacks: CardPack[] = [
	{
		id: 'default',
		name: 'Classic',
		basePath: '/cards/UnoDeck/default',
		ext: '.svg'
	}
]

export const defaultUnoDeckPack = unoDeckPacks[0]
