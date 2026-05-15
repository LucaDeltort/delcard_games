import type { Card, GameStateGeneric } from '$lib/core/types'
import type { GameDefinition } from '$lib/engine'
import { createDeck, createZone, deal, moveCard, shuffle } from '$lib/engine'

export type UnoColor = 'red' | 'yellow' | 'green' | 'blue'

type UnoState = GameStateGeneric & {
	phase: 'playing' | 'gameover'
	direction: 1 | -1
	currentColor: UnoColor
}

const NUMBER_FACES = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])

function nextInDir(players: string[], current: string, direction: 1 | -1): string {
	const idx = players.indexOf(current)
	return players[(((idx + direction) % players.length) + players.length) % players.length]
}

function canPlay(card: Card, topDiscard: Card, currentColor: UnoColor): boolean {
	if (card.face === 'Wild' || card.face === 'WildDrawFour') return true
	return card.suit === currentColor || card.face === topDiscard.face
}

function reshuffleDiscard(zones: UnoState['zones']): UnoState['zones'] {
	const discard = zones['discard']
	if (discard.cards.length <= 1) return zones
	const top = discard.cards[discard.cards.length - 1]
	const reshuffled = shuffle(discard.cards.slice(0, -1))
	return {
		...zones,
		discard: { ...discard, cards: [top] },
		draw: { ...zones['draw'], cards: [...reshuffled, ...zones['draw'].cards] }
	}
}

function drawCards(zones: UnoState['zones'], playerId: string, count: number): UnoState['zones'] {
	let z = zones
	for (let i = 0; i < count; i++) {
		if (z['draw'].cards.length === 0) z = reshuffleDiscard(z)
		if (z['draw'].cards.length === 0) break
		z = moveCard(z, 'draw', `hand_${playerId}`, z['draw'].cards[0].id)
	}
	return z
}

export const uno: GameDefinition<UnoState> = {
	id: 'uno',
	name: 'Uno',
	deckType: 'UnoDeck',
	minPlayers: 2,
	maxPlayers: 8,

	setup(players) {
		const { hands, remaining } = deal(createDeck('UnoDeck'), 7, players.length)

		const zones: UnoState['zones'] = {}
		players.forEach((pid, i) => {
			zones[`hand_${pid}`] = createZone(`hand_${pid}`, 'hidden', hands[i], pid)
		})

		// Find first number card for initial discard
		let drawPile = [...remaining]
		let discardCard: Card | null = null
		for (let i = 0; i < drawPile.length; i++) {
			if (NUMBER_FACES.has(drawPile[i].face)) {
				discardCard = drawPile[i]
				drawPile = [...drawPile.slice(0, i), ...drawPile.slice(i + 1)]
				break
			}
		}
		// Fallback: use first card regardless
		if (!discardCard) {
			discardCard = drawPile[0]
			drawPile = drawPile.slice(1)
		}

		zones['discard'] = createZone('discard', 'public', [discardCard])
		zones['draw'] = createZone('draw', 'hidden', drawPile)

		return {
			players,
			zones,
			turnPlayerId: players[0],
			phase: 'playing',
			activeGameId: 'uno',
			direction: 1,
			currentColor: (discardCard.suit as UnoColor) ?? 'red'
		}
	},

	getValidActions(state, playerId) {
		if (state.phase !== 'playing') return []
		if (state.turnPlayerId !== playerId) return []

		const hand = state.zones[`hand_${playerId}`]
		const discard = state.zones['discard']
		const top = discard.cards[discard.cards.length - 1]
		if (!top) return []

		const playable = hand.cards
			.filter((card) => canPlay(card, top, state.currentColor))
			.map((card) => ({ type: 'PLAY_CARD', playerId, payload: { cardId: card.id } }))

		return [...playable, { type: 'DRAW_CARD', playerId }]
	},

	applyAction(state, action) {
		if (action.type === 'DRAW_CARD') {
			let zones = state.zones
			if (zones['draw'].cards.length === 0) zones = reshuffleDiscard(zones)
			if (zones['draw'].cards.length === 0) return state
			zones = moveCard(zones, 'draw', `hand_${action.playerId}`, zones['draw'].cards[0].id)
			return {
				...state,
				zones,
				turnPlayerId: nextInDir(state.players, action.playerId, state.direction)
			}
		}

		if (action.type !== 'PLAY_CARD') return state

		const { cardId, chosenColor } = (action.payload ?? {}) as {
			cardId?: string
			chosenColor?: UnoColor
		}
		if (!cardId) return state

		const hand = state.zones[`hand_${action.playerId}`]
		const card = hand?.cards.find((c) => c.id === cardId)
		if (!card) return state

		const top = state.zones['discard'].cards[state.zones['discard'].cards.length - 1]
		if (!canPlay(card, top, state.currentColor)) return state

		// Wild requires chosenColor
		const isWild = card.face === 'Wild' || card.face === 'WildDrawFour'
		if (isWild && !chosenColor) return state

		let zones = moveCard(state.zones, `hand_${action.playerId}`, 'discard', cardId)
		const newColor: UnoColor = isWild ? chosenColor! : (card.suit as UnoColor)
		let direction = state.direction
		let nextTurn: string

		if (card.face === 'Reverse') {
			direction = (direction * -1) as 1 | -1
			if (state.players.length === 2) {
				// With 2 players Reverse acts as Skip
				nextTurn = nextInDir(state.players, action.playerId, direction)
				nextTurn = nextInDir(state.players, nextTurn, direction)
			} else {
				nextTurn = nextInDir(state.players, action.playerId, direction)
			}
		} else if (card.face === 'Skip') {
			const skipped = nextInDir(state.players, action.playerId, direction)
			nextTurn = nextInDir(state.players, skipped, direction)
		} else if (card.face === 'DrawTwo') {
			const target = nextInDir(state.players, action.playerId, direction)
			zones = drawCards(zones, target, 2)
			nextTurn = nextInDir(state.players, target, direction)
		} else if (card.face === 'WildDrawFour') {
			const target = nextInDir(state.players, action.playerId, direction)
			zones = drawCards(zones, target, 4)
			nextTurn = nextInDir(state.players, target, direction)
		} else {
			nextTurn = nextInDir(state.players, action.playerId, direction)
		}

		const handEmpty = zones[`hand_${action.playerId}`].cards.length === 0

		return {
			...state,
			zones,
			direction,
			currentColor: newColor,
			turnPlayerId: handEmpty ? action.playerId : nextTurn,
			phase: handEmpty ? 'gameover' : 'playing'
		}
	},

	onPlayerDisconnect(state, playerId) {
		const players = state.players.filter((p) => p !== playerId)
		if (players.length < 2) return { ...state, players, phase: 'gameover' }
		const nextTurn =
			state.turnPlayerId === playerId
				? nextInDir(players, players[0], state.direction)
				: state.turnPlayerId
		return { ...state, players, turnPlayerId: nextTurn }
	},

	isOver(state) {
		return state.phase === 'gameover'
	},

	getWinner(state) {
		if (state.phase !== 'gameover') return null
		// Winner = player with empty hand
		const winner = state.players.find((p) => state.zones[`hand_${p}`]?.cards.length === 0)
		return winner ?? null
	}
}
