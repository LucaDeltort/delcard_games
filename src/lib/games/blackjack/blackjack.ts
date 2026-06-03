import type { Card, GameStateGeneric } from '$lib/core/types'
import type { GameDefinition } from '$lib/engine'
import { createDeck, createZone, deal, drawCard, shuffle } from '$lib/engine'

type PlayerStatus = 'playing' | 'standing' | 'bust'

export type BlackjackState = GameStateGeneric & {
	phase: 'playing' | 'scoring' | 'gameover'
	playerStatus: Record<string, PlayerStatus>
}

export function handValue(cards: Card[]): number {
	let total = 0
	let aces = 0
	for (const c of cards) {
		if (c.face === 'A') {
			aces++
			total += 11
		} else if (['J', 'Q', 'K'].includes(c.face)) {
			total += 10
		} else {
			total += parseInt(c.face, 10)
		}
	}
	while (total > 21 && aces > 0) {
		total -= 10
		aces--
	}
	return total
}

function buildShoe(): Card[] {
	return shuffle([
		...createDeck('FrenchDeckWithoutJoker'),
		...createDeck('FrenchDeckWithoutJoker'),
		...createDeck('FrenchDeckWithoutJoker'),
		...createDeck('FrenchDeckWithoutJoker')
	])
}

function resolveDealerTurn(state: BlackjackState): BlackjackState {
	let deckCards = state.zones['deck'].cards
	let dealerCards = state.zones['hand_dealer'].cards

	while (handValue(dealerCards) < 17 && deckCards.length > 0) {
		const result = drawCard(deckCards)
		if (!result) break
		dealerCards = [...dealerCards, result.card]
		deckCards = result.remaining
	}

	return {
		...state,
		zones: {
			...state.zones,
			deck: { ...state.zones['deck'], cards: deckCards },
			hand_dealer: { ...state.zones['hand_dealer'], cards: dealerCards }
		},
		phase: 'scoring',
		turnPlayerId: state.players[0]
	}
}

function advanceFromPlayer(state: BlackjackState): BlackjackState {
	const currentIdx = state.players.indexOf(state.turnPlayerId)
	for (let i = currentIdx + 1; i < state.players.length; i++) {
		if (state.playerStatus[state.players[i]] === 'playing') {
			return { ...state, turnPlayerId: state.players[i] }
		}
	}
	return resolveDealerTurn(state)
}

function dealRound(players: string[], base: Partial<BlackjackState> = {}): BlackjackState {
	const { hands, remaining } = deal(buildShoe(), 2, players.length + 1)

	const zones: BlackjackState['zones'] = {
		deck: createZone('deck', 'hidden', remaining),
		hand_dealer: createZone('hand_dealer', 'fan', hands[players.length])
	}

	// Auto-stand players with natural blackjack
	const playerStatus: Record<string, PlayerStatus> = {}
	players.forEach((pid, i) => {
		zones[`hand_${pid}`] = createZone(`hand_${pid}`, 'fan', hands[i], pid)
		playerStatus[pid] = handValue(hands[i]) === 21 ? 'standing' : 'playing'
	})

	// Dealer blackjack: skip player turns, go straight to scoring
	const dealerBJ = handValue(hands[players.length]) === 21
	if (dealerBJ) {
		// Non-BJ players lose; BJ players push — both are 'standing' for scoring comparison
		players.forEach((pid) => {
			if (playerStatus[pid] !== 'standing') playerStatus[pid] = 'standing'
		})
		return {
			...(base as BlackjackState),
			players,
			zones,
			turnPlayerId: players[0],
			phase: 'scoring',
			activeGameId: 'blackjack',
			playerStatus
		}
	}

	const firstPlaying = players.find((p) => playerStatus[p] === 'playing')

	// All players have natural BJ — go straight to dealer turn
	if (!firstPlaying) {
		return resolveDealerTurn({
			...(base as BlackjackState),
			players,
			zones,
			turnPlayerId: players[0],
			phase: 'playing',
			activeGameId: 'blackjack',
			playerStatus
		})
	}

	return {
		...(base as BlackjackState),
		players,
		zones,
		turnPlayerId: firstPlaying,
		phase: 'playing',
		activeGameId: 'blackjack',
		playerStatus
	}
}

export const blackjack: GameDefinition<BlackjackState> = {
	id: 'blackjack',
	name: 'Blackjack',
	deckType: 'FrenchDeckWithoutJoker',
	minPlayers: 1,
	maxPlayers: 6,
	isNew: true,

	setup(players) {
		return dealRound(players)
	},

	getValidActions(state, playerId) {
		if (state.phase === 'gameover') return []
		if (state.phase === 'scoring') {
			if (playerId !== state.players[0]) return []
			return [
				{ type: 'NEW_ROUND', playerId },
				{ type: 'END_GAME', playerId }
			]
		}
		if (state.turnPlayerId !== playerId) return []
		if (state.playerStatus[playerId] !== 'playing') return []

		const hand = state.zones[`hand_${playerId}`]?.cards ?? []
		const actions = [
			{ type: 'HIT', playerId },
			{ type: 'STAND', playerId }
		]
		if (hand.length === 2) {
			actions.push({ type: 'DOUBLE', playerId })
		}
		return actions
	},

	applyAction(state, action) {
		const pid = action.playerId

		if (action.type === 'NEW_ROUND') {
			return dealRound(state.players)
		}

		if (action.type === 'END_GAME') {
			return { ...state, phase: 'gameover' }
		}

		if (action.type === 'HIT') {
			const result = drawCard(state.zones['deck'].cards)
			if (!result) return state

			const newHand = [...state.zones[`hand_${pid}`].cards, result.card]
			const zones = {
				...state.zones,
				deck: { ...state.zones['deck'], cards: result.remaining },
				[`hand_${pid}`]: { ...state.zones[`hand_${pid}`], cards: newHand }
			}
			const val = handValue(newHand)

			if (val > 21) {
				return advanceFromPlayer({
					...state,
					zones,
					playerStatus: { ...state.playerStatus, [pid]: 'bust' }
				})
			}
			return { ...state, zones }
		}

		if (action.type === 'STAND') {
			return advanceFromPlayer({
				...state,
				playerStatus: { ...state.playerStatus, [pid]: 'standing' }
			})
		}

		if (action.type === 'DOUBLE') {
			const result = drawCard(state.zones['deck'].cards)
			if (!result) return state

			const newHand = [...state.zones[`hand_${pid}`].cards, result.card]
			const zones = {
				...state.zones,
				deck: { ...state.zones['deck'], cards: result.remaining },
				[`hand_${pid}`]: { ...state.zones[`hand_${pid}`], cards: newHand }
			}
			const status: PlayerStatus = handValue(newHand) > 21 ? 'bust' : 'standing'

			return advanceFromPlayer({
				...state,
				zones,
				playerStatus: { ...state.playerStatus, [pid]: status }
			})
		}

		return state
	},

	isOver(state) {
		return state.phase === 'gameover'
	},

	getWinner(state) {
		if (state.phase !== 'gameover') return null

		const dealerValue = handValue(state.zones['hand_dealer'].cards)
		const dealerBust = dealerValue > 21

		if (dealerBust) {
			const eligible = state.players.filter((p) => state.playerStatus[p] !== 'bust')
			if (eligible.length === 0) return null
			return eligible.reduce((best, p) =>
				handValue(state.zones[`hand_${p}`].cards) > handValue(state.zones[`hand_${best}`].cards)
					? p
					: best
			)
		}

		const winners = state.players.filter(
			(p) =>
				state.playerStatus[p] !== 'bust' && handValue(state.zones[`hand_${p}`].cards) > dealerValue
		)
		if (winners.length === 0) return null

		return winners.reduce((best, p) =>
			handValue(state.zones[`hand_${p}`].cards) > handValue(state.zones[`hand_${best}`].cards)
				? p
				: best
		)
	},

	onPlayerDisconnect(state, playerId) {
		const wasTheirTurn = state.turnPlayerId === playerId && state.phase === 'playing'
		const players = state.players.filter((p) => p !== playerId)
		const playerStatus = Object.fromEntries(
			Object.entries(state.playerStatus).filter(([k]) => k !== playerId)
		) as Record<string, PlayerStatus>
		const zones = Object.fromEntries(
			Object.entries(state.zones).filter(([k]) => k !== `hand_${playerId}`)
		)

		if (players.length === 0) {
			return { ...state, players, zones, playerStatus, phase: 'gameover' }
		}

		const nextState: BlackjackState = { ...state, players, zones, playerStatus }

		if (!wasTheirTurn) return nextState

		const originalIdx = state.players.indexOf(playerId)
		for (let i = originalIdx + 1; i < state.players.length; i++) {
			if (nextState.playerStatus[state.players[i]] === 'playing') {
				return { ...nextState, turnPlayerId: state.players[i] }
			}
		}
		return resolveDealerTurn(nextState)
	}
}
