import type { DicePack } from '$lib/dice/types'

export const d6Packs: DicePack[] = [
	{
		id: 'classic',
		name: 'Classic',
		basePath: '/dice/D6/classic',
		ext: '.svg'
	}
]

export const defaultD6Pack = d6Packs[0]
