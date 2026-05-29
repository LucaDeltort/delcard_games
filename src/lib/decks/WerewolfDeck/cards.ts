import type { Card } from '$lib/core/types'
import { createCard } from '$lib/engine/cards'

export const WEREWOLF_CARD_FACES = [
	'werewolf',
	'villager',
	'seer',
	'witch',
	'hunter',
	'cupid',
	'elder',
	'defender',
	'scapegoat',
	'village-idiot'
] as const

export type WerewolfCardFace = (typeof WEREWOLF_CARD_FACES)[number]

export function createWerewolfDeck(): Card[] {
	return WEREWOLF_CARD_FACES.map((face) => createCard(face))
}
