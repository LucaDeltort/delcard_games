import { d6Packs, defaultD6Pack } from '$lib/dice/D6/packs'
import type { DicePack } from '$lib/dice/types'

export type DiceTypeEntry = {
	slug: string
	name: string
	nameKey: string
	faceCount: number
	packs: DicePack[]
	defaultPackId: string
}

export const diceRegistry: DiceTypeEntry[] = [
	{
		slug: 'd6',
		name: 'D6',
		nameKey: 'dice.sixSided',
		faceCount: 6,
		packs: d6Packs,
		defaultPackId: defaultD6Pack.id
	}
]

export function getDiceBySlug(slug: string): DiceTypeEntry | undefined {
	return diceRegistry.find((d) => d.slug === slug)
}

export function resolveDicePack(diceSlug: string, packId?: string): DicePack | undefined {
	const entry = getDiceBySlug(diceSlug)
	if (!entry) return undefined
	return entry.packs.find((p) => p.id === (packId ?? entry.defaultPackId))
}
