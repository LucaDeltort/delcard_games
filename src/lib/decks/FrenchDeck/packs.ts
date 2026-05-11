import type { CardPack } from '$lib/decks/types'

export const frenchDeckPacks: CardPack[] = [
	{
		id: 'default',
		name: 'Classic',
		author: 'Alborz Heydaryan',
		basePath: '/cards/FrenchDeck/default',
		ext: '.svg'
	},
	{
		id: 'cyberwave',
		name: 'Cyberwave',
		author: 'Rohit Chouhan',
		basePath: '/cards/FrenchDeck/cyberwave',
		ext: '.svg'
	},
	{
		id: 'korean',
		name: 'Korean',
		basePath: '/cards/FrenchDeck/korean',
		ext: '.svg'
	}
]

export const defaultFrenchDeckPack = frenchDeckPacks[0]
