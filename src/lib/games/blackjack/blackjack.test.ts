import { describe, expect, it } from 'vitest'
import { createCard } from '$lib/engine/cards'
import { createZone } from '$lib/engine/zones'
import { type BlackjackState, blackjack, handValue } from './blackjack'

const P1 = 'p1'
const P2 = 'p2'
const PLAYERS = [P1, P2]

function setup(players = PLAYERS) {
	return blackjack.setup(players)
}

function stateWith(overrides: Partial<BlackjackState>): BlackjackState {
	return { ...setup(), ...overrides }
}

// --- handValue ---

describe('handValue', () => {
	it('A + K = 21', () => {
		expect(handValue([createCard('A'), createCard('K')])).toBe(21)
	})

	it('A + A = 12', () => {
		expect(handValue([createCard('A'), createCard('A')])).toBe(12)
	})

	it('A + A + 9 = 21', () => {
		expect(handValue([createCard('A'), createCard('A'), createCard('9')])).toBe(21)
	})

	it('A + 8 + 5 = 14', () => {
		expect(handValue([createCard('A'), createCard('8'), createCard('5')])).toBe(14)
	})

	it('J + Q + K = 30', () => {
		expect(handValue([createCard('J'), createCard('Q'), createCard('K')])).toBe(30)
	})

	it('empty = 0', () => {
		expect(handValue([])).toBe(0)
	})
})

// --- setup ---

describe('blackjack.setup', () => {
	it('deals 2 cards to each player', () => {
		const state = setup()
		PLAYERS.forEach((p) => expect(state.zones[`hand_${p}`].cards).toHaveLength(2))
	})

	it('deals 2 cards to dealer', () => {
		const state = setup()
		expect(state.zones['hand_dealer'].cards).toHaveLength(2)
	})

	it('deck has 208 - (players+1)*2 cards', () => {
		const state = setup()
		expect(state.zones['deck'].cards).toHaveLength(208 - (PLAYERS.length + 1) * 2)
	})

	it('turnPlayerId is players[0]', () => {
		const state = setup()
		expect(state.turnPlayerId).toBe(P1)
	})

	it('phase is playing', () => {
		expect(setup().phase).toBe('playing')
	})

	it('all players start as playing', () => {
		const state = setup()
		PLAYERS.forEach((p) => expect(state.playerStatus[p]).toBe('playing'))
	})

	it('activeGameId is blackjack', () => {
		expect(setup().activeGameId).toBe('blackjack')
	})

	it('works with 1 player', () => {
		const state = blackjack.setup([P1])
		expect(state.zones['hand_p1'].cards).toHaveLength(2)
		expect(state.zones['hand_dealer'].cards).toHaveLength(2)
	})
})

// --- getValidActions ---

describe('blackjack.getValidActions', () => {
	it('active player gets HIT, STAND, DOUBLE on 2-card hand', () => {
		const state = setup()
		const types = blackjack.getValidActions(state, P1).map((a) => a.type)
		expect(types).toContain('HIT')
		expect(types).toContain('STAND')
		expect(types).toContain('DOUBLE')
	})

	it('DOUBLE not available with 3+ cards', () => {
		const base = setup()
		const state: BlackjackState = {
			...base,
			zones: {
				...base.zones,
				[`hand_${P1}`]: createZone(
					`hand_${P1}`,
					'fan',
					[createCard('5'), createCard('3'), createCard('2')],
					P1
				)
			}
		}
		const types = blackjack.getValidActions(state, P1).map((a) => a.type)
		expect(types).not.toContain('DOUBLE')
		expect(types).toContain('HIT')
		expect(types).toContain('STAND')
	})

	it('inactive player gets no actions', () => {
		const state = setup()
		expect(blackjack.getValidActions(state, P2)).toHaveLength(0)
	})

	it('host gets NEW_ROUND and END_GAME in scoring', () => {
		const state = stateWith({ phase: 'scoring' })
		const types = blackjack.getValidActions(state, P1).map((a) => a.type)
		expect(types).toContain('NEW_ROUND')
		expect(types).toContain('END_GAME')
	})

	it('non-host gets nothing in scoring', () => {
		const state = stateWith({ phase: 'scoring' })
		expect(blackjack.getValidActions(state, P2)).toHaveLength(0)
	})

	it('gameover returns empty for all', () => {
		const state = stateWith({ phase: 'gameover' })
		PLAYERS.forEach((p) => expect(blackjack.getValidActions(state, p)).toHaveLength(0))
	})
})

// --- applyAction HIT ---

describe('blackjack.applyAction HIT', () => {
	it('adds card to hand and removes from deck', () => {
		const state = setup()
		const deckBefore = state.zones['deck'].cards.length
		const next = blackjack.applyAction(state, { type: 'HIT', playerId: P1 })
		expect(next.zones[`hand_${P1}`].cards).toHaveLength(3)
		expect(next.zones['deck'].cards).toHaveLength(deckBefore - 1)
	})

	it('does not mutate input state', () => {
		const state = setup()
		const frozen = Object.freeze({ ...state })
		expect(() => blackjack.applyAction(frozen, { type: 'HIT', playerId: P1 })).not.toThrow()
	})

	it('bust auto-advances to next player', () => {
		const base = setup()
		const bustHand = [createCard('K'), createCard('Q')]
		const state: BlackjackState = {
			...base,
			zones: {
				...base.zones,
				[`hand_${P1}`]: createZone(`hand_${P1}`, 'fan', bustHand, P1),
				deck: createZone('deck', 'hidden', [createCard('J'), ...base.zones['deck'].cards.slice(1)])
			}
		}
		const next = blackjack.applyAction(state, { type: 'HIT', playerId: P1 })
		expect(next.playerStatus[P1]).toBe('bust')
		expect(next.turnPlayerId).toBe(P2)
	})

	it('bust on last player triggers dealer resolve and goes to scoring', () => {
		const base = setup()
		const bustHand = [createCard('K'), createCard('Q')]
		const state: BlackjackState = {
			...base,
			turnPlayerId: P2,
			playerStatus: { [P1]: 'standing', [P2]: 'playing' },
			zones: {
				...base.zones,
				[`hand_${P2}`]: createZone(`hand_${P2}`, 'fan', bustHand, P2),
				deck: createZone('deck', 'hidden', [createCard('J'), ...base.zones['deck'].cards.slice(1)])
			}
		}
		const next = blackjack.applyAction(state, { type: 'HIT', playerId: P2 })
		expect(next.playerStatus[P2]).toBe('bust')
		expect(next.phase).toBe('scoring')
	})

	it('no-op when deck is empty', () => {
		const base = setup()
		const state: BlackjackState = {
			...base,
			zones: { ...base.zones, deck: createZone('deck', 'hidden', []) }
		}
		expect(blackjack.applyAction(state, { type: 'HIT', playerId: P1 })).toBe(state)
	})
})

// --- applyAction STAND ---

describe('blackjack.applyAction STAND', () => {
	it('sets status to standing and advances', () => {
		const state = setup()
		const next = blackjack.applyAction(state, { type: 'STAND', playerId: P1 })
		expect(next.playerStatus[P1]).toBe('standing')
		expect(next.turnPlayerId).toBe(P2)
	})

	it('last player stand triggers scoring phase', () => {
		const base = setup()
		const state: BlackjackState = {
			...base,
			turnPlayerId: P2,
			playerStatus: { [P1]: 'standing', [P2]: 'playing' }
		}
		const next = blackjack.applyAction(state, { type: 'STAND', playerId: P2 })
		expect(next.phase).toBe('scoring')
	})
})

// --- applyAction DOUBLE ---

describe('blackjack.applyAction DOUBLE', () => {
	it('draws exactly 1 card then auto-stands', () => {
		const state = setup()
		const handBefore = state.zones[`hand_${P1}`].cards.length
		const next = blackjack.applyAction(state, { type: 'DOUBLE', playerId: P1 })
		expect(next.zones[`hand_${P1}`].cards).toHaveLength(handBefore + 1)
		expect(next.playerStatus[P1]).not.toBe('playing')
	})

	it('marks bust correctly on double', () => {
		const base = setup()
		const state: BlackjackState = {
			...base,
			zones: {
				...base.zones,
				[`hand_${P1}`]: createZone(`hand_${P1}`, 'fan', [createCard('K'), createCard('Q')], P1),
				deck: createZone('deck', 'hidden', [createCard('J'), ...base.zones['deck'].cards.slice(1)])
			}
		}
		const next = blackjack.applyAction(state, { type: 'DOUBLE', playerId: P1 })
		expect(next.playerStatus[P1]).toBe('bust')
	})

	it('advance to next player after double', () => {
		const state = setup()
		const next = blackjack.applyAction(state, { type: 'DOUBLE', playerId: P1 })
		expect(next.turnPlayerId).toBe(P2)
	})
})

// --- applyAction END_GAME ---

describe('blackjack.applyAction END_GAME', () => {
	it('sets phase to gameover', () => {
		const state = stateWith({ phase: 'scoring' })
		const next = blackjack.applyAction(state, { type: 'END_GAME', playerId: P1 })
		expect(next.phase).toBe('gameover')
	})
})

// --- dealer resolution ---

describe('dealer auto-resolution', () => {
	it('dealer draws until >= 17', () => {
		const base = setup()
		// Set dealer hand to low value, force player to stand to trigger dealer turn
		const state: BlackjackState = {
			...base,
			turnPlayerId: P2,
			playerStatus: { [P1]: 'standing', [P2]: 'playing' },
			zones: {
				...base.zones,
				hand_dealer: createZone('hand_dealer', 'fan', [createCard('2'), createCard('3')]),
				deck: createZone('deck', 'hidden', [
					createCard('5'),
					createCard('6'),
					createCard('7'),
					createCard('K')
				])
			}
		}
		const next = blackjack.applyAction(state, { type: 'STAND', playerId: P2 })
		expect(next.phase).toBe('scoring')
		const dealerVal = handValue(next.zones['hand_dealer'].cards)
		expect(dealerVal).toBeGreaterThanOrEqual(17)
	})
})

// --- isOver / getWinner ---

describe('blackjack.isOver / getWinner', () => {
	it('isOver false during playing', () => {
		expect(blackjack.isOver(setup())).toBe(false)
	})

	it('isOver true in gameover', () => {
		expect(blackjack.isOver(stateWith({ phase: 'gameover' }))).toBe(true)
	})

	it('getWinner null when not gameover', () => {
		expect(blackjack.getWinner(setup())).toBeNull()
	})

	it('getWinner null when dealer wins (player lower)', () => {
		const base = setup()
		const state: BlackjackState = {
			...base,
			phase: 'gameover',
			playerStatus: { [P1]: 'standing', [P2]: 'standing' },
			zones: {
				...base.zones,
				hand_dealer: createZone('hand_dealer', 'fan', [createCard('K'), createCard('9')]),
				[`hand_${P1}`]: createZone(`hand_${P1}`, 'fan', [createCard('5'), createCard('7')], P1),
				[`hand_${P2}`]: createZone(`hand_${P2}`, 'fan', [createCard('6'), createCard('8')], P2)
			}
		}
		expect(blackjack.getWinner(state)).toBeNull()
	})

	it('getWinner null when all bust', () => {
		const base = setup()
		const state: BlackjackState = {
			...base,
			phase: 'gameover',
			playerStatus: { [P1]: 'bust', [P2]: 'bust' },
			zones: {
				...base.zones,
				hand_dealer: createZone('hand_dealer', 'fan', [createCard('K'), createCard('7')]),
				[`hand_${P1}`]: createZone(
					`hand_${P1}`,
					'fan',
					[createCard('K'), createCard('Q'), createCard('5')],
					P1
				),
				[`hand_${P2}`]: createZone(
					`hand_${P2}`,
					'fan',
					[createCard('K'), createCard('J'), createCard('3')],
					P2
				)
			}
		}
		expect(blackjack.getWinner(state)).toBeNull()
	})

	it('getWinner returns player who beats dealer', () => {
		const base = setup()
		const state: BlackjackState = {
			...base,
			phase: 'gameover',
			playerStatus: { [P1]: 'standing', [P2]: 'bust' },
			zones: {
				...base.zones,
				hand_dealer: createZone('hand_dealer', 'fan', [createCard('K'), createCard('7')]),
				[`hand_${P1}`]: createZone(`hand_${P1}`, 'fan', [createCard('K'), createCard('9')], P1),
				[`hand_${P2}`]: createZone(
					`hand_${P2}`,
					'fan',
					[createCard('K'), createCard('Q'), createCard('5')],
					P2
				)
			}
		}
		expect(blackjack.getWinner(state)).toBe(P1)
	})

	it('getWinner returns non-bust player when dealer busts', () => {
		const base = setup()
		const state: BlackjackState = {
			...base,
			phase: 'gameover',
			playerStatus: { [P1]: 'standing', [P2]: 'bust' },
			zones: {
				...base.zones,
				hand_dealer: createZone('hand_dealer', 'fan', [
					createCard('K'),
					createCard('Q'),
					createCard('5')
				]),
				[`hand_${P1}`]: createZone(`hand_${P1}`, 'fan', [createCard('5'), createCard('7')], P1),
				[`hand_${P2}`]: createZone(
					`hand_${P2}`,
					'fan',
					[createCard('K'), createCard('Q'), createCard('3')],
					P2
				)
			}
		}
		expect(blackjack.getWinner(state)).toBe(P1)
	})
})

// --- onPlayerDisconnect ---

describe('blackjack.onPlayerDisconnect', () => {
	it('gameover when last player disconnects', () => {
		const state = blackjack.setup([P1])
		const next = blackjack.onPlayerDisconnect!(state, P1)
		expect(next.phase).toBe('gameover')
	})

	it('removes player zones and status', () => {
		const state = setup()
		const next = blackjack.onPlayerDisconnect!(state, P2)
		expect(next.players).not.toContain(P2)
		expect(next.zones[`hand_${P2}`]).toBeUndefined()
		expect(next.playerStatus[P2]).toBeUndefined()
	})

	it('advances turn when disconnected player was active', () => {
		const state = setup()
		const next = blackjack.onPlayerDisconnect!(state, P1)
		expect(next.turnPlayerId).toBe(P2)
	})

	it('goes to scoring if disconnected player was last', () => {
		const base = setup()
		const state: BlackjackState = {
			...base,
			turnPlayerId: P2,
			playerStatus: { [P1]: 'standing', [P2]: 'playing' }
		}
		const next = blackjack.onPlayerDisconnect!(state, P2)
		expect(next.phase).toBe('scoring')
	})
})

// --- NEW_ROUND ---

describe('blackjack.applyAction NEW_ROUND', () => {
	it('resets to playing phase with fresh hands', () => {
		const scoring = stateWith({ phase: 'scoring' })
		const next = blackjack.applyAction(scoring, { type: 'NEW_ROUND', playerId: P1 })
		expect(next.phase).toBe('playing')
		PLAYERS.forEach((p) => expect(next.zones[`hand_${p}`].cards).toHaveLength(2))
		expect(next.zones['hand_dealer'].cards).toHaveLength(2)
	})

	it('keeps same players', () => {
		const scoring = stateWith({ phase: 'scoring' })
		const next = blackjack.applyAction(scoring, { type: 'NEW_ROUND', playerId: P1 })
		expect(next.players).toEqual(PLAYERS)
	})

	it('resets all player status to playing', () => {
		const scoring = stateWith({
			phase: 'scoring',
			playerStatus: { [P1]: 'bust', [P2]: 'standing' }
		})
		const next = blackjack.applyAction(scoring, { type: 'NEW_ROUND', playerId: P1 })
		PLAYERS.forEach((p) => expect(next.playerStatus[p]).toBe('playing'))
	})

	it('preserves options', () => {
		const scoring = stateWith({ phase: 'scoring', options: { autoRestart: 'auto' } })
		const next = blackjack.applyAction(scoring, { type: 'NEW_ROUND', playerId: P1 })
		expect(next.options.autoRestart).toBe('auto')
	})
})

// --- scheduleAction ---

describe('blackjack.scheduleAction', () => {
	it('returns null in playing phase regardless of option', () => {
		const state = stateWith({ options: { autoRestart: 'auto' } })
		expect(blackjack.scheduleAction!(state)).toBeNull()
	})

	it('returns null in scoring when manual mode', () => {
		const state = stateWith({ phase: 'scoring', options: { autoRestart: 'manual' } })
		expect(blackjack.scheduleAction!(state)).toBeNull()
	})

	it('returns NEW_ROUND after 5s in scoring when auto mode', () => {
		const state = stateWith({ phase: 'scoring', options: { autoRestart: 'auto' } })
		const scheduled = blackjack.scheduleAction!(state)
		expect(scheduled?.action.type).toBe('NEW_ROUND')
		expect(scheduled?.delayMs).toBe(5000)
	})
})
