import { describe, expect, it } from 'vitest'
import { war } from './war'

const P1 = 'p1'
const P2 = 'p2'

function setup() {
	return war.setup([P1, P2])
}

describe('War — edge cases (#70)', () => {
	it('ends game when one player has empty deck after NEXT_ROUND resolution', () => {
		const s = setup()
		// Give each player 1 card so round resolves and decks are empty
		s.zones[`deck_${P1}`].cards = [s.zones[`deck_${P1}`].cards[0]]
		s.zones[`deck_${P2}`].cards = [s.zones[`deck_${P2}`].cards[0]]

		// Reveal both cards
		let r = war.applyAction(s, { playerId: P1, type: 'REVEAL' } as any)
		r = war.applyAction(r, { playerId: P2, type: 'REVEAL' } as any)

		// Now in reviewing phase → resolve with NEXT_ROUND
		expect(r.phase).toBe('reviewing')
		r = war.applyAction(r, { playerId: P1, type: 'NEXT_ROUND' } as any)

		// Both decks empty → gameover
		expect(r.phase).toBe('gameover')
	})

	it('declares player with more cards as winner', () => {
		const s = setup()
		s.phase = 'gameover'
		// p2 has all the won cards
		s.zones[`won_${P2}`].cards = [{} as any, {} as any]
		s.zones[`won_${P1}`].cards = []
		s.zones[`deck_${P1}`].cards = []
		s.zones[`deck_${P2}`].cards = []

		const w = war.getWinner(s)
		expect(w).toBe(P2)
	})

	it('handles battle tie by discarding played cards (no crash)', () => {
		const s = setup()
		// Force identical face values on top of both decks
		const card1 = s.zones[`deck_${P1}`].cards[0]
		s.zones[`deck_${P2}`].cards[0] = { ...card1, id: `${card1.id}-copy` }

		// Reveal both
		let r = war.applyAction(s, { playerId: P1, type: 'REVEAL' } as any)
		r = war.applyAction(r, { playerId: P2, type: 'REVEAL' } as any)

		expect(r.phase).toBe('reviewing')

		// Resolve tied round
		r = war.applyAction(r, { playerId: P1, type: 'NEXT_ROUND' } as any)
		expect(['playing', 'gameover']).toContain(r.phase)

		// On tie, played cards are discarded (removed from game) — this is a design choice
		expect(r.zones[`played_${P1}`].cards.length).toBe(0)
		expect(r.zones[`played_${P2}`].cards.length).toBe(0)
	})

	it('does not lose cards during non-tie rounds', () => {
		const s = setup()
		// Force different face values to avoid tie discard
		s.zones[`deck_${P1}`].cards[0] = { id: 'fix-1', face: 'A', suit: 'spades', isHidden: true }
		s.zones[`deck_${P2}`].cards[0] = { id: 'fix-2', face: '2', suit: 'hearts', isHidden: true }

		const totalBefore = s.zones[`deck_${P1}`].cards.length + s.zones[`deck_${P2}`].cards.length

		let r = war.applyAction(s, { playerId: P1, type: 'REVEAL' } as any)
		r = war.applyAction(r, { playerId: P2, type: 'REVEAL' } as any)
		r = war.applyAction(r, { playerId: P1, type: 'NEXT_ROUND' } as any)

		const totalAfter =
			r.zones[`deck_${P1}`].cards.length +
			r.zones[`deck_${P2}`].cards.length +
			r.zones[`won_${P1}`].cards.length +
			r.zones[`won_${P2}`].cards.length

		// No cards lost on non-tie round
		expect(totalAfter).toBe(totalBefore)
	})

	describe('onPlayerDisconnect', () => {
		it('removes disconnected player and ends game if < 2 remain', () => {
			const s = setup()
			const result = war.onPlayerDisconnect!(s, P2)!
			expect(result.players).toEqual([P1])
			expect(result.phase).toBe('gameover')
		})
	})
})
