import { describe, expect, it } from 'vitest'
import { presidents } from './presidents'

const P1 = 'p1'
const P2 = 'p2'
const P3 = 'p3'
const P4 = 'p4'

function setup(players = [P1, P2, P3, P4]) {
	return presidents.setup(players)
}

describe('Presidents — edge cases (#70)', () => {
	describe('onPlayerDisconnect', () => {
		it('ends game when last president quits', () => {
			const s = setup() as any
			s.finishOrder = [P1] // p1 is the president (winner)
			s.phase = 'playing'
			s.turnPlayerId = P2

			const r = presidents.onPlayerDisconnect!(s, P1)!

			expect(r.phase).toBe('gameover')
			expect(r.activePlayers).toEqual([P2, P3, P4])
		})

		it('ends game even if mid-game non-president quits', () => {
			const s = setup([P1, P2, P3, P4]) as any
			s.phase = 'playing'
			s.turnPlayerId = P1

			const r = presidents.onPlayerDisconnect!(s, P3)!

			expect(r.phase).toBe('gameover')
		})
	})

	describe('getWinner', () => {
		it('returns first in finish order at gameover', () => {
			const s = setup() as any
			s.phase = 'gameover'
			s.finishOrder = [P2, P1, P3]

			expect(presidents.getWinner(s)).toBe(P2)
		})

		it('returns null when no one has finished yet', () => {
			const s = setup() as any
			s.phase = 'gameover'
			s.finishOrder = []

			expect(presidents.getWinner(s)).toBeNull()
		})

		it('returns null during playing phase', () => {
			const s = setup() as any
			s.phase = 'playing'

			expect(presidents.getWinner(s)).toBeNull()
		})
	})

	describe('hand ties (same value different quantity cannot beat)', () => {
		it('single 2 beats single A', () => {
			const s = setup([P1, P2]) as any
			s.zones.pile.cards = [{ id: 'c1', face: 'A', suit: 'spades' }]
			s.lastPlay = { playerId: P1, comboType: 'single', value: 14 }
			s.turnPlayerId = P2

			// Give p2 a 2 (highest card)
			s.zones[`hand_${P2}`].cards = [{ id: 'c2', face: '2', suit: 'hearts' }]

			const validActions = presidents.getValidActions(s, P2) as any[]
			const playActions = validActions.filter((a) => a.type === 'PLAY')
			expect(playActions.length).toBeGreaterThan(0)
		})

		it('pair cannot be beaten by a single of higher value', () => {
			const s = setup([P1, P2]) as any
			s.zones.pile.cards = [
				{ id: 'c1', face: '5', suit: 'spades' },
				{ id: 'c2', face: '5', suit: 'hearts' }
			]
			s.lastPlay = { playerId: P1, comboType: 'pair', value: 5 }
			s.sameValueLock = false
			s.turnPlayerId = P2

			// Give p2 a single high card and a pair of low cards
			s.zones[`hand_${P2}`].cards = [
				{ id: 'c3', face: 'K', suit: 'hearts' },
				{ id: 'c4', face: '3', suit: 'diamonds' },
				{ id: 'c5', face: '3', suit: 'clubs' }
			]

			const validActions = presidents.getValidActions(s, P2) as any[]
			const playActions = validActions.filter((a) => a.type === 'PLAY')

			// The only valid plays should be pairs (can't beat pair with single)
			for (const pa of playActions) {
				const cardCount = pa.payload.cardIds.length
				expect(cardCount).toBe(2) // must be a pair or more
			}
		})
	})
})
