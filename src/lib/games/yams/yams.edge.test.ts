import { describe, expect, it } from 'vitest'
import { yams } from './yams'

const P1 = 'p1'
const P2 = 'p2'
const P3 = 'p3'

function setup(players = [P1, P2, P3]) {
	return yams.setup(players) as any
}

describe('Yams — edge cases (#70)', () => {
	describe('onPlayerDisconnect', () => {
		it('ends game when < 2 players remain', () => {
			const s = setup([P1, P2])
			s.turnPlayerId = P1

			const r = yams.onPlayerDisconnect!(s, P2)! as any

			expect(r.phase).toBe('gameover')
			expect(r.players).toEqual([P1])
		})

		it('passes turn to next player and resets dice on disconnect', () => {
			const s = setup([P1, P2, P3])
			s.turnPlayerId = P1
			s.dice = [5, 4, 3, 2, 1]
			s.held = [true, false, true, false, true]
			s.rollsRemaining = 0

			const r = yams.onPlayerDisconnect!(s, P1)! as any

			expect(r.turnPlayerId).toBe(P2)
			expect(r.dice).toEqual([1, 1, 1, 1, 1])
			expect(r.held).toEqual([false, false, false, false, false])
			expect(r.rollsRemaining).toBe(3)
		})

		it('keeps current state if disconnected player was not active', () => {
			const s = setup([P1, P2, P3])
			s.turnPlayerId = P1
			s.dice = [6, 6, 6, 6, 6]
			s.held = [true, true, true, true, true]
			s.rollsRemaining = 1

			const r = yams.onPlayerDisconnect!(s, P3)! as any

			expect(r.turnPlayerId).toBe(P1)
			expect(r.dice).toEqual([6, 6, 6, 6, 6])
			expect(r.rollsRemaining).toBe(1)
		})
	})

	describe('full grid completion', () => {
		it('ends game when phase is set to gameover (all categories filled)', () => {
			const s = setup([P1, P2]) as any
			s.phase = 'gameover'
			expect(yams.isOver!(s)).toBe(true)
		})

		it('does NOT end game when phase is still playing', () => {
			const s = setup() as any
			s.phase = 'playing'
			expect(yams.isOver!(s)).toBeFalsy()
		})
	})

	describe('exhausted rolls', () => {
		it('forces scoring after 3 rolls used (no ROLL action available)', () => {
			const s = setup() as any
			s.turnPlayerId = P1
			s.rollsRemaining = 0

			const actions = yams.getValidActions(s, P1) as any[]
			// No ROLL action available when rollsRemaining = 0
			const rollAction = actions.find((a) => a.type === 'ROLL')
			expect(rollAction).toBeUndefined()

			// SCORE actions should be available (must pick category)
			const scoreActions = actions.filter((a) => a.type === 'SCORE')
			expect(scoreActions.length).toBeGreaterThan(0)
		})

		it('offers ROLL action at start of turn (3 rolls remaining)', () => {
			const s = setup() as any
			s.turnPlayerId = P1
			s.rollsRemaining = 3

			const actions = yams.getValidActions(s, P1) as any[]
			const rollAction = actions.find((a) => a.type === 'ROLL')
			expect(rollAction).toBeDefined()
			// Cannot score before rolling
			const scoreActions = actions.filter((a) => a.type === 'SCORE')
			expect(scoreActions.length).toBe(0)
		})
	})

	describe('getWinner best score', () => {
		it('returns player with highest total score', () => {
			const s = setup([P1, P2, P3]) as any
			s.phase = 'gameover'
			const filled: Record<string, number> = {
				ones: 10,
				twos: 10,
				threes: 10,
				fours: 10,
				fives: 10,
				sixes: 10,
				threeOfAKind: 10,
				fourOfAKind: 10,
				fullHouse: 10,
				smallStraight: 10,
				largeStraight: 10,
				yams: 10,
				chance: 10
			}
			s.scores[P1] = { ...filled } // 130 total
			s.scores[P2] = { ...Object.fromEntries(Object.keys(filled).map((k) => [k, 20])) } // 260
			s.scores[P3] = { ...Object.fromEntries(Object.keys(filled).map((k) => [k, 15])) } // 195
			expect(yams.getWinner(s)).toBe(P2)
		})

		it('handles tie scores', () => {
			const s = setup([P1, P2]) as any
			s.phase = 'gameover'
			const filled: Record<string, number> = {
				ones: 15,
				twos: 15,
				threes: 15,
				fours: 15,
				fives: 15,
				sixes: 15,
				threeOfAKind: 15,
				fourOfAKind: 15,
				fullHouse: 15,
				smallStraight: 15,
				largeStraight: 15,
				yams: 15,
				chance: 15
			}
			s.scores[P1] = { ...filled }
			s.scores[P2] = { ...filled }
			const w = yams.getWinner(s)
			expect([P1, P2]).toContain(w)
		})
	})
})
