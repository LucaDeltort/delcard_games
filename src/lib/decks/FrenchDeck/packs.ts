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
		id: 'joseon',
		name: 'Joseon',
		basePath: '/cards/FrenchDeck/joseon',
		ext: '.svg'
	}
]

export const defaultFrenchDeckPack = frenchDeckPacks[0]
