import type { CardPack } from '$lib/decks/types'

export const standardPacks: CardPack[] = [
	{
		id: 'default',
		name: 'Classic',
		author: 'Alexei Samoshkin',
		basePath: '/cards/standard/default',
		ext: '.svg'
	}
]

export const defaultStandardPack = standardPacks[0]
