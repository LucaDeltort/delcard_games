import type { Card, GameZone } from '$lib/core/types'

/** Creates a new zone. Cards default to an empty array. */
export function createZone(
	id: string,
	type: GameZone['type'],
	cards: Card[] = [],
	ownerId?: string
): GameZone {
	return { id, type, cards, ownerId }
}

/**
 * Moves a single card between two zones. Returns an updated zones map.
 * No-ops silently if either zone or the card is not found.
 */
export function moveCard(
	zones: Record<string, GameZone>,
	fromZoneId: string,
	toZoneId: string,
	cardId: string
): Record<string, GameZone> {
	const from = zones[fromZoneId]
	const to = zones[toZoneId]
	if (!from || !to) return zones

	const card = from.cards.find((c) => c.id === cardId)
	if (!card) return zones

	return {
		...zones,
		[fromZoneId]: { ...from, cards: from.cards.filter((c) => c.id !== cardId) },
		[toZoneId]: { ...to, cards: [...to.cards, card] }
	}
}
