import type { GameStateGeneric } from '$lib/core/types'
import type { GameDefinition } from '$lib/engine'
import { createDeck, createZone, deal, moveCard, nextPlayer } from '$lib/engine'

type WarState = GameStateGeneric & {
	phase: 'playing' | 'reviewing' | 'gameover'
}

const FACE_VALUES: Record<string, number> = {
	'2': 2,
	'3': 3,
	'4': 4,
	'5': 5,
	'6': 6,
	'7': 7,
	'8': 8,
	'9': 9,
	'10': 10,
	J: 11,
	Q: 12,
	K: 13,
	A: 14
}

export const war: GameDefinition<WarState> = {
	id: 'war',
	name: 'War',
	deckType: 'FrenchDeckWithoutJoker',
	minPlayers: 2,
	maxPlayers: 2,

	setup(players) {
		const { hands } = deal(createDeck('FrenchDeckWithoutJoker'), 26, 2)
		const zones: WarState['zones'] = {}
		players.forEach((pid, i) => {
			zones[`deck_${pid}`] = createZone(`deck_${pid}`, 'hidden', hands[i], pid)
			zones[`played_${pid}`] = createZone(`played_${pid}`, 'public', [], pid)
			zones[`won_${pid}`] = createZone(`won_${pid}`, 'hidden', [], pid)
		})
		return {
			players,
			zones,
			turnPlayerId: players[0],
			phase: 'playing',
			activeGameId: 'war'
		}
	},

	getValidActions(state, playerId) {
		if (state.phase === 'reviewing') {
			return playerId === state.players[0] ? [{ type: 'NEXT_ROUND', playerId }] : []
		}
		if (state.phase !== 'playing') return []
		if (state.turnPlayerId !== playerId) return []
		const deck = state.zones[`deck_${playerId}`]
		if (!deck || deck.cards.length === 0) return []
		return [{ type: 'REVEAL', playerId }]
	},

	applyAction(state, action) {
		if (action.type === 'NEXT_ROUND') {
			let zones = { ...state.zones }
			const playedCards = state.players.map((p) => zones[`played_${p}`].cards[0])
			const values = playedCards.map((c) => FACE_VALUES[c.face] ?? 0)

			if (values[0] !== values[1]) {
				const winnerId = state.players[values[0] > values[1] ? 0 : 1]
				for (const p of state.players) {
					zones = moveCard(
						zones,
						`played_${p}`,
						`won_${winnerId}`,
						zones[`played_${p}`].cards[0].id
					)
				}
			} else {
				for (const p of state.players) {
					zones = { ...zones, [`played_${p}`]: { ...zones[`played_${p}`], cards: [] } }
				}
			}

			const gameOver = state.players.some((p) => zones[`deck_${p}`].cards.length === 0)
			return {
				...state,
				zones,
				turnPlayerId: state.players[0],
				phase: gameOver ? 'gameover' : 'playing'
			}
		}

		if (action.type !== 'REVEAL') return state

		const pid = action.playerId
		const deck = state.zones[`deck_${pid}`]
		if (!deck || deck.cards.length === 0) return state

		const zones = moveCard(state.zones, `deck_${pid}`, `played_${pid}`, deck.cards[0].id)

		const allPlayed = state.players.every((p) => zones[`played_${p}`].cards.length > 0)

		if (!allPlayed) {
			return { ...state, zones, turnPlayerId: nextPlayer(state.players, pid) }
		}

		// Both cards revealed — host confirms before resolving
		return { ...state, zones, turnPlayerId: state.players[0], phase: 'reviewing' }
	},

	onPlayerDisconnect(state, playerId) {
		return {
			...state,
			phase: 'gameover',
			players: state.players.filter((p) => p !== playerId)
		}
	},

	isOver(state) {
		return state.phase === 'gameover'
	},

	getWinner(state) {
		if (state.phase !== 'gameover') return null
		return state.players.reduce((best, p) => {
			const total =
				(state.zones[`deck_${p}`]?.cards.length ?? 0) + (state.zones[`won_${p}`]?.cards.length ?? 0)
			const bestTotal =
				(state.zones[`deck_${best}`]?.cards.length ?? 0) +
				(state.zones[`won_${best}`]?.cards.length ?? 0)
			return total > bestTotal ? p : best
		})
	}
}
