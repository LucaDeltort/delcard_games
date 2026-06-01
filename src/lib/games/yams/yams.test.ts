import { describe, expect, it } from 'vitest'
import type { YamsState } from './yams'
import {
	grandTotal,
	scoreCategory,
	scoreChance,
	scoreFourOfAKind,
	scoreFullHouse,
	scoreLargeStraight,
	scoreSmallStraight,
	scoreThreeOfAKind,
	scoreUpper,
	scoreYams,
	upperBonus,
	yams
} from './yams'

const P1 = 'p1'
const P2 = 'p2'
const PLAYERS = [P1, P2]

function setup() {
	return yams.setup(PLAYERS)
}

function withState(overrides: Partial<YamsState>): YamsState {
	return { ...setup(), ...overrides }
}

// ── setup ───────────────────────────────────────────────────────────────────

describe('yams.setup', () => {
	it('has correct players', () => {
		expect(setup().players).toEqual(PLAYERS)
	})

	it('starts in rolling phase', () => {
		expect(setup().phase).toBe('rolling')
	})

	it('activeGameId is yams', () => {
		expect(setup().activeGameId).toBe('yams')
	})

	it('dice has length 5', () => {
		expect(setup().dice).toHaveLength(5)
	})

	it('rollsRemaining is 3', () => {
		expect(setup().rollsRemaining).toBe(3)
	})

	it('held is all false', () => {
		expect(setup().held).toEqual([false, false, false, false, false])
	})

	it('zones is empty', () => {
		expect(setup().zones).toEqual({})
	})

	it('each player has 13 null score entries', () => {
		const s = setup()
		for (const p of PLAYERS) {
			const entries = Object.values(s.scores[p])
			expect(entries).toHaveLength(13)
			expect(entries.every((v) => v === null)).toBe(true)
		}
	})
})

// ── getValidActions ─────────────────────────────────────────────────────────

describe('yams.getValidActions', () => {
	it('returns [] for off-turn player', () => {
		expect(yams.getValidActions(setup(), P2)).toEqual([])
	})

	it('returns [] when gameover', () => {
		const s = withState({ phase: 'gameover' })
		expect(yams.getValidActions(s, P1)).toEqual([])
	})

	it('before first roll: only ROLL available', () => {
		const actions = yams.getValidActions(setup(), P1)
		expect(actions.map((a) => a.type)).toEqual(['ROLL'])
	})

	it('after first roll: ROLL + TOGGLE_HOLD×5 + SCORE per unfilled category', () => {
		const s = withState({ rollsRemaining: 2 })
		const actions = yams.getValidActions(s, P1)
		expect(actions.filter((a) => a.type === 'ROLL')).toHaveLength(1)
		expect(actions.filter((a) => a.type === 'TOGGLE_HOLD')).toHaveLength(5)
		expect(actions.filter((a) => a.type === 'SCORE')).toHaveLength(13)
	})

	it('after third roll (rollsRemaining=0): only SCORE actions', () => {
		const s = withState({ rollsRemaining: 0 })
		const actions = yams.getValidActions(s, P1)
		expect(actions.filter((a) => a.type === 'ROLL')).toHaveLength(0)
		expect(actions.filter((a) => a.type === 'TOGGLE_HOLD')).toHaveLength(0)
		expect(actions.filter((a) => a.type === 'SCORE')).toHaveLength(13)
	})

	it('already-filled category not offered as SCORE', () => {
		const s = withState({
			rollsRemaining: 1,
			scores: {
				...setup().scores,
				[P1]: { ...setup().scores[P1], ones: 3 }
			}
		})
		const scoreActions = yams.getValidActions(s, P1).filter((a) => a.type === 'SCORE')
		expect(scoreActions.map((a) => (a.payload as { category: string }).category)).not.toContain(
			'ones'
		)
		expect(scoreActions).toHaveLength(12)
	})
})

// ── applyAction: ROLL ───────────────────────────────────────────────────────

describe('yams.applyAction ROLL', () => {
	it('decrements rollsRemaining', () => {
		const s = yams.applyAction(setup(), { type: 'ROLL', playerId: P1 })
		expect(s.rollsRemaining).toBe(2)
	})

	it('dice values are in [1,6]', () => {
		const s = yams.applyAction(setup(), { type: 'ROLL', playerId: P1 })
		expect(s.dice).toHaveLength(5)
		for (const d of s.dice) {
			expect(d).toBeGreaterThanOrEqual(1)
			expect(d).toBeLessThanOrEqual(6)
		}
	})

	it('held dice are unchanged', () => {
		const s0 = withState({
			rollsRemaining: 2,
			dice: [6, 6, 6, 6, 6],
			held: [true, true, false, false, false]
		})
		const s1 = yams.applyAction(s0, { type: 'ROLL', playerId: P1 })
		expect(s1.dice[0]).toBe(6)
		expect(s1.dice[1]).toBe(6)
	})

	it('no-op when rollsRemaining is 0', () => {
		const s = withState({ rollsRemaining: 0 })
		expect(yams.applyAction(s, { type: 'ROLL', playerId: P1 })).toBe(s)
	})

	it('no-op for off-turn player', () => {
		const s = setup()
		expect(yams.applyAction(s, { type: 'ROLL', playerId: P2 })).toBe(s)
	})

	it('does not mutate input state', () => {
		const s = setup()
		const frozen = Object.freeze({ ...s, dice: Object.freeze([...s.dice]) })
		expect(() =>
			yams.applyAction(frozen as YamsState, { type: 'ROLL', playerId: P1 })
		).not.toThrow()
	})
})

// ── applyAction: TOGGLE_HOLD ────────────────────────────────────────────────

describe('yams.applyAction TOGGLE_HOLD', () => {
	it('sets held[index] to true', () => {
		const s = withState({ rollsRemaining: 2 })
		const s1 = yams.applyAction(s, { type: 'TOGGLE_HOLD', playerId: P1, payload: { index: 2 } })
		expect(s1.held[2]).toBe(true)
	})

	it('toggles held[index] back to false', () => {
		const s = withState({ rollsRemaining: 2, held: [false, false, true, false, false] })
		const s1 = yams.applyAction(s, { type: 'TOGGLE_HOLD', playerId: P1, payload: { index: 2 } })
		expect(s1.held[2]).toBe(false)
	})

	it('no-op before first roll (rollsRemaining=3)', () => {
		const s = setup()
		expect(yams.applyAction(s, { type: 'TOGGLE_HOLD', playerId: P1, payload: { index: 0 } })).toBe(
			s
		)
	})

	it('no-op when rollsRemaining=0', () => {
		const s = withState({ rollsRemaining: 0 })
		expect(yams.applyAction(s, { type: 'TOGGLE_HOLD', playerId: P1, payload: { index: 0 } })).toBe(
			s
		)
	})
})

// ── applyAction: SCORE ──────────────────────────────────────────────────────

describe('yams.applyAction SCORE', () => {
	it('writes computed score to scorecard', () => {
		const s = withState({ rollsRemaining: 1, dice: [3, 3, 3, 1, 2] })
		const s1 = yams.applyAction(s, { type: 'SCORE', playerId: P1, payload: { category: 'threes' } })
		expect(s1.scores[P1].threes).toBe(9)
	})

	it('writes 0 when category yields no match', () => {
		const s = withState({ rollsRemaining: 1, dice: [1, 2, 3, 4, 5] })
		const s1 = yams.applyAction(s, { type: 'SCORE', playerId: P1, payload: { category: 'yams' } })
		expect(s1.scores[P1].yams).toBe(0)
	})

	it('resets dice, held, rollsRemaining', () => {
		const s = withState({
			rollsRemaining: 0,
			dice: [5, 5, 5, 5, 5],
			held: [true, true, true, true, true]
		})
		const s1 = yams.applyAction(s, { type: 'SCORE', playerId: P1, payload: { category: 'yams' } })
		expect(s1.dice).toEqual([1, 1, 1, 1, 1])
		expect(s1.held).toEqual([false, false, false, false, false])
		expect(s1.rollsRemaining).toBe(3)
	})

	it('advances turnPlayerId to next player', () => {
		const s = withState({ rollsRemaining: 1 })
		const s1 = yams.applyAction(s, { type: 'SCORE', playerId: P1, payload: { category: 'chance' } })
		expect(s1.turnPlayerId).toBe(P2)
	})

	it('no-op before first roll', () => {
		const s = setup()
		expect(
			yams.applyAction(s, { type: 'SCORE', playerId: P1, payload: { category: 'chance' } })
		).toBe(s)
	})

	it('no-op if category already filled', () => {
		const s = withState({
			rollsRemaining: 1,
			scores: { ...setup().scores, [P1]: { ...setup().scores[P1], chance: 15 } }
		})
		expect(
			yams.applyAction(s, { type: 'SCORE', playerId: P1, payload: { category: 'chance' } })
		).toBe(s)
	})

	it('sets gameover when last category is filled', () => {
		const filledP1 = Object.fromEntries(
			[
				'ones',
				'twos',
				'threes',
				'fours',
				'fives',
				'sixes',
				'threeOfAKind',
				'fourOfAKind',
				'fullHouse',
				'smallStraight',
				'largeStraight',
				'yams',
				'chance'
			].map((c, i) => [c, i])
		) as Record<string, number>
		filledP1.chance = null as unknown as number

		const filledP2 = Object.fromEntries(
			[
				'ones',
				'twos',
				'threes',
				'fours',
				'fives',
				'sixes',
				'threeOfAKind',
				'fourOfAKind',
				'fullHouse',
				'smallStraight',
				'largeStraight',
				'yams',
				'chance'
			].map((c, i) => [c, i + 10])
		) as Record<string, number>

		const s = withState({
			rollsRemaining: 1,
			scores: { [P1]: filledP1, [P2]: filledP2 } as unknown as YamsState['scores']
		})
		const s1 = yams.applyAction(s, { type: 'SCORE', playerId: P1, payload: { category: 'chance' } })
		expect(s1.phase).toBe('gameover')
	})
})

// ── scoring functions ───────────────────────────────────────────────────────

describe('scoreUpper', () => {
	it('sums matching face', () => expect(scoreUpper(3, [3, 3, 1, 3, 5])).toBe(9))
	it('returns 0 when no match', () => expect(scoreUpper(6, [1, 2, 3, 4, 5])).toBe(0))
})

describe('scoreThreeOfAKind', () => {
	it('sums all when ≥3 same', () => expect(scoreThreeOfAKind([3, 3, 3, 4, 5])).toBe(18))
	it('returns 0 when no triplet', () => expect(scoreThreeOfAKind([2, 2, 3, 3, 4])).toBe(0))
	it('accepts five-of-a-kind', () => expect(scoreThreeOfAKind([6, 6, 6, 6, 6])).toBe(30))
})

describe('scoreFourOfAKind', () => {
	it('sums all when ≥4 same', () => expect(scoreFourOfAKind([4, 4, 4, 4, 2])).toBe(18))
	it('returns 0 when only triplet', () => expect(scoreFourOfAKind([4, 4, 4, 3, 2])).toBe(0))
	it('accepts five-of-a-kind', () => expect(scoreFourOfAKind([6, 6, 6, 6, 6])).toBe(30))
})

describe('scoreFullHouse', () => {
	it('returns 25 for pair+triple', () => expect(scoreFullHouse([2, 2, 3, 3, 3])).toBe(25))
	it('returns 25 for triple+pair order', () => expect(scoreFullHouse([2, 2, 2, 3, 3])).toBe(25))
	it('five-of-a-kind does NOT count', () => expect(scoreFullHouse([6, 6, 6, 6, 6])).toBe(0))
	it('returns 0 for straight', () => expect(scoreFullHouse([1, 2, 3, 4, 5])).toBe(0))
})

describe('scoreSmallStraight', () => {
	it('detects 1-2-3-4', () => expect(scoreSmallStraight([1, 2, 3, 4, 6])).toBe(30))
	it('detects 2-3-4-5', () => expect(scoreSmallStraight([2, 3, 4, 5, 1])).toBe(30))
	it('detects 3-4-5-6', () => expect(scoreSmallStraight([3, 4, 5, 6, 1])).toBe(30))
	it('returns 0 for gap', () => expect(scoreSmallStraight([1, 2, 3, 5, 6])).toBe(0))
})

describe('scoreLargeStraight', () => {
	it('detects 1-2-3-4-5', () => expect(scoreLargeStraight([1, 2, 3, 4, 5])).toBe(40))
	it('detects 2-3-4-5-6', () => expect(scoreLargeStraight([2, 3, 4, 5, 6])).toBe(40))
	it('returns 0 for small straight', () => expect(scoreLargeStraight([1, 2, 3, 4, 6])).toBe(0))
})

describe('scoreYams', () => {
	it('returns 50 for five-of-a-kind', () => expect(scoreYams([5, 5, 5, 5, 5])).toBe(50))
	it('returns 0 for four-of-a-kind', () => expect(scoreYams([5, 5, 5, 5, 4])).toBe(0))
})

describe('scoreChance', () => {
	it('sums all dice', () => expect(scoreChance([1, 2, 3, 4, 5])).toBe(15))
})

describe('upperBonus', () => {
	it('returns 35 when upper total is exactly 63', () => {
		const scores = {
			ones: 3,
			twos: 6,
			threes: 9,
			fours: 12,
			fives: 15,
			sixes: 18,
			threeOfAKind: null,
			fourOfAKind: null,
			fullHouse: null,
			smallStraight: null,
			largeStraight: null,
			yams: null,
			chance: null
		}
		expect(upperBonus(scores)).toBe(35)
	})

	it('returns 0 when upper total is 62', () => {
		const scores = {
			ones: 3,
			twos: 6,
			threes: 9,
			fours: 12,
			fives: 15,
			sixes: 17,
			threeOfAKind: null,
			fourOfAKind: null,
			fullHouse: null,
			smallStraight: null,
			largeStraight: null,
			yams: null,
			chance: null
		}
		expect(upperBonus(scores)).toBe(0)
	})

	it('treats null as 0', () => {
		const scores = Object.fromEntries(
			[
				'ones',
				'twos',
				'threes',
				'fours',
				'fives',
				'sixes',
				'threeOfAKind',
				'fourOfAKind',
				'fullHouse',
				'smallStraight',
				'largeStraight',
				'yams',
				'chance'
			].map((c) => [c, null])
		)
		expect(upperBonus(scores as YamsState['scores'][string])).toBe(0)
	})
})

describe('grandTotal', () => {
	it('includes upper bonus', () => {
		const scores = {
			ones: 3,
			twos: 6,
			threes: 9,
			fours: 12,
			fives: 15,
			sixes: 18,
			threeOfAKind: 0,
			fourOfAKind: 0,
			fullHouse: 0,
			smallStraight: 0,
			largeStraight: 0,
			yams: 0,
			chance: 0
		}
		expect(grandTotal(scores)).toBe(63 + 35)
	})
})

// ── isOver / getWinner ──────────────────────────────────────────────────────

describe('yams.isOver / getWinner', () => {
	it('isOver false during rolling', () => {
		expect(yams.isOver(setup())).toBe(false)
	})

	it('isOver true when gameover', () => {
		expect(yams.isOver(withState({ phase: 'gameover' }))).toBe(true)
	})

	it('getWinner returns null while not gameover', () => {
		expect(yams.getWinner(setup())).toBeNull()
	})

	it('getWinner returns player with higher total', () => {
		const s = withState({
			phase: 'gameover',
			scores: {
				[P1]: {
					ones: 1,
					twos: 0,
					threes: 0,
					fours: 0,
					fives: 0,
					sixes: 0,
					threeOfAKind: 0,
					fourOfAKind: 0,
					fullHouse: 0,
					smallStraight: 0,
					largeStraight: 0,
					yams: 50,
					chance: 0
				},
				[P2]: {
					ones: 0,
					twos: 0,
					threes: 0,
					fours: 0,
					fives: 0,
					sixes: 0,
					threeOfAKind: 0,
					fourOfAKind: 0,
					fullHouse: 0,
					smallStraight: 0,
					largeStraight: 0,
					yams: 0,
					chance: 0
				}
			}
		})
		expect(yams.getWinner(s)).toBe(P1)
	})
})

// ── onPlayerDisconnect ──────────────────────────────────────────────────────

describe('yams.onPlayerDisconnect', () => {
	it('removes player from players and scores', () => {
		const s = yams.onPlayerDisconnect!(setup(), P2)
		expect(s.players).not.toContain(P2)
		expect(s.scores[P2]).toBeUndefined()
	})

	it('ends game when fewer than 2 remain', () => {
		const s = yams.onPlayerDisconnect!(setup(), P2)
		expect(s.phase).toBe('gameover')
	})

	it('advances turn when disconnected player was active', () => {
		const P3 = 'p3'
		const s = yams.setup([P1, P2, P3])
		const s1 = yams.onPlayerDisconnect!(s, P1)
		expect(s1.turnPlayerId).not.toBe(P1)
		expect(s1.rollsRemaining).toBe(3)
		expect(s1.held).toEqual([false, false, false, false, false])
	})

	it('keeps turn when disconnected player was not active', () => {
		const s = yams.setup([P1, P2, 'p3'])
		const s1 = yams.onPlayerDisconnect!(s, P2)
		expect(s1.turnPlayerId).toBe(P1)
	})
})
