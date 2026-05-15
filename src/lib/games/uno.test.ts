import { describe, expect, it } from 'vitest'
import { createCard } from '$lib/engine/cards'
import { createZone } from '$lib/engine/zones'
import type { UnoColor } from './uno'
import { uno } from './uno'

const P1 = 'p1'
const P2 = 'p2'
const P3 = 'p3'
const PLAYERS = [P1, P2, P3]

function setup(players = PLAYERS) {
	return uno.setup(players)
}

function makeState(
	players: string[],
	handCards: Record<string, ReturnType<typeof createCard>[]>,
	discardTop: ReturnType<typeof createCard>,
	drawCards: ReturnType<typeof createCard>[],
	currentColor: UnoColor = 'red',
	direction: 1 | -1 = 1,
	turnPlayerId = players[0]
) {
	const zones: ReturnType<typeof setup>['zones'] = {}
	players.forEach((pid) => {
		zones[`hand_${pid}`] = createZone(`hand_${pid}`, 'hidden', handCards[pid] ?? [], pid)
	})
	zones['discard'] = createZone('discard', 'public', [discardTop])
	zones['draw'] = createZone('draw', 'hidden', drawCards)
	return {
		players,
		zones,
		turnPlayerId,
		phase: 'playing' as const,
		activeGameId: 'uno',
		direction,
		currentColor
	}
}

describe('uno.setup', () => {
	it('deals 7 cards to each player', () => {
		const state = setup()
		PLAYERS.forEach((p) => expect(state.zones[`hand_${p}`].cards).toHaveLength(7))
	})

	it('has a draw pile and discard pile', () => {
		const state = setup()
		expect(state.zones['draw']).toBeDefined()
		expect(state.zones['discard']).toBeDefined()
		expect(state.zones['discard'].cards).toHaveLength(1)
	})

	it('initial discard is a number card', () => {
		const state = setup()
		const top = state.zones['discard'].cards[0]
		expect(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']).toContain(top.face)
	})

	it('total cards = 108', () => {
		const state = setup()
		const handTotal = PLAYERS.reduce((sum, p) => sum + state.zones[`hand_${p}`].cards.length, 0)
		const drawTotal = state.zones['draw'].cards.length
		const discardTotal = state.zones['discard'].cards.length
		expect(handTotal + drawTotal + discardTotal).toBe(108)
	})

	it('starts in playing phase with direction 1', () => {
		const state = setup()
		expect(state.phase).toBe('playing')
		expect(state.direction).toBe(1)
	})
})

describe('uno.getValidActions', () => {
	it('inactive player gets no actions', () => {
		const state = setup()
		const other = PLAYERS.find((p) => p !== state.turnPlayerId)!
		expect(uno.getValidActions(state, other)).toHaveLength(0)
	})

	it('DRAW_CARD always in valid actions on player turn', () => {
		const discard = createCard('5', 'red')
		const state = makeState(
			[P1, P2],
			{ p1: [createCard('3', 'blue')], p2: [] },
			discard,
			[createCard('7', 'green')],
			'red'
		)
		const actions = uno.getValidActions(state, P1)
		expect(actions.some((a) => a.type === 'DRAW_CARD')).toBe(true)
	})

	it('returns PLAY_CARD for color match', () => {
		const discard = createCard('5', 'red')
		const matchCard = createCard('3', 'red')
		const state = makeState([P1, P2], { p1: [matchCard], p2: [] }, discard, [], 'red')
		const actions = uno.getValidActions(state, P1)
		const playActions = actions.filter((a) => a.type === 'PLAY_CARD')
		expect(playActions).toHaveLength(1)
		expect((playActions[0].payload as { cardId: string }).cardId).toBe(matchCard.id)
	})

	it('returns PLAY_CARD for face match', () => {
		const discard = createCard('5', 'red')
		const matchCard = createCard('5', 'blue')
		const state = makeState([P1, P2], { p1: [matchCard], p2: [] }, discard, [], 'red')
		const actions = uno.getValidActions(state, P1)
		expect(actions.some((a) => a.type === 'PLAY_CARD')).toBe(true)
	})

	it('Wild is always playable', () => {
		const discard = createCard('5', 'red')
		const wild = createCard('Wild')
		const state = makeState([P1, P2], { p1: [wild], p2: [] }, discard, [], 'red')
		const actions = uno.getValidActions(state, P1)
		expect(actions.some((a) => a.type === 'PLAY_CARD')).toBe(true)
	})

	it('no actions in gameover phase', () => {
		const state = { ...setup(), phase: 'gameover' as const }
		PLAYERS.forEach((p) => expect(uno.getValidActions(state, p)).toHaveLength(0))
	})
})

describe('uno.applyAction PLAY_CARD number', () => {
	it('moves card from hand to discard', () => {
		const playCard = createCard('3', 'red')
		const discard = createCard('5', 'red')
		const state = makeState(
			[P1, P2],
			{ p1: [playCard], p2: [createCard('2', 'blue')] },
			discard,
			[]
		)
		const next = uno.applyAction(state, {
			type: 'PLAY_CARD',
			playerId: P1,
			payload: { cardId: playCard.id }
		})
		expect(next.zones[`hand_${P1}`].cards).toHaveLength(0)
		expect(next.zones['discard'].cards[next.zones['discard'].cards.length - 1].id).toBe(playCard.id)
	})

	it('advances turn to next player', () => {
		const playCard = createCard('3', 'red')
		const state = makeState(
			[P1, P2, P3],
			{
				p1: [playCard, createCard('4', 'red')],
				p2: [createCard('1', 'blue')],
				p3: [createCard('2', 'blue')]
			},
			createCard('5', 'red'),
			[]
		)
		const next = uno.applyAction(state, {
			type: 'PLAY_CARD',
			playerId: P1,
			payload: { cardId: playCard.id }
		})
		expect(next.turnPlayerId).toBe(P2)
	})

	it('empty hand → gameover', () => {
		const playCard = createCard('3', 'red')
		const state = makeState(
			[P1, P2],
			{ p1: [playCard], p2: [createCard('1', 'blue')] },
			createCard('5', 'red'),
			[]
		)
		const next = uno.applyAction(state, {
			type: 'PLAY_CARD',
			playerId: P1,
			payload: { cardId: playCard.id }
		})
		expect(next.phase).toBe('gameover')
	})
})

describe('uno.applyAction PLAY_CARD Skip', () => {
	it('skips next player', () => {
		const skip = createCard('Skip', 'red')
		const state = makeState(
			[P1, P2, P3],
			{
				p1: [skip, createCard('4', 'red')],
				p2: [createCard('1', 'blue')],
				p3: [createCard('2', 'blue')]
			},
			createCard('5', 'red'),
			[]
		)
		const next = uno.applyAction(state, {
			type: 'PLAY_CARD',
			playerId: P1,
			payload: { cardId: skip.id }
		})
		expect(next.turnPlayerId).toBe(P3)
	})
})

describe('uno.applyAction PLAY_CARD Reverse', () => {
	it('reverses direction in 3+ player game', () => {
		const reverse = createCard('Reverse', 'red')
		const state = makeState(
			[P1, P2, P3],
			{
				p1: [reverse, createCard('4', 'red')],
				p2: [createCard('1', 'blue')],
				p3: [createCard('2', 'blue')]
			},
			createCard('5', 'red'),
			[],
			'red',
			1
		)
		const next = uno.applyAction(state, {
			type: 'PLAY_CARD',
			playerId: P1,
			payload: { cardId: reverse.id }
		})
		expect(next.direction).toBe(-1)
		expect(next.turnPlayerId).toBe(P3)
	})

	it('acts as skip in 2-player game', () => {
		const reverse = createCard('Reverse', 'red')
		const state = makeState(
			[P1, P2],
			{ p1: [reverse], p2: [createCard('1', 'blue')] },
			createCard('5', 'red'),
			[]
		)
		const next = uno.applyAction(state, {
			type: 'PLAY_CARD',
			playerId: P1,
			payload: { cardId: reverse.id }
		})
		expect(next.turnPlayerId).toBe(P1)
	})
})

describe('uno.applyAction PLAY_CARD DrawTwo', () => {
	it('next player draws 2 and is skipped', () => {
		const drawTwo = createCard('DrawTwo', 'red')
		const drawPile = [createCard('A', 'blue'), createCard('B', 'blue')]
		const state = makeState(
			[P1, P2, P3],
			{
				p1: [drawTwo, createCard('4', 'red')],
				p2: [createCard('1', 'blue')],
				p3: [createCard('2', 'blue')]
			},
			createCard('5', 'red'),
			drawPile
		)
		const next = uno.applyAction(state, {
			type: 'PLAY_CARD',
			playerId: P1,
			payload: { cardId: drawTwo.id }
		})
		expect(next.zones[`hand_${P2}`].cards).toHaveLength(3)
		expect(next.turnPlayerId).toBe(P3)
	})
})

describe('uno.applyAction PLAY_CARD Wild', () => {
	it('requires chosenColor — no-ops without it', () => {
		const wild = createCard('Wild')
		const state = makeState(
			[P1, P2],
			{ p1: [wild], p2: [createCard('1', 'blue')] },
			createCard('5', 'red'),
			[]
		)
		const next = uno.applyAction(state, {
			type: 'PLAY_CARD',
			playerId: P1,
			payload: { cardId: wild.id }
		})
		expect(next).toBe(state)
	})

	it('updates currentColor to chosen color', () => {
		const wild = createCard('Wild')
		const state = makeState(
			[P1, P2],
			{ p1: [wild], p2: [createCard('1', 'blue')] },
			createCard('5', 'red'),
			[]
		)
		const next = uno.applyAction(state, {
			type: 'PLAY_CARD',
			playerId: P1,
			payload: { cardId: wild.id, chosenColor: 'blue' }
		})
		expect(next.currentColor).toBe('blue')
	})
})

describe('uno.applyAction PLAY_CARD WildDrawFour', () => {
	it('next player draws 4 and is skipped', () => {
		const wdf = createCard('WildDrawFour')
		const drawPile = [1, 2, 3, 4].map((n) => createCard(String(n), 'green'))
		const state = makeState(
			[P1, P2, P3],
			{
				p1: [wdf, createCard('4', 'red')],
				p2: [createCard('1', 'blue')],
				p3: [createCard('2', 'blue')]
			},
			createCard('5', 'red'),
			drawPile
		)
		const next = uno.applyAction(state, {
			type: 'PLAY_CARD',
			playerId: P1,
			payload: { cardId: wdf.id, chosenColor: 'green' }
		})
		expect(next.zones[`hand_${P2}`].cards).toHaveLength(5)
		expect(next.turnPlayerId).toBe(P3)
		expect(next.currentColor).toBe('green')
	})
})

describe('uno.applyAction DRAW_CARD', () => {
	it('adds a card to player hand and advances turn', () => {
		const drawPile = [createCard('7', 'blue')]
		const state = makeState(
			[P1, P2],
			{ p1: [createCard('3', 'yellow')], p2: [] },
			createCard('5', 'red'),
			drawPile
		)
		const next = uno.applyAction(state, { type: 'DRAW_CARD', playerId: P1 })
		expect(next.zones[`hand_${P1}`].cards).toHaveLength(2)
		expect(next.turnPlayerId).toBe(P2)
	})

	it('reshuffles discard when draw pile is empty', () => {
		const discardPile = [createCard('5', 'red'), createCard('3', 'blue'), createCard('9', 'green')]
		const state: ReturnType<typeof makeState> = {
			players: [P1, P2],
			zones: {
				[`hand_${P1}`]: createZone(`hand_${P1}`, 'hidden', [], P1),
				[`hand_${P2}`]: createZone(`hand_${P2}`, 'hidden', [], P2),
				discard: createZone('discard', 'public', discardPile),
				draw: createZone('draw', 'hidden', [])
			},
			turnPlayerId: P1,
			phase: 'playing',
			activeGameId: 'uno',
			direction: 1,
			currentColor: 'red'
		}
		const next = uno.applyAction(state, { type: 'DRAW_CARD', playerId: P1 })
		expect(next.zones[`hand_${P1}`].cards).toHaveLength(1)
		// top of discard kept; rest reshuffled into draw
		expect(next.zones['discard'].cards).toHaveLength(1)
	})
})

describe('uno.isOver / getWinner', () => {
	it('isOver is false during playing', () => {
		expect(uno.isOver(setup())).toBe(false)
	})

	it('isOver is true in gameover', () => {
		const state = { ...setup(), phase: 'gameover' as const }
		expect(uno.isOver(state)).toBe(true)
	})

	it('getWinner returns player with empty hand', () => {
		const base = setup()
		const state = {
			...base,
			phase: 'gameover' as const,
			zones: {
				...base.zones,
				[`hand_${P1}`]: createZone(`hand_${P1}`, 'hidden', [], P1),
				[`hand_${P2}`]: createZone(`hand_${P2}`, 'hidden', [createCard('5', 'red')], P2),
				[`hand_${P3}`]: createZone(`hand_${P3}`, 'hidden', [createCard('3', 'blue')], P3)
			}
		}
		expect(uno.getWinner(state)).toBe(P1)
	})

	it('getWinner returns null when not gameover', () => {
		expect(uno.getWinner(setup())).toBeNull()
	})
})

describe('uno.onPlayerDisconnect', () => {
	it('ends game when players drop below 2', () => {
		const state = uno.setup([P1, P2])
		const next = uno.onPlayerDisconnect!(state, P2)
		expect(next.phase).toBe('gameover')
	})

	it('removes player and continues with 3+', () => {
		const state = setup()
		const next = uno.onPlayerDisconnect!(state, P3)
		expect(next.players).not.toContain(P3)
		expect(next.phase).toBe('playing')
	})
})
