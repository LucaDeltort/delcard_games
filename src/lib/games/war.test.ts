import { describe, expect, it } from 'vitest'
import { createCard } from '$lib/engine/cards'
import { createZone } from '$lib/engine/zones'
import type { GameStateGeneric } from '$lib/core/types'
import { war } from './war'

const P1 = 'p1'
const P2 = 'p2'
const PLAYERS = [P1, P2]

function setup() {
	return war.setup(PLAYERS)
}

describe('war.setup', () => {
	it('creates 52 cards total across both decks', () => {
		const state = setup()
		const total = PLAYERS.reduce(
			(sum, p) => sum + state.zones[`deck_${p}`].cards.length,
			0
		)
		expect(total).toBe(52)
	})

	it('deals 26 cards per player', () => {
		const state = setup()
		PLAYERS.forEach((p) => expect(state.zones[`deck_${p}`].cards).toHaveLength(26))
	})

	it('starts in playing phase', () => {
		const state = setup()
		expect(state.phase).toBe('playing')
	})

	it('no card appears in both decks', () => {
		const state = setup()
		const p1Ids = new Set(state.zones[`deck_${P1}`].cards.map((c) => c.id))
		const p2Ids = state.zones[`deck_${P2}`].cards.map((c) => c.id)
		expect(p2Ids.some((id) => p1Ids.has(id))).toBe(false)
	})
})

describe('war.getValidActions', () => {
	it('active player can REVEAL in playing phase', () => {
		const state = setup()
		const actions = war.getValidActions(state, state.turnPlayerId)
		expect(actions).toHaveLength(1)
		expect(actions[0].type).toBe('REVEAL')
	})

	it('inactive player gets no actions in playing phase', () => {
		const state = setup()
		const other = PLAYERS.find((p) => p !== state.turnPlayerId)!
		expect(war.getValidActions(state, other)).toHaveLength(0)
	})

	it('only p1 can NEXT_ROUND in reviewing phase', () => {
		const state = { ...setup(), phase: 'reviewing' } as ReturnType<typeof setup>
		expect(war.getValidActions(state, P1)[0]?.type).toBe('NEXT_ROUND')
		expect(war.getValidActions(state, P2)).toHaveLength(0)
	})

	it('no actions in gameover phase', () => {
		const state = { ...setup(), phase: 'gameover' } as ReturnType<typeof setup>
		PLAYERS.forEach((p) => expect(war.getValidActions(state, p)).toHaveLength(0))
	})

	it('no actions when deck is empty', () => {
		const state = setup()
		const emptyState = {
			...state,
			zones: {
				...state.zones,
				[`deck_${state.turnPlayerId}`]: createZone(`deck_${state.turnPlayerId}`, 'hidden', [], state.turnPlayerId)
			}
		}
		expect(war.getValidActions(emptyState, state.turnPlayerId)).toHaveLength(0)
	})
})

describe('war.applyAction REVEAL', () => {
	it('moves top card from deck to played zone', () => {
		const state = setup()
		const pid = state.turnPlayerId
		const topCard = state.zones[`deck_${pid}`].cards[0]
		const next = war.applyAction(state, { type: 'REVEAL', playerId: pid })
		expect(next.zones[`deck_${pid}`].cards).toHaveLength(25)
		expect(next.zones[`played_${pid}`].cards[0].id).toBe(topCard.id)
	})

	it('transitions to reviewing once both players revealed', () => {
		let state = setup()
		// P1 reveals
		state = war.applyAction(state, { type: 'REVEAL', playerId: state.turnPlayerId })
		// P2 reveals
		state = war.applyAction(state, { type: 'REVEAL', playerId: state.turnPlayerId })
		expect(state.phase).toBe('reviewing')
	})

	it('no-ops if deck is empty', () => {
		const state = setup()
		const pid = state.turnPlayerId
		const empty = {
			...state,
			zones: {
				...state.zones,
				[`deck_${pid}`]: createZone(`deck_${pid}`, 'hidden', [], pid)
			}
		}
		expect(war.applyAction(empty, { type: 'REVEAL', playerId: pid })).toBe(empty)
	})
})

describe('war.applyAction NEXT_ROUND', () => {
	function buildReviewingState(p1Face: string, p2Face: string) {
		const base = setup()
		const p1Card = createCard(p1Face, 'spades')
		const p2Card = createCard(p2Face, 'hearts')
		return {
			...base,
			phase: 'reviewing' as const,
			zones: {
				...base.zones,
				[`played_${P1}`]: createZone(`played_${P1}`, 'public', [p1Card], P1),
				[`played_${P2}`]: createZone(`played_${P2}`, 'public', [p2Card], P2),
				[`deck_${P1}`]: createZone(`deck_${P1}`, 'hidden', [], P1),
				[`deck_${P2}`]: createZone(`deck_${P2}`, 'hidden', [], P2),
				[`won_${P1}`]: createZone(`won_${P1}`, 'hidden', [], P1),
				[`won_${P2}`]: createZone(`won_${P2}`, 'hidden', [], P2)
			}
		}
	}

	it('higher card wins both played cards', () => {
		const state = buildReviewingState('K', '2')
		const next = war.applyAction(state, { type: 'NEXT_ROUND', playerId: P1 })
		expect(next.zones[`won_${P1}`].cards).toHaveLength(2)
		expect(next.zones[`played_${P1}`].cards).toHaveLength(0)
		expect(next.zones[`played_${P2}`].cards).toHaveLength(0)
	})

	it('lower card loses both cards to opponent', () => {
		const state = buildReviewingState('2', 'A')
		const next = war.applyAction(state, { type: 'NEXT_ROUND', playerId: P1 })
		expect(next.zones[`won_${P2}`].cards).toHaveLength(2)
	})

	it('tie discards both played cards', () => {
		const state = buildReviewingState('7', '7')
		const next = war.applyAction(state, { type: 'NEXT_ROUND', playerId: P1 })
		expect(next.zones[`played_${P1}`].cards).toHaveLength(0)
		expect(next.zones[`played_${P2}`].cards).toHaveLength(0)
		expect(next.zones[`won_${P1}`].cards).toHaveLength(0)
		expect(next.zones[`won_${P2}`].cards).toHaveLength(0)
	})

	it('sets gameover when a deck runs out after the round', () => {
		const state = buildReviewingState('A', '2')
		const next = war.applyAction(state, { type: 'NEXT_ROUND', playerId: P1 })
		expect(next.phase).toBe('gameover')
	})
})

describe('war.isOver / getWinner', () => {
	it('isOver returns false during playing', () => {
		expect(war.isOver(setup())).toBe(false)
	})

	it('isOver returns true in gameover', () => {
		const state = { ...setup(), phase: 'gameover' } as ReturnType<typeof setup>
		expect(war.isOver(state)).toBe(true)
	})

	it('getWinner returns null when not gameover', () => {
		expect(war.getWinner(setup())).toBeNull()
	})

	it('getWinner returns player with most total cards', () => {
		const base = setup()
		const state = {
			...base,
			phase: 'gameover' as const,
			zones: {
				...base.zones,
				[`deck_${P1}`]: createZone(`deck_${P1}`, 'hidden', [createCard('A')], P1),
				[`won_${P1}`]: createZone(`won_${P1}`, 'hidden', [createCard('K'), createCard('Q')], P1),
				[`deck_${P2}`]: createZone(`deck_${P2}`, 'hidden', [], P2),
				[`won_${P2}`]: createZone(`won_${P2}`, 'hidden', [], P2)
			}
		}
		expect(war.getWinner(state)).toBe(P1)
	})
})

describe('war.onPlayerDisconnect', () => {
	it('ends game and removes disconnected player', () => {
		const state = setup()
		const next = war.onPlayerDisconnect!(state, P2)
		expect(next.phase).toBe('gameover')
		expect(next.players).not.toContain(P2)
	})
})
