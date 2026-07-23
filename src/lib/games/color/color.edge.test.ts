import { describe, expect, it } from 'vitest'
import { color } from './color'

const P1 = 'p1'
const P2 = 'p2'
const P3 = 'p3'
const PLAYERS = [P1, P2, P3]

function setup(players = PLAYERS) {
	return color.setup(players)
}

describe('Color — edge cases (#70)', () => {
	describe('onPlayerDisconnect', () => {
		it('ends game when < 2 players remain', () => {
			const s = setup([P1, P2])
			s.turnPlayerId = P1

			const r = color.onPlayerDisconnect!(s, P2)!

			expect(r.phase).toBe('gameover')
			expect(r.players).toEqual([P1])
		})

		it('passes turn to next player if disconnected was current', () => {
			const s = setup([P1, P2, P3])
			s.turnPlayerId = P2
			s.direction = 1

			const r = color.onPlayerDisconnect!(s, P2)!

			expect(r.players).toEqual([P1, P3])
			expect(r.turnPlayerId).toBe(P3) // direction=1 → next after P2 is P3
			expect(r.pendingChallenge).toBeNull()
		})

		it('keeps current turn if disconnecting player was not active', () => {
			const s = setup([P1, P2, P3])
			s.turnPlayerId = P1

			const r = color.onPlayerDisconnect!(s, P3)!

			expect(r.turnPlayerId).toBe(P1)
		})

		it('clears lastSkippedPlayer if that player disconnected', () => {
			const s = setup([P1, P2, P3])
			s.turnPlayerId = P1
			s.lastSkippedPlayer = P3

			const r = color.onPlayerDisconnect!(s, P3)!

			expect(r.lastSkippedPlayer).toBeNull()
		})
	})

	describe('empty deck behavior', () => {
		it('does not crash on draw when deck is empty', () => {
			const s = setup() as any
			s.zones['draw'].cards = []
			s.turnPlayerId = P1
			s.phase = 'playing'

			expect(() => color.applyAction(s, { playerId: P1, type: 'DRAW_CARD' })).not.toThrow()
		})
	})

	describe('getWinner returns null during playing phase', () => {
		it('returns null when phase is playing', () => {
			const s = setup() as any
			s.phase = 'playing'

			expect(color.getWinner(s)).toBeNull()
		})

		it('returns the player with empty hand at gameover', () => {
			const s = setup([P1, P2]) as any
			s.phase = 'gameover'
			s.zones[`hand_${P1}`].cards = []
			s.zones[`hand_${P2}`].cards = [{ id: 'c1', face: 'A', suit: 'hearts' } as any]

			expect(color.getWinner(s)).toBe(P1)
		})

		it('returns null when no player has empty hand at gameover (e.g. by disconnect)', () => {
			const s = setup([P1, P2]) as any
			s.phase = 'gameover'
			s.players = [P1]
			s.zones[`hand_${P1}`].cards = [{ id: 'c1' } as any]

			expect(color.getWinner(s)).toBeNull()
		})
	})
})
