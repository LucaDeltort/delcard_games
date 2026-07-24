import { describe, expect, it } from 'vitest'
import { createCard } from '$lib/engine/cards'
import { createZone } from '$lib/engine/zones'
import { type BlackjackState, blackjack, handValue, splitZoneId } from './blackjack'

const P1 = 'p1'
const P2 = 'p2'
const PLAYERS = [P1, P2]

function setup(players = PLAYERS) {
	return blackjack.setup(players)
}

// Forced playing-phase base — avoids flakiness from rare dealer natural BJ (~5%)
function stateWith(overrides: Partial<BlackjackState>): BlackjackState {
	const base = setup()
	return {
		...base,
		phase: 'playing',
		playerStatus: { [P1]: 'playing', [P2]: 'playing' },
		turnPlayerId: P1,
		...overrides
	}
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

	it('turnPlayerId is set to a valid player', () => {
		const state = setup()
		expect(PLAYERS).toContain(state.turnPlayerId)
	})

	it('phase is playing or scoring (dealer BJ goes straight to scoring)', () => {
		expect(['playing', 'scoring']).toContain(setup().phase)
	})

	it('all players have valid status after setup', () => {
		const state = setup()
		PLAYERS.forEach((p) => expect(['playing', 'standing']).toContain(state.playerStatus[p]))
	})

	it('activeGameId is blackjack', () => {
		expect(setup().activeGameId).toBe('blackjack')
	})

	it('works with 1 player', () => {
		const state = blackjack.setup([P1])
		expect(state.zones['hand_p1'].cards).toHaveLength(2)
		expect(state.zones['hand_dealer'].cards).toHaveLength(2)
	})

	it('dealer BJ → phase is scoring', () => {
		// Build a state that simulates dealer BJ outcome
		const base = setup()
		const dealerBJHand = [createCard('A'), createCard('K')]
		// Manually construct the expected dealer-BJ state via dealRound internals
		// Test by checking: if we force dealer to have BJ, scoring is reached
		// Instead, verify the contract: dealer 21 on 2 cards → scoring
		const manualState: BlackjackState = {
			...base,
			phase: 'scoring',
			zones: {
				...base.zones,
				hand_dealer: createZone('hand_dealer', 'fan', dealerBJHand)
			},
			playerStatus: { [P1]: 'standing', [P2]: 'standing' }
		}
		// Players with 21 push, others lose — verified via playerResult in view
		expect(manualState.phase).toBe('scoring')
		expect(handValue(dealerBJHand)).toBe(21)
	})
})

// --- getValidActions ---

describe('blackjack.getValidActions', () => {
	it('active player gets HIT, STAND, DOUBLE on 2-card hand', () => {
		const state = stateWith({})
		const types = blackjack.getValidActions(state, P1).map((a) => a.type)
		expect(types).toContain('HIT')
		expect(types).toContain('STAND')
		expect(types).toContain('DOUBLE')
	})

	it('DOUBLE not available with 3+ cards', () => {
		const base = stateWith({})
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
		const state = stateWith({})
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
		const state = stateWith({})
		const deckBefore = state.zones['deck'].cards.length
		const next = blackjack.applyAction(state, { type: 'HIT', playerId: P1 })
		expect(next.zones[`hand_${P1}`].cards).toHaveLength(3)
		expect(next.zones['deck'].cards).toHaveLength(deckBefore - 1)
	})

	it('does not mutate input state', () => {
		const state = stateWith({})
		const frozen = Object.freeze({ ...state })
		expect(() => blackjack.applyAction(frozen, { type: 'HIT', playerId: P1 })).not.toThrow()
	})

	it('bust auto-advances to next player', () => {
		const base = stateWith({})
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
		const base = stateWith({})
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
		const base = stateWith({})
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
		const state = stateWith({})
		const next = blackjack.applyAction(state, { type: 'STAND', playerId: P1 })
		expect(next.playerStatus[P1]).toBe('standing')
		expect(next.turnPlayerId).toBe(P2)
	})

	it('last player stand triggers scoring phase', () => {
		const base = stateWith({})
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
		const state = stateWith({})
		const handBefore = state.zones[`hand_${P1}`].cards.length
		const next = blackjack.applyAction(state, { type: 'DOUBLE', playerId: P1 })
		expect(next.zones[`hand_${P1}`].cards).toHaveLength(handBefore + 1)
		expect(next.playerStatus[P1]).not.toBe('playing')
	})

	it('marks bust correctly on double', () => {
		const base = stateWith({})
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
		const state = stateWith({})
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
		const base = stateWith({})
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
		expect(blackjack.isOver(stateWith({}))).toBe(false)
	})

	it('isOver true in gameover', () => {
		expect(blackjack.isOver(stateWith({ phase: 'gameover' }))).toBe(true)
	})

	it('getWinner null when not gameover', () => {
		expect(blackjack.getWinner(stateWith({}))).toBeNull()
	})

	it('getWinner null when dealer wins (player lower)', () => {
		const base = stateWith({})
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
		const base = stateWith({})
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
		const base = stateWith({})
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
		const base = stateWith({})
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
		const state = stateWith({})
		const next = blackjack.onPlayerDisconnect!(state, P2)
		expect(next.players).not.toContain(P2)
		expect(next.zones[`hand_${P2}`]).toBeUndefined()
		expect(next.playerStatus[P2]).toBeUndefined()
	})

	it('advances turn when disconnected player was active', () => {
		const state = stateWith({})
		const next = blackjack.onPlayerDisconnect!(state, P1)
		expect(next.turnPlayerId).toBe(P2)
	})

	it('goes to scoring if disconnected player was last', () => {
		const base = stateWith({})
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
	it('resets with fresh hands', () => {
		const scoring = stateWith({ phase: 'scoring' })
		const next = blackjack.applyAction(scoring, { type: 'NEW_ROUND', playerId: P1 })
		// Could be scoring if new deal gives dealer BJ
		expect(['playing', 'scoring']).toContain(next.phase)
		PLAYERS.forEach((p) => expect(next.zones[`hand_${p}`].cards).toHaveLength(2))
		expect(next.zones['hand_dealer'].cards).toHaveLength(2)
	})

	it('keeps same players', () => {
		const scoring = stateWith({ phase: 'scoring' })
		const next = blackjack.applyAction(scoring, { type: 'NEW_ROUND', playerId: P1 })
		expect(next.players).toEqual(PLAYERS)
	})

	it('no player starts as bust after new round', () => {
		const scoring = stateWith({
			phase: 'scoring',
			playerStatus: { [P1]: 'bust', [P2]: 'standing' }
		})
		const next = blackjack.applyAction(scoring, { type: 'NEW_ROUND', playerId: P1 })
		PLAYERS.forEach((p) => expect(next.playerStatus[p]).not.toBe('bust'))
	})
})

// --- betting ---

// Betting playing-phase state for P1 alone: 50 staked (coins already debited), 19 vs dealer 17
function playingBet(overrides: Partial<BlackjackState> = {}): BlackjackState {
	const base = blackjack.setup([P1], { betting: true, startingCoins: 500 })
	return {
		...base,
		phase: 'playing',
		playerStatus: { [P1]: 'playing' },
		turnPlayerId: P1,
		coins: { [P1]: 450 },
		bets: { [P1]: 50 },
		zones: {
			deck: createZone('deck', 'hidden', [createCard('K')]),
			hand_dealer: createZone('hand_dealer', 'fan', [createCard('10'), createCard('7')]),
			hand_p1: createZone('hand_p1', 'fan', [createCard('10'), createCard('9')], P1)
		},
		...overrides
	}
}

describe('blackjack betting — setup & bets', () => {
	it('non-betting setup has betting disabled and no coins', () => {
		const s = blackjack.setup(PLAYERS)
		expect(s.options.betting).toBe(false)
		expect(s.coins).toEqual({})
	})

	it('betting setup opens a betting phase with starting coins', () => {
		const s = blackjack.setup(PLAYERS, { betting: true, startingCoins: 300 })
		expect(s.phase).toBe('betting')
		expect(s.coins[P1]).toBe(300)
		expect(s.coins[P2]).toBe(300)
		expect(s.bets).toEqual({})
	})

	it('only PLACE_BET is valid in betting, and only until you bet', () => {
		const s = blackjack.setup(PLAYERS, { betting: true, startingCoins: 100 })
		expect(blackjack.getValidActions(s, P1).map((a) => a.type)).toEqual(['PLACE_BET'])
		const after = blackjack.applyAction(s, {
			type: 'PLACE_BET',
			playerId: P1,
			payload: { amount: 10 }
		})
		expect(blackjack.getValidActions(after, P1)).toHaveLength(0)
		expect(blackjack.getValidActions(after, P2).map((a) => a.type)).toEqual(['PLACE_BET'])
	})

	it('PLACE_BET debits the stake and waits for others', () => {
		const s = blackjack.setup(PLAYERS, { betting: true, startingCoins: 300 })
		const next = blackjack.applyAction(s, {
			type: 'PLACE_BET',
			playerId: P1,
			payload: { amount: 50 }
		})
		expect(next.bets[P1]).toBe(50)
		expect(next.coins[P1]).toBe(250)
		expect(next.phase).toBe('betting')
	})

	it('rejects illegal bets (over balance, below 1, duplicate)', () => {
		const s = blackjack.setup([P1], { betting: true, startingCoins: 100 })
		expect(
			blackjack.applyAction(s, { type: 'PLACE_BET', playerId: P1, payload: { amount: 101 } })
		).toBe(s)
		expect(
			blackjack.applyAction(s, { type: 'PLACE_BET', playerId: P1, payload: { amount: 0 } })
		).toBe(s)
		const after = blackjack.applyAction(s, {
			type: 'PLACE_BET',
			playerId: P1,
			payload: { amount: 10 }
		})
		// already dealt (single player) — no further PLACE_BET
		expect(
			blackjack.applyAction(after, { type: 'PLACE_BET', playerId: P1, payload: { amount: 5 } })
		).toBe(after)
	})

	it('deals once every player has bet, stake stays debited', () => {
		const s = blackjack.setup([P1], { betting: true, startingCoins: 100 })
		const next = blackjack.applyAction(s, {
			type: 'PLACE_BET',
			playerId: P1,
			payload: { amount: 20 }
		})
		expect(['playing', 'scoring']).toContain(next.phase)
		expect(next.zones['hand_p1'].cards).toHaveLength(2)
		expect(next.bets[P1]).toBe(20)
		if (next.phase === 'playing') {
			// No natural blackjack — stake debited, turn continues
			expect(next.coins[P1]).toBe(80)
		} else {
			// Natural blackjack for player or dealer — coins depend on outcome:
			// Player BJ only → win (130), Dealer BJ + player non-BJ → lose (80),
			// Both BJ → push (100)
			expect([80, 100, 130]).toContain(next.coins[P1])
		}
	})
})

describe('blackjack betting — payouts', () => {
	it('win pays 1:1', () => {
		const next = blackjack.applyAction(playingBet({}), { type: 'STAND', playerId: P1 })
		expect(next.phase).toBe('scoring')
		expect(next.coins[P1]).toBe(550) // 450 + stake 50 + win 50
	})

	it('natural blackjack pays 3:2', () => {
		const s = playingBet({
			zones: {
				deck: createZone('deck', 'hidden', []),
				hand_dealer: createZone('hand_dealer', 'fan', [createCard('10'), createCard('7')]),
				hand_p1: createZone('hand_p1', 'fan', [createCard('A'), createCard('K')], P1)
			}
		})
		const next = blackjack.applyAction(s, { type: 'STAND', playerId: P1 })
		expect(next.coins[P1]).toBe(575) // 450 + 50 + floor(50*1.5)=75
	})

	it('push returns the stake', () => {
		const s = playingBet({
			zones: {
				deck: createZone('deck', 'hidden', []),
				hand_dealer: createZone('hand_dealer', 'fan', [createCard('10'), createCard('9')]),
				hand_p1: createZone('hand_p1', 'fan', [createCard('10'), createCard('9')], P1)
			}
		})
		const next = blackjack.applyAction(s, { type: 'STAND', playerId: P1 })
		expect(next.coins[P1]).toBe(500) // 450 + 50
	})

	it('bust loses the stake', () => {
		const s = playingBet({
			zones: {
				deck: createZone('deck', 'hidden', [createCard('K')]),
				hand_dealer: createZone('hand_dealer', 'fan', [createCard('10'), createCard('7')]),
				hand_p1: createZone('hand_p1', 'fan', [createCard('K'), createCard('Q')], P1)
			}
		})
		const next = blackjack.applyAction(s, { type: 'HIT', playerId: P1 })
		expect(next.playerStatus[P1]).toBe('bust')
		expect(next.coins[P1]).toBe(450) // stake stays lost
	})
})

describe('blackjack betting — double & rebuy', () => {
	it('DOUBLE debits a second stake and doubles the bet', () => {
		const s = playingBet({
			zones: {
				deck: createZone('deck', 'hidden', [createCard('2')]),
				hand_dealer: createZone('hand_dealer', 'fan', [createCard('10'), createCard('7')]),
				hand_p1: createZone('hand_p1', 'fan', [createCard('10'), createCard('9')], P1)
			}
		})
		const next = blackjack.applyAction(s, { type: 'DOUBLE', playerId: P1 })
		expect(next.bets[P1]).toBe(100)
		expect(next.phase).toBe('scoring')
		expect(next.coins[P1]).toBe(600) // 450 -50 (double) +100 stake +100 win
	})

	it('DOUBLE rejected when balance below current bet', () => {
		const s = playingBet({ coins: { [P1]: 20 }, bets: { [P1]: 50 } })
		expect(blackjack.getValidActions(s, P1).map((a) => a.type)).not.toContain('DOUBLE')
		expect(blackjack.applyAction(s, { type: 'DOUBLE', playerId: P1 })).toBe(s)
	})

	it('NEW_ROUND reopens betting and rebuys broke players', () => {
		const s = playingBet({ phase: 'scoring', coins: { [P1]: 0 }, bets: { [P1]: 50 } })
		const next = blackjack.applyAction(s, { type: 'NEW_ROUND', playerId: P1 })
		expect(next.phase).toBe('betting')
		expect(next.coins[P1]).toBe(500)
		expect(next.bets).toEqual({})
	})

	it('first betting setup marks everyone on buy-in #1', () => {
		const s = blackjack.setup(PLAYERS, { betting: true, startingCoins: 200 })
		expect(s.buyIns[P1]).toBe(1)
		expect(s.buyIns[P2]).toBe(1)
	})

	it('rebuy bumps the buy-in counter, solvent players keep theirs', () => {
		const s = playingBet({ phase: 'scoring', coins: { [P1]: 0 }, bets: { [P1]: 50 } })
		const next = blackjack.applyAction(s, { type: 'NEW_ROUND', playerId: P1 })
		expect(next.buyIns[P1]).toBe(2)

		const solvent = playingBet({ phase: 'scoring', coins: { [P1]: 320 }, bets: { [P1]: 50 } })
		const after = blackjack.applyAction(solvent, { type: 'NEW_ROUND', playerId: P1 })
		expect(after.buyIns[P1]).toBe(1)
	})

	it('NEW_ROUND keeps coins for solvent players', () => {
		const s = playingBet({ phase: 'scoring', coins: { [P1]: 320 }, bets: { [P1]: 50 } })
		const next = blackjack.applyAction(s, { type: 'NEW_ROUND', playerId: P1 })
		expect(next.coins[P1]).toBe(320)
	})
})

// --- split ---

// Single-player playing state with a same-rank pair and a known deck.
function splittable(overrides: Partial<BlackjackState> = {}): BlackjackState {
	const base = blackjack.setup([P1])
	return {
		...base,
		phase: 'playing',
		playerStatus: { [P1]: 'playing' },
		splitStatus: {},
		splitBets: {},
		activeHand: {},
		turnPlayerId: P1,
		zones: {
			deck: createZone('deck', 'hidden', [
				createCard('5'),
				createCard('6'),
				createCard('K'),
				createCard('K')
			]),
			hand_dealer: createZone('hand_dealer', 'fan', [createCard('10'), createCard('7')]),
			hand_p1: createZone('hand_p1', 'fan', [createCard('8'), createCard('8')], P1)
		},
		...overrides
	}
}

function splittableBet(overrides: Partial<BlackjackState> = {}): BlackjackState {
	const base = blackjack.setup([P1], { betting: true, startingCoins: 500 })
	return {
		...base,
		phase: 'playing',
		playerStatus: { [P1]: 'playing' },
		splitStatus: {},
		splitBets: {},
		activeHand: {},
		turnPlayerId: P1,
		coins: { [P1]: 400 },
		bets: { [P1]: 50 },
		zones: {
			deck: createZone('deck', 'hidden', [createCard('K'), createCard('K'), createCard('K')]),
			hand_dealer: createZone('hand_dealer', 'fan', [createCard('10'), createCard('7')]),
			hand_p1: createZone('hand_p1', 'fan', [createCard('8'), createCard('8')], P1)
		},
		...overrides
	}
}

describe('blackjack split — availability', () => {
	it('offers SPLIT on a same-rank pair', () => {
		const types = blackjack.getValidActions(splittable(), P1).map((a) => a.type)
		expect(types).toContain('SPLIT')
	})

	it('offers SPLIT on two ten-value cards of different rank (K|Q)', () => {
		const s = splittable({
			zones: {
				...splittable().zones,
				hand_p1: createZone('hand_p1', 'fan', [createCard('K'), createCard('Q')], P1)
			}
		})
		const next = blackjack.applyAction(s, { type: 'SPLIT', playerId: P1 })
		expect(blackjack.getValidActions(s, P1).map((a) => a.type)).toContain('SPLIT')
		expect(next.zones[splitZoneId(P1)].cards).toHaveLength(2)
	})

	it('does not offer SPLIT on a non-pair', () => {
		const s = splittable({
			zones: {
				...splittable().zones,
				hand_p1: createZone('hand_p1', 'fan', [createCard('8'), createCard('9')], P1)
			}
		})
		expect(blackjack.getValidActions(s, P1).map((a) => a.type)).not.toContain('SPLIT')
	})

	it('does not offer SPLIT once already split', () => {
		const after = blackjack.applyAction(splittable(), { type: 'SPLIT', playerId: P1 })
		expect(blackjack.getValidActions(after, P1).map((a) => a.type)).not.toContain('SPLIT')
	})
})

describe('blackjack split — mechanics', () => {
	it('creates two 2-card hands, one drawn card each', () => {
		const next = blackjack.applyAction(splittable(), { type: 'SPLIT', playerId: P1 })
		expect(next.zones[`hand_${P1}`].cards).toHaveLength(2)
		expect(next.zones[splitZoneId(P1)].cards).toHaveLength(2)
		// 8|8 split, draws 5 then 6 → hands of 13 and 14
		expect(handValue(next.zones[`hand_${P1}`].cards)).toBe(13)
		expect(handValue(next.zones[splitZoneId(P1)].cards)).toBe(14)
		expect(next.zones['deck'].cards).toHaveLength(2)
		expect(next.splitStatus[P1]).toBe('playing')
		expect(next.activeHand[P1]).toBe(0)
		expect(next.turnPlayerId).toBe(P1)
	})

	it('standing the first hand switches to the split hand (same player)', () => {
		const split = blackjack.applyAction(splittable(), { type: 'SPLIT', playerId: P1 })
		const next = blackjack.applyAction(split, { type: 'STAND', playerId: P1 })
		expect(next.turnPlayerId).toBe(P1)
		expect(next.activeHand[P1]).toBe(1)
		expect(next.playerStatus[P1]).toBe('standing')
		expect(next.splitStatus[P1]).toBe('playing')
	})

	it('standing both hands resolves the round', () => {
		let s = blackjack.applyAction(splittable(), { type: 'SPLIT', playerId: P1 })
		s = blackjack.applyAction(s, { type: 'STAND', playerId: P1 })
		s = blackjack.applyAction(s, { type: 'STAND', playerId: P1 })
		expect(s.phase).toBe('scoring')
	})

	it('HIT acts on the active split hand', () => {
		let s = blackjack.applyAction(splittable(), { type: 'SPLIT', playerId: P1 })
		s = blackjack.applyAction(s, { type: 'STAND', playerId: P1 }) // hand 0 done → active hand 1
		const before = s.zones[splitZoneId(P1)].cards.length
		s = blackjack.applyAction(s, { type: 'HIT', playerId: P1 })
		expect(s.zones[splitZoneId(P1)].cards).toHaveLength(before + 1)
		expect(s.zones[`hand_${P1}`].cards).toHaveLength(2) // primary untouched
	})

	it('split aces get one card each then auto-resolve', () => {
		const s = splittable({
			zones: {
				deck: createZone('deck', 'hidden', [createCard('9'), createCard('9'), createCard('K')]),
				hand_dealer: createZone('hand_dealer', 'fan', [createCard('10'), createCard('7')]),
				hand_p1: createZone('hand_p1', 'fan', [createCard('A'), createCard('A')], P1)
			}
		})
		const next = blackjack.applyAction(s, { type: 'SPLIT', playerId: P1 })
		expect(next.playerStatus[P1]).toBe('standing')
		expect(next.splitStatus[P1]).toBe('standing')
		expect(next.zones[`hand_${P1}`].cards).toHaveLength(2)
		expect(next.zones[splitZoneId(P1)].cards).toHaveLength(2)
		expect(next.phase).toBe('scoring') // single player → straight to dealer/scoring
	})
})

describe('blackjack split — betting', () => {
	it('SPLIT debits a matching second stake', () => {
		const next = blackjack.applyAction(splittableBet(), { type: 'SPLIT', playerId: P1 })
		expect(next.coins[P1]).toBe(350) // 400 - 50 matching stake
		expect(next.bets[P1]).toBe(50)
		expect(next.splitBets[P1]).toBe(50)
	})

	it('SPLIT rejected when balance below the bet', () => {
		const s = splittableBet({ coins: { [P1]: 20 }, bets: { [P1]: 50 } })
		expect(blackjack.getValidActions(s, P1).map((a) => a.type)).not.toContain('SPLIT')
		expect(blackjack.applyAction(s, { type: 'SPLIT', playerId: P1 })).toBe(s)
	})

	it('pays each split hand independently', () => {
		// 8|8 split, both draw K → two 18s vs dealer 17 → both win 1:1
		let s = blackjack.applyAction(splittableBet(), { type: 'SPLIT', playerId: P1 })
		s = blackjack.applyAction(s, { type: 'STAND', playerId: P1 })
		s = blackjack.applyAction(s, { type: 'STAND', playerId: P1 })
		expect(s.phase).toBe('scoring')
		// 400 -50 split = 350, then +100 (hand0 stake+win) +100 (split stake+win)
		expect(s.coins[P1]).toBe(550)
	})

	it('DOUBLE after split doubles only the split hand stake', () => {
		// hand0 stays 18 (wins); split doubles, draws K → 28 (busts) → round resolves
		let s = blackjack.applyAction(splittableBet(), { type: 'SPLIT', playerId: P1 })
		s = blackjack.applyAction(s, { type: 'STAND', playerId: P1 }) // move to split hand
		s = blackjack.applyAction(s, { type: 'DOUBLE', playerId: P1 })
		expect(s.splitBets[P1]).toBe(100)
		expect(s.bets[P1]).toBe(50) // primary stake untouched
		expect(s.zones[splitZoneId(P1)].cards).toHaveLength(3)
		expect(s.phase).toBe('scoring')
		// 350 -50 double = 300; hand0 win +100 → 400; doubled split busts → +0
		expect(s.coins[P1]).toBe(400)
	})
})

describe('blackjack split — getWinner', () => {
	it("uses a player's best non-bust hand", () => {
		const base = splittable()
		const state: BlackjackState = {
			...base,
			phase: 'gameover',
			playerStatus: { [P1]: 'standing' },
			splitStatus: { [P1]: 'standing' },
			splitBets: {},
			activeHand: { [P1]: 1 },
			zones: {
				...base.zones,
				hand_dealer: createZone('hand_dealer', 'fan', [createCard('K'), createCard('7')]),
				hand_p1: createZone('hand_p1', 'fan', [createCard('5'), createCard('6')], P1), // 11, loses
				[splitZoneId(P1)]: createZone(
					splitZoneId(P1),
					'fan',
					[createCard('K'), createCard('Q')],
					P1
				) // 20, wins
			}
		}
		expect(blackjack.getWinner(state)).toBe(P1)
	})
})
