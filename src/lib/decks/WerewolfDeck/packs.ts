import type { CardPack } from '$lib/decks/types'

export const werewolfDeckPacks: CardPack[] = [
	{
		id: 'thiercelieux',
		name: 'Thiercelieux',
		basePath: '/cards/Werewolf/thiercelieux',
		ext: '.png'
	}
]

export const defaultWerewolfDeckPack = werewolfDeckPacks[0]
