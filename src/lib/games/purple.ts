import type { Card, GameStateGeneric, GameZone } from '$lib/core/types'
import type { Action, GameDefinition } from '$lib/engine'
import { createDeck, createZone, moveCard, nextPlayer, shuffle } from '$lib/engine'

export type PurpleState = GameStateGeneric & {
	phase: 'betting' | 'failing' | 'gameover'
	scores: Record<string, number>
	turnBets: number
	lastFlipped: Card[]
	options: { endTurnOnEmptyDeck: boolean; allowDecreaseScore: boolean; endScore: number }
	lastScoreEvent?: { pid: string; timestamp: number }
}

function getCardColor(card: Card): 'red' | 'black' {
	return card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black'
}

function refillDeckIfNeeded(state: PurpleState, required: number): PurpleState {
	const deckZone = state.zones['deck']
	if (deckZone.cards.length >= required) return state

	let newCards = [...deckZone.cards]
	const newZones = { ...state.zones }

	state.players.forEach((pId) => {
		const pBank = newZones[`penaltyBank_${pId}`]
		newCards = [...newCards, ...pBank.cards]
		newZones[`penaltyBank_${pId}`] = { ...pBank, cards: [] }
	})

	newZones['deck'] = { ...deckZone, cards: shuffle(newCards) }

	const newState = { ...state, zones: newZones }

	if (state.options.endTurnOnEmptyDeck) {
		newState.turnPlayerId = nextPlayer(state.players, state.turnPlayerId)
		newState.turnBets = 0
		newState.lastFlipped = []
		newState.phase = 'betting'
	}

	return newState
}

export const purple: GameDefinition<PurpleState> = {
	id: 'purple',
	name: 'Purple',
	deckType: 'FrenchDeckWithoutJoker',
	minPlayers: 2,
	maxPlayers: 8,
	isNew: true,
	optionsSchema: [
		{
			key: 'endTurnOnEmptyDeck',
			label: 'purple.options.endTurnOnEmptyDeck',
			type: 'boolean',
			default: false
		},
		{
			key: 'allowDecreaseScore',
			label: 'purple.options.allowDecreaseScore',
			type: 'boolean',
			default: true
		},
		{
			key: 'endScore',
			label: 'purple.options.endScore',
			type: 'number',
			default: 15,
			min: 5,
			max: 50
		}
	],

	setup(players, options = {}) {
		const deck = createDeck('FrenchDeckWithoutJoker')
		const zones: Record<string, GameZone> = {
			deck: createZone('deck', 'hidden', deck),
			playingBank: createZone('playingBank', 'public', [])
		}
		const scores: Record<string, number> = {}
		players.forEach((pid) => {
			zones[`penaltyBank_${pid}`] = createZone(`penaltyBank_${pid}`, 'public', [], pid)
			scores[pid] = 0
		})

		return {
			players,
			zones,
			turnPlayerId: players[0],
			phase: 'betting',
			activeGameId: 'purple',
			scores,
			turnBets: 0,
			lastFlipped: [],
			options: {
				endTurnOnEmptyDeck: options?.endTurnOnEmptyDeck === true,
				allowDecreaseScore: options?.allowDecreaseScore !== false,
				endScore: typeof options?.endScore === 'number' ? options.endScore : 15
			}
		}
	},

	getValidActions(state, playerId) {
		if (state.phase !== 'betting' && state.phase !== 'failing') return []

		const actions: Action[] = []

		if (state.turnPlayerId === playerId) {
			if (state.phase === 'failing') {
				actions.push({ type: 'FINALIZE_FAILURE', playerId })
			} else {
				actions.push(
					{ type: 'BET_RED', playerId },
					{ type: 'BET_BLACK', playerId },
					{ type: 'BET_PURPLE', playerId }
				)
				if (state.turnBets >= 3) {
					actions.push({ type: 'STOP', playerId })
				}
			}
		} else {
			if (state.options.allowDecreaseScore) {
				actions.push({ type: 'DECREASE_SCORE', playerId })
			}
		}

		return actions
	},

	applyAction(state, action) {
		let s = { ...state }

		if (action.type === 'BET_RED' || action.type === 'BET_BLACK') {
			const oldTurnPlayerId = s.turnPlayerId
			s = refillDeckIfNeeded(s, 1)
			if (s.turnPlayerId !== oldTurnPlayerId) return s

			const deck = s.zones['deck'].cards
			if (deck.length === 0) return s

			const card = deck[0]
			s.zones = moveCard(s.zones, 'deck', 'playingBank', card.id)
			s.lastFlipped = [card]

			const color = getCardColor(card)
			const win =
				(action.type === 'BET_RED' && color === 'red') ||
				(action.type === 'BET_BLACK' && color === 'black')

			if (win) {
				s.turnBets += 1
				s.phase = 'betting'
			} else {
				s.phase = 'failing'
			}
			return s
		}

		if (action.type === 'BET_PURPLE') {
			const oldTurnPlayerId = s.turnPlayerId
			s = refillDeckIfNeeded(s, 2)
			if (s.turnPlayerId !== oldTurnPlayerId) return s

			const deck = s.zones['deck'].cards
			if (deck.length < 2) return s

			const card1 = deck[0]
			const card2 = deck[1]
			s.zones = moveCard(s.zones, 'deck', 'playingBank', card1.id)
			s.zones = moveCard(s.zones, 'deck', 'playingBank', card2.id)

			const win = getCardColor(card1) !== getCardColor(card2)

			if (win) {
				s.turnBets += 2
				s.lastFlipped = [card1, card2]
				s.phase = 'betting'
			} else {
				s.lastFlipped = [card1, card2]
				s.phase = 'failing'
			}
			return s
		}

		if (action.type === 'DECREASE_SCORE') {
			const targetId = action.playerId
			const currentScore = s.scores[targetId] || 0
			if (currentScore > 0) {
				s = {
					...s,
					scores: { ...s.scores, [targetId]: currentScore - 1 },
					lastScoreEvent: { pid: targetId, timestamp: Date.now() }
				}
			}
			return s
		}

		if (action.type === 'FINALIZE_FAILURE') {
			let zones = { ...s.zones }
			const playing = [...zones['playingBank'].cards]

			playing.forEach((c) => {
				zones = moveCard(zones, 'playingBank', `penaltyBank_${s.turnPlayerId}`, c.id)
			})

			s.zones = zones
			s.turnBets = 0
			s.lastFlipped = []
			s.phase = 'betting'
			return s
		}

		if (action.type === 'STOP') {
			const pid = s.turnPlayerId
			const newScores = {
				...s.scores,
				[pid]: (s.scores[pid] || 0) + s.zones[`penaltyBank_${pid}`].cards.length
			}

			const newZones = { ...s.zones }
			s.players.forEach((p) => {
				newZones[`penaltyBank_${p}`] = { ...newZones[`penaltyBank_${p}`], cards: [] }
			})
			newZones['playingBank'] = { ...newZones['playingBank'], cards: [] }
			newZones['deck'] = createZone('deck', 'hidden', shuffle(createDeck('FrenchDeckWithoutJoker')))

			s = {
				...s,
				scores: newScores,
				zones: newZones,
				turnPlayerId: nextPlayer(s.players, s.turnPlayerId),
				turnBets: 0,
				lastFlipped: [],
				phase: 'betting'
			}
			return s
		}

		return s
	},

	isOver(state) {
		const limit = state.options.endScore ?? 15
		return state.players.some((pid) => (state.scores[pid] ?? 0) >= limit)
	},

	getWinner(state) {
		const limit = state.options.endScore ?? 15
		if (!state.players.some((pid) => (state.scores[pid] ?? 0) >= limit)) return null
		return state.players.reduce((best, pid) =>
			(state.scores[pid] ?? 0) < (state.scores[best] ?? 0) ? pid : best
		)
	},

	onPlayerDisconnect(state, playerId) {
		const remaining = state.players.filter((p) => p !== playerId)
		const newZones = { ...state.zones }

		// Reclaim stuck cards: penalty bank + playing bank if it was their turn
		const rescued = [
			...(newZones[`penaltyBank_${playerId}`]?.cards ?? []),
			...(state.turnPlayerId === playerId ? newZones['playingBank'].cards : [])
		]
		newZones[`penaltyBank_${playerId}`] = { ...newZones[`penaltyBank_${playerId}`], cards: [] }
		if (state.turnPlayerId === playerId) {
			newZones['playingBank'] = { ...newZones['playingBank'], cards: [] }
		}
		newZones['deck'] = {
			...newZones['deck'],
			cards: shuffle([...newZones['deck'].cards, ...rescued])
		}

		if (remaining.length < 2) {
			return { ...state, players: remaining, zones: newZones, phase: 'gameover' }
		}

		let nextTurn = state.turnPlayerId
		if (nextTurn === playerId) {
			const idx = state.players.indexOf(playerId)
			const candidate = state.players[(idx + 1) % state.players.length]
			nextTurn = candidate === playerId ? remaining[0] : candidate
		}

		return {
			...state,
			players: remaining,
			zones: newZones,
			turnPlayerId: nextTurn,
			turnBets: 0,
			lastFlipped: [],
			phase: 'betting'
		}
	}
}
