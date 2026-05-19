import { describe, expect, it } from 'vitest'
import type { Card } from '$lib/core/types'
import { purple } from './purple'

const P1 = 'p1'
const P2 = 'p2'
const PLAYERS = [P1, P2]

function setup() {
	return purple.setup(PLAYERS)
}

const isRed = (card: Card) => card.suit === 'hearts' || card.suit === 'diamonds'

describe('purple.setup', () => {
	it('initializes deck with 52 cards', () => {
		const state = setup()
		expect(state.zones['deck'].cards).toHaveLength(52)
	})

	it('creates penalty banks for each player', () => {
		const state = setup()
		PLAYERS.forEach((p) => {
			expect(state.zones[`penaltyBank_${p}`]).toBeDefined()
			expect(state.zones[`penaltyBank_${p}`].cards).toHaveLength(0)
		})
	})

	it('creates a playing bank', () => {
		const state = setup()
		expect(state.zones['playingBank']).toBeDefined()
		expect(state.zones['playingBank'].cards).toHaveLength(0)
	})

	it('starts in betting phase', () => {
		const state = setup()
		expect(state.phase).toBe('betting')
	})
})

describe('purple.getValidActions', () => {
	it('active player can bet in betting phase', () => {
		const state = setup()
		const actions = purple.getValidActions(state, state.turnPlayerId)
		expect(actions.map((a) => a.type)).toContain('BET_RED')
		expect(actions.map((a) => a.type)).toContain('BET_BLACK')
		expect(actions.map((a) => a.type)).toContain('BET_PURPLE')
	})

	it('active player can stop when 3 bets are won', () => {
		const state = { ...setup(), turnBets: 3 }
		const actions = purple.getValidActions(state, state.turnPlayerId)
		expect(actions.map((a) => a.type)).toContain('STOP')
	})
})

describe('purple.applyAction', () => {
	it('moves card to playing bank on successful Red/Black bet', () => {
		let state = setup()
		const topCard = state.zones['deck'].cards[0]
		const color = topCard.suit === 'hearts' || topCard.suit === 'diamonds' ? 'red' : 'black'
		const actionType = color === 'red' ? 'BET_RED' : 'BET_BLACK'

		state = purple.applyAction(state, { type: actionType, playerId: state.turnPlayerId })

		expect(state.zones['playingBank'].cards).toHaveLength(1)
		expect(state.zones['playingBank'].cards[0].id).toBe(topCard.id)
		expect(state.phase).toBe('betting') // Needs 3 cards for decision
	})

	it('transitions to decision phase after 3 successful bets', () => {
		let state = setup()

		// Force win by looking at deck
		for (let i = 0; i < 3; i++) {
			const card = state.zones['deck'].cards[0]
			const color = card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black'
			const actionType = color === 'red' ? 'BET_RED' : 'BET_BLACK'
			state = purple.applyAction(state, { type: actionType, playerId: state.turnPlayerId })
		}

		expect(state.turnBets).toBe(3)
		expect(state.phase).toBe('decision')
	})

	it('handles BET_PURPLE success', () => {
		let state = setup()
		const cards = state.zones['deck'].cards.slice(0, 2)

		// Instead of guessing, let's just check if the result is consistent with the logic
		state = purple.applyAction(state, { type: 'BET_PURPLE', playerId: state.turnPlayerId })

		const actualWin = isRed(cards[0]) !== isRed(cards[1])
		if (actualWin) {
			expect(state.turnBets).toBe(2)
			expect(state.phase).toBe('betting')
		} else {
			expect(state.phase).toBe('failing')
		}
		expect(state.zones['playingBank'].cards).toHaveLength(2)
	})

	it('moves everything to penalty bank on fail after delay', () => {
		let state = setup()

		// Add some cards to playingBank
		state = purple.applyAction(state, { type: 'BET_RED', playerId: P1 }) // win or fail, just get something in there

		// Force fail
		const card = state.zones['deck'].cards[0]
		const isRed = card.suit === 'hearts' || card.suit === 'diamonds'
		const actionType = isRed ? 'BET_BLACK' : 'BET_RED'

		state = purple.applyAction(state, { type: actionType, playerId: P1 })

		expect(state.phase).toBe('failing')

		// Simulate FINALIZE_FAILURE
		state = purple.applyAction(state, { type: 'FINALIZE_FAILURE', playerId: P1 })

		expect(state.zones['playingBank'].cards).toHaveLength(0)
		expect(state.zones[`penaltyBank_${P1}`].cards.length).toBeGreaterThan(0)
		expect(state.phase).toBe('betting')
	})

	it('banks penalties and resets deck on STOP', () => {
		let state = setup()
		state.turnBets = 3
		state.zones[`penaltyBank_${P1}`].cards = [{ id: 'c1', suit: 'hearts', value: 'A', face: 'up' }]

		state = purple.applyAction(state, { type: 'STOP', playerId: P1 })

		expect(state.scores[P1]).toBe(1)
		expect(state.zones[`penaltyBank_${P1}`].cards).toHaveLength(0)
		expect(state.zones['playingBank'].cards).toHaveLength(0)
		expect(state.zones['deck'].cards).toHaveLength(52)
		expect(state.turnPlayerId).toBe(P2)
	})

	it('reduces score on DECREASE_SCORE', () => {
		let state = setup()
		state.scores[P1] = 5

		state = purple.applyAction(state, { type: 'DECREASE_SCORE', playerId: P1 })

		expect(state.scores[P1]).toBe(4)
		expect(state.lastScoreEvent).toEqual({ pid: P1, timestamp: expect.any(Number) })
	})

	it('refills deck and banks penalties when deck is empty', () => {
		let state = setup()
		state.zones['deck'].cards = []
		state.zones[`penaltyBank_${P1}`].cards = [{ id: 'c1', suit: 'hearts', value: 'A', face: 'up' }]
		state.zones[`penaltyBank_${P2}`].cards = [{ id: 'c2', suit: 'spades', value: 'K', face: 'up' }]

		// Trigger a bet to force refill
		state = purple.applyAction(state, { type: 'BET_RED', playerId: P1 })

		expect(state.scores[P1]).toBe(1)
		expect(state.zones[`penaltyBank_${P1}`].cards).toHaveLength(0)
		expect(state.zones[`penaltyBank_${P2}`].cards).toHaveLength(0)
		expect(state.zones['deck'].cards.length).toBe(1) // (1 from P1 + 1 from P2) - 1 drawn
	})
})
