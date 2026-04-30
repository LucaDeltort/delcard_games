import { describe, expect, it } from 'vitest'
import { createCard } from './cards'
import { createZone, moveCard } from './zones'

describe('createZone', () => {
	it('creates a zone with given fields', () => {
		const z = createZone('hand_p1', 'hidden', [], 'p1')
		expect(z.id).toBe('hand_p1')
		expect(z.type).toBe('hidden')
		expect(z.cards).toEqual([])
		expect(z.ownerId).toBe('p1')
	})

	it('defaults cards to empty array', () => {
		const z = createZone('discard', 'public')
		expect(z.cards).toEqual([])
	})
})

describe('moveCard', () => {
	it('moves a card from source to dest', () => {
		const card = createCard('A', 'spades')
		const zones = {
			hand: createZone('hand', 'hidden', [card]),
			discard: createZone('discard', 'public', [])
		}
		const result = moveCard(zones, 'hand', 'discard', card.id)
		expect(result.hand.cards).toHaveLength(0)
		expect(result.discard.cards[0].id).toBe(card.id)
	})

	it('no-ops if source zone missing', () => {
		const card = createCard('A')
		const zones = { discard: createZone('discard', 'public', [card]) }
		const result = moveCard(zones, 'nonexistent', 'discard', card.id)
		expect(result).toBe(zones)
	})

	it('no-ops if dest zone missing', () => {
		const card = createCard('A')
		const zones = { hand: createZone('hand', 'hidden', [card]) }
		const result = moveCard(zones, 'hand', 'nonexistent', card.id)
		expect(result).toBe(zones)
	})

	it('no-ops if card not found in source', () => {
		const card = createCard('A')
		const zones = {
			hand: createZone('hand', 'hidden', []),
			discard: createZone('discard', 'public', [])
		}
		const result = moveCard(zones, 'hand', 'discard', card.id)
		expect(result).toBe(zones)
	})

	it('does not mutate input zones', () => {
		const card = createCard('K')
		const zones = {
			hand: createZone('hand', 'hidden', [card]),
			discard: createZone('discard', 'public', [])
		}
		moveCard(zones, 'hand', 'discard', card.id)
		expect(zones.hand.cards).toHaveLength(1)
	})
})
