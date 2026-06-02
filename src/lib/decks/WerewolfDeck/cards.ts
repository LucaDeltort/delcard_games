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

const ROLE_KEYS: Record<string, { nameKey: string; descKey: string }> = {
	werewolf: { nameKey: 'werewolf.roleWerewolf', descKey: 'werewolf.desc.werewolf' },
	villager: { nameKey: 'werewolf.roleVillager', descKey: 'werewolf.desc.villager' },
	seer: { nameKey: 'werewolf.roleSeer', descKey: 'werewolf.desc.seer' },
	witch: { nameKey: 'werewolf.roleWitch', descKey: 'werewolf.desc.witch' },
	hunter: { nameKey: 'werewolf.roleHunter', descKey: 'werewolf.desc.hunter' },
	cupid: { nameKey: 'werewolf.roleCupid', descKey: 'werewolf.desc.cupid' },
	defender: { nameKey: 'werewolf.roleDefender', descKey: 'werewolf.desc.defender' },
	elder: { nameKey: 'werewolf.roleElder', descKey: 'werewolf.desc.elder' },
	scapegoat: { nameKey: 'werewolf.roleScapegoat', descKey: 'werewolf.desc.scapegoat' },
	'village-idiot': { nameKey: 'werewolf.roleVillageIdiot', descKey: 'werewolf.desc.villageIdiot' }
}

export function getWerewolfCardDetails(card: Card): { nameKey: string; descKey: string } | null {
	return ROLE_KEYS[card.face] ?? null
}
