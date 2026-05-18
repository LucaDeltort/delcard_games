import type { Card, GameStateGeneric } from '$lib/core/types'
import type { Action, GameDefinition } from '$lib/engine'
import { createDeck, createZone } from '$lib/engine'

type ComboType = 'single' | 'pair' | 'triple' | 'quad'

export type PresidentsState = GameStateGeneric & {
	phase: 'exchanging' | 'playing' | 'gameover'
	activePlayers: string[]
	finishOrder: string[]
	scumPenalties: string[]
	lastPlay: { playerId: string; comboType: ComboType; value: number } | null
	passedThisTrick: string[]
	trickLeaderId: string
	pendingExchange: { president: string; scum: string; count: number; presidentTook: Card[] } | null
	sameValueLock: boolean
	sameValueCount: number
	leaderCanPlay: boolean
	lastExchange: {
		scum: string
		president: string
		givenToScum: Card[]
		givenToPresident: Card[]
	} | null
}

// 3 is lowest, 2 is highest
const CARD_VALUE: Record<string, number> = {
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
	A: 14,
	'2': 15
}

function detectCombo(
	handCards: Card[],
	cardIds: string[]
): { comboType: ComboType; value: number } | null {
	const cards = cardIds
		.map((id) => handCards.find((c) => c.id === id))
		.filter((c): c is Card => c !== undefined)
	if (cards.length !== cardIds.length) return null
	const n = cards.length
	if (n < 1 || n > 4) return null
	const faces = cards.map((c) => c.face)
	if (new Set(faces).size !== 1) return null
	const value = CARD_VALUE[faces[0]]
	if (value === undefined) return null
	const comboTypes: Record<number, ComboType> = { 1: 'single', 2: 'pair', 3: 'triple', 4: 'quad' }
	return { comboType: comboTypes[n], value }
}

function beats(
	incoming: { comboType: ComboType; value: number },
	lastPlay: PresidentsState['lastPlay'],
	sameValueLock = false
): boolean {
	if (lastPlay === null) return true
	if (incoming.comboType === 'quad' && lastPlay.comboType !== 'quad') return true
	if (incoming.comboType !== lastPlay.comboType) return false
	if (sameValueLock) return incoming.value === lastPlay.value
	return incoming.value >= lastPlay.value
}

function validCombosFromHand(
	hand: Card[]
): Array<{ comboType: ComboType; value: number; cardIds: string[] }> {
	const result: Array<{ comboType: ComboType; value: number; cardIds: string[] }> = []

	const byFace: Record<string, Card[]> = {}
	for (const card of hand) {
		if (!byFace[card.face]) byFace[card.face] = []
		byFace[card.face].push(card)
	}

	for (const [face, cards] of Object.entries(byFace)) {
		const value = CARD_VALUE[face]
		if (value === undefined) continue
		const n = cards.length

		for (const card of cards) {
			result.push({ comboType: 'single', value, cardIds: [card.id] })
		}

		if (n >= 2) {
			for (let i = 0; i < n - 1; i++) {
				for (let j = i + 1; j < n; j++) {
					result.push({ comboType: 'pair', value, cardIds: [cards[i].id, cards[j].id] })
				}
			}
		}

		if (n >= 3) {
			for (let i = 0; i < n - 2; i++) {
				for (let j = i + 1; j < n - 1; j++) {
					for (let k = j + 1; k < n; k++) {
						result.push({
							comboType: 'triple',
							value,
							cardIds: [cards[i].id, cards[j].id, cards[k].id]
						})
					}
				}
			}
		}

		if (n === 4) {
			result.push({ comboType: 'quad', value, cardIds: cards.map((c) => c.id) })
		}
	}

	return result
}

// Returns next active player by seat order, searching forward from fromId
function nextInSeatOrder(allPlayers: string[], activePlayers: string[], fromId: string): string {
	const idx = allPlayers.indexOf(fromId)
	for (let offset = 1; offset <= allPlayers.length; offset++) {
		const candidate = allPlayers[(idx + offset) % allPlayers.length]
		if (activePlayers.includes(candidate)) return candidate
	}
	return activePlayers[0]
}

function sortByValue(cards: Card[]): Card[] {
	return [...cards].sort((a, b) => (CARD_VALUE[b.face] ?? 0) - (CARD_VALUE[a.face] ?? 0))
}

function findQHeartHolder(players: string[], zones: PresidentsState['zones']): string {
	for (const pid of players) {
		if (zones[`hand_${pid}`]?.cards.some((c) => c.face === 'Q' && c.suit === 'hearts')) {
			return pid
		}
	}
	return players[0]
}

export const presidents: GameDefinition<PresidentsState> = {
	id: 'presidents',
	name: 'Presidents',
	deckType: 'FrenchDeckWithoutJoker',
	minPlayers: 3,
	maxPlayers: 6,

	setup(players, options) {
		const deck = createDeck('FrenchDeckWithoutJoker')
		const hands: Card[][] = players.map(() => [])
		deck.forEach((card, i) => hands[i % players.length].push(card))

		const zones: PresidentsState['zones'] = {}
		players.forEach((pid, i) => {
			zones[`hand_${pid}`] = createZone(`hand_${pid}`, 'fan', hands[i], pid)
		})
		zones.pile = createZone('pile', 'public', [])

		const prevState = options?.previousState as PresidentsState | undefined
		if (prevState?.activeGameId === 'presidents' && prevState.finishOrder.length >= 2) {
			const president = prevState.finishOrder[0]
			const scum = prevState.finishOrder[prevState.finishOrder.length - 1]

			// Auto-take Scum's 2 best → President
			const taken = sortByValue(zones[`hand_${scum}`].cards).slice(0, 2)
			const takenIds = new Set(taken.map((c) => c.id))
			zones[`hand_${scum}`] = {
				...zones[`hand_${scum}`],
				cards: zones[`hand_${scum}`].cards.filter((c) => !takenIds.has(c.id))
			}
			zones[`hand_${president}`] = {
				...zones[`hand_${president}`],
				cards: [...zones[`hand_${president}`].cards, ...taken]
			}

			// Auto VP/VS swap (4+ players in previous finishOrder)
			if (prevState.finishOrder.length >= 4) {
				const vp = prevState.finishOrder[1]
				const vs = prevState.finishOrder[prevState.finishOrder.length - 2]
				const bestVp = sortByValue(zones[`hand_${vp}`].cards)[0]
				const bestVs = sortByValue(zones[`hand_${vs}`].cards)[0]
				if (bestVp && bestVs) {
					zones[`hand_${vp}`] = {
						...zones[`hand_${vp}`],
						cards: [...zones[`hand_${vp}`].cards.filter((c) => c.id !== bestVp.id), bestVs]
					}
					zones[`hand_${vs}`] = {
						...zones[`hand_${vs}`],
						cards: [...zones[`hand_${vs}`].cards.filter((c) => c.id !== bestVs.id), bestVp]
					}
				}
			}

			return {
				players,
				zones,
				turnPlayerId: president,
				phase: 'exchanging',
				activeGameId: 'presidents',
				activePlayers: [...players],
				finishOrder: [],
				scumPenalties: [],
				lastPlay: null,
				passedThisTrick: [],
				trickLeaderId: president,
				pendingExchange: { president, scum, count: 2, presidentTook: taken },
				sameValueLock: false,
				sameValueCount: 0,
				leaderCanPlay: false,
				lastExchange: null
			}
		}

		const starterId = findQHeartHolder(players, zones)

		return {
			players,
			zones,
			turnPlayerId: starterId,
			phase: 'playing',
			activeGameId: 'presidents',
			activePlayers: [...players],
			finishOrder: [],
			scumPenalties: [],
			lastPlay: null,
			passedThisTrick: [],
			trickLeaderId: starterId,
			pendingExchange: null,
			sameValueLock: false,
			sameValueCount: 0,
			leaderCanPlay: false,
			lastExchange: null
		}
	},

	getValidActions(state, playerId) {
		if (state.phase === 'gameover') return []

		if (state.phase === 'exchanging') {
			const pe = state.pendingExchange
			if (!pe || playerId !== pe.president) return []
			const hand = state.zones[`hand_${pe.president}`]?.cards ?? []
			const actions: Action[] = []
			for (let i = 0; i < hand.length - 1; i++) {
				for (let j = i + 1; j < hand.length; j++) {
					actions.push({
						type: 'GIVE_CARDS',
						playerId,
						payload: { cardIds: [hand[i].id, hand[j].id] }
					})
				}
			}
			return actions
		}

		if (!state.activePlayers.includes(playerId)) return []
		if (state.turnPlayerId !== playerId) return []

		const hand = state.zones[`hand_${playerId}`]?.cards ?? []
		const actions: Action[] = []

		for (const combo of validCombosFromHand(hand)) {
			if (beats(combo, state.lastPlay, state.sameValueLock)) {
				actions.push({ type: 'PLAY', playerId, payload: { cardIds: combo.cardIds } })
			}
		}

		if (state.lastPlay !== null) {
			actions.push({ type: 'PASS', playerId })
		}

		return actions
	},

	applyAction(state, action) {
		if (action.type === 'GIVE_CARDS') {
			if (state.phase !== 'exchanging') return state
			const pe = state.pendingExchange
			if (!pe || action.playerId !== pe.president) return state
			const { cardIds } = action.payload as { cardIds: string[] }
			if (cardIds.length !== pe.count) return state
			const presHand = state.zones[`hand_${pe.president}`]
			const scumHand = state.zones[`hand_${pe.scum}`]
			if (!presHand || !scumHand) return state
			const given = cardIds
				.map((id) => presHand.cards.find((c) => c.id === id))
				.filter((c): c is Card => c !== undefined)
			if (given.length !== pe.count) return state

			const newZones = {
				...state.zones,
				[`hand_${pe.president}`]: {
					...presHand,
					cards: presHand.cards.filter((c) => !cardIds.includes(c.id))
				},
				[`hand_${pe.scum}`]: { ...scumHand, cards: [...scumHand.cards, ...given] }
			}

			return {
				...state,
				zones: newZones,
				phase: 'playing',
				pendingExchange: null,
				turnPlayerId: pe.scum,
				trickLeaderId: pe.scum,
				lastPlay: null,
				passedThisTrick: [],
				sameValueLock: false,
				sameValueCount: 0,
				leaderCanPlay: false,
				lastExchange: {
					scum: pe.scum,
					president: pe.president,
					givenToScum: given,
					givenToPresident: pe.presidentTook
				}
			}
		}

		if (state.phase !== 'playing') return state
		if (!state.activePlayers.includes(action.playerId)) return state
		if (state.turnPlayerId !== action.playerId) return state

		if (action.type === 'PASS') {
			if (state.lastPlay === null) return state

			// Leader was given another chance and chose to pass → they won the trick, they lead next
			if (state.leaderCanPlay) {
				return {
					...state,
					lastPlay: null,
					passedThisTrick: [],
					trickLeaderId: action.playerId,
					turnPlayerId: action.playerId,
					sameValueLock: false,
					sameValueCount: 0,
					leaderCanPlay: false,
					zones: { ...state.zones, pile: { ...state.zones.pile, cards: [] } }
				}
			}

			const passedThisTrick = [...state.passedThisTrick, action.playerId]
			const otherActive = state.activePlayers.filter((p) => p !== state.lastPlay!.playerId)
			const allPassed =
				otherActive.length > 0 && otherActive.every((p) => passedThisTrick.includes(p))

			if (allPassed) {
				// All others passed → give turn back to last player who played
				const lastPlayerId = state.lastPlay.playerId
				const leader = state.activePlayers.includes(lastPlayerId)
					? lastPlayerId
					: nextInSeatOrder(state.players, state.activePlayers, lastPlayerId)
				return {
					...state,
					passedThisTrick: [],
					turnPlayerId: leader,
					sameValueLock: false,
					leaderCanPlay: true
				}
			}

			return {
				...state,
				passedThisTrick,
				sameValueLock: false,
				leaderCanPlay: false,
				turnPlayerId: nextInSeatOrder(state.players, state.activePlayers, action.playerId)
			}
		}

		if (action.type === 'PLAY') {
			const payload = action.payload as { cardIds: string[] }
			const hand = state.zones[`hand_${action.playerId}`]
			if (!hand) return state

			const combo = detectCombo(hand.cards, payload.cardIds)
			if (!combo || !beats(combo, state.lastPlay, state.sameValueLock)) return state

			const COMBO_SIZE: Record<ComboType, number> = { single: 1, pair: 2, triple: 3, quad: 4 }
			const isChaining = state.lastPlay !== null && combo.value === state.lastPlay.value
			const prevCount = state.sameValueCount ?? 0
			const newSameValueCount = isChaining
				? prevCount + COMBO_SIZE[combo.comboType]
				: COMBO_SIZE[combo.comboType]
			const isSquare = newSameValueCount >= 4 || combo.value === 15
			const sameValueLock = isChaining && !isSquare

			const playedCards = payload.cardIds
				.map((id) => hand.cards.find((c) => c.id === id))
				.filter((c): c is Card => c !== undefined)
			const newHandCards = hand.cards.filter((c) => !payload.cardIds.includes(c.id))

			const newZones = {
				...state.zones,
				[`hand_${action.playerId}`]: { ...hand, cards: newHandCards },
				pile: { ...state.zones.pile, cards: playedCards }
			}

			let { activePlayers, finishOrder } = state
			let scumPenalties = state.scumPenalties

			if (newHandCards.length === 0) {
				activePlayers = activePlayers.filter((p) => p !== action.playerId)
				if (combo.value === 15) {
					// Finished with a 2 → goes to end of finishOrder (scum)
					scumPenalties = [...scumPenalties, action.playerId]
				} else {
					finishOrder = [...finishOrder, action.playerId]
				}
			}

			// Gameover: only 1 or 0 active players remain
			if (activePlayers.length <= 1) {
				if (activePlayers.length === 1) {
					finishOrder = [...finishOrder, activePlayers[0]]
				}
				finishOrder = [...finishOrder, ...scumPenalties]
				return {
					...state,
					zones: newZones,
					activePlayers,
					finishOrder,
					scumPenalties: [],
					phase: 'gameover',
					lastPlay: { playerId: action.playerId, comboType: combo.comboType, value: combo.value },
					passedThisTrick: [],
					sameValueLock: false,
					sameValueCount: 0,
					leaderCanPlay: false,
					turnPlayerId: activePlayers[0] ?? state.players[0]
				}
			}

			// Finishing hand ends the trick immediately
			if (newHandCards.length === 0) {
				const nextLeader = nextInSeatOrder(state.players, activePlayers, action.playerId)
				return {
					...state,
					zones: { ...newZones, pile: { ...newZones.pile, cards: [] } },
					activePlayers,
					finishOrder,
					scumPenalties,
					turnPlayerId: nextLeader,
					trickLeaderId: nextLeader,
					lastPlay: null,
					passedThisTrick: [],
					sameValueLock: false,
					sameValueCount: 0,
					leaderCanPlay: false
				}
			}

			// Square or 2 played: trick ends, player who played it leads (if still active)
			if (isSquare) {
				const nextLeader = activePlayers.includes(action.playerId)
					? action.playerId
					: nextInSeatOrder(state.players, activePlayers, action.playerId)
				return {
					...state,
					zones: { ...newZones, pile: { ...newZones.pile, cards: [] } },
					activePlayers,
					finishOrder,
					scumPenalties,
					turnPlayerId: nextLeader,
					trickLeaderId: nextLeader,
					lastPlay: null,
					passedThisTrick: [],
					sameValueLock: false,
					sameValueCount: 0,
					leaderCanPlay: false
				}
			}

			const nextTurn = nextInSeatOrder(state.players, activePlayers, action.playerId)

			return {
				...state,
				zones: newZones,
				activePlayers,
				finishOrder,
				scumPenalties,
				turnPlayerId: nextTurn,
				lastPlay: { playerId: action.playerId, comboType: combo.comboType, value: combo.value },
				passedThisTrick: [],
				sameValueLock,
				sameValueCount: newSameValueCount,
				leaderCanPlay: false
			}
		}

		return state
	},

	onPlayerDisconnect(state, playerId) {
		return {
			...state,
			phase: 'gameover',
			activePlayers: state.activePlayers.filter((p) => p !== playerId)
		}
	},

	isOver(state) {
		return state.phase === 'gameover'
	},

	getWinner(state) {
		if (state.phase !== 'gameover') return null
		return state.finishOrder[0] ?? null
	}
}
