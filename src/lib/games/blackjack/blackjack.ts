import type { Card, GameStateGeneric } from '$lib/core/types'
import type { GameDefinition, OptionSchema } from '$lib/engine'
import { createDeck, createZone, deal, drawCard, shuffle } from '$lib/engine'

type PlayerStatus = 'playing' | 'standing' | 'bust'

export type RoundResult = 'win' | 'lose' | 'push'

export type BlackjackOptions = {
	betting: boolean
	startingCoins: number
}

export type BlackjackState = GameStateGeneric & {
	phase: 'betting' | 'playing' | 'scoring' | 'gameover'
	playerStatus: Record<string, PlayerStatus>
	options: BlackjackOptions
	coins: Record<string, number>
	bets: Record<string, number>
	// How many times each player has taken a stack (1 = first buy-in, >1 = rebought after going broke).
	buyIns: Record<string, number>
	// --- split (additive; empty unless a player has split) ---
	// Status / stake of each player's second hand, keyed by player id.
	splitStatus: Record<string, PlayerStatus>
	splitBets: Record<string, number>
	// Which sub-hand the current player is acting on (0 = primary, 1 = split).
	activeHand: Record<string, 0 | 1>
}

const DEFAULT_OPTIONS: BlackjackOptions = { betting: false, startingCoins: 500 }

/** Zone id of a player's second (split) hand. */
export const splitZoneId = (pid: string): string => `hand_${pid}__split`

/** True once a player has split into two hands this round. */
export function hasSplit(state: BlackjackState, pid: string): boolean {
	return state.splitStatus[pid] !== undefined
}

/** The sub-hand the player is currently acting on (0 = primary, 1 = split). */
function activeIndex(state: BlackjackState, pid: string): 0 | 1 {
	return hasSplit(state, pid) ? (state.activeHand[pid] ?? 0) : 0
}

function activeZone(state: BlackjackState, pid: string): string {
	return activeIndex(state, pid) === 0 ? `hand_${pid}` : splitZoneId(pid)
}

function parseOptions(raw?: Record<string, unknown>): BlackjackOptions {
	if (!raw) return { ...DEFAULT_OPTIONS }
	return {
		betting: raw.betting === true,
		startingCoins:
			typeof raw.startingCoins === 'number' && raw.startingCoins > 0
				? Math.floor(raw.startingCoins)
				: DEFAULT_OPTIONS.startingCoins
	}
}

export const blackjackOptionsSchema: OptionSchema[] = [
	{
		key: 'betting',
		type: 'boolean',
		default: false,
		label: 'blackjack.options.betting',
		description: 'blackjack.options.bettingDesc'
	},
	{
		key: 'startingCoins',
		type: 'number',
		default: 500,
		min: 100,
		max: 5000,
		step: 100,
		label: 'blackjack.options.startingCoins',
		description: 'blackjack.options.startingCoinsDesc',
		disabledWhen: { key: 'betting', value: false }
	}
]

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

function isNaturalBlackjack(cards: Card[]): boolean {
	return cards.length === 2 && handValue(cards) === 21
}

/** A splittable pair: two cards of equal value (e.g. 8|8, or any two ten-value cards K|Q). */
function isSplittablePair(a: Card, b: Card): boolean {
	return handValue([a]) === handValue([b])
}

/** Outcome of a single hand against the dealer. */
export function outcomeFor(dealerValue: number, cards: Card[], busted: boolean): RoundResult {
	if (busted) return 'lose'
	const val = handValue(cards)
	if (dealerValue > 21) return 'win'
	if (val > dealerValue) return 'win'
	if (val === dealerValue) return 'push'
	return 'lose'
}

/** Result of a player's primary hand vs the dealer. Shared by payout logic and the view. */
export function roundOutcome(state: BlackjackState, pid: string): RoundResult {
	return outcomeFor(
		handValue(state.zones['hand_dealer']?.cards ?? []),
		state.zones[`hand_${pid}`]?.cards ?? [],
		state.playerStatus[pid] === 'bust'
	)
}

/** Result of a player's split hand vs the dealer, or null if they didn't split. */
export function splitOutcome(state: BlackjackState, pid: string): RoundResult | null {
	if (!hasSplit(state, pid)) return null
	return outcomeFor(
		handValue(state.zones['hand_dealer']?.cards ?? []),
		state.zones[splitZoneId(pid)]?.cards ?? [],
		state.splitStatus[pid] === 'bust'
	)
}

/** Net coin change for a bet given its outcome. Natural blackjack wins pay 3:2. */
export function betNet(bet: number, outcome: RoundResult, natural: boolean): number {
	if (outcome === 'lose') return -bet
	if (outcome === 'push') return 0
	return natural ? Math.floor(bet * 1.5) : bet
}

function buildShoe(): Card[] {
	return shuffle([
		...createDeck('FrenchDeckWithoutJoker'),
		...createDeck('FrenchDeckWithoutJoker'),
		...createDeck('FrenchDeckWithoutJoker'),
		...createDeck('FrenchDeckWithoutJoker')
	])
}

/** Transition into scoring, paying out bets (stake was deducted when the bet was placed). */
function enterScoring(state: BlackjackState): BlackjackState {
	let coins = state.coins
	if (state.options.betting) {
		coins = { ...state.coins }
		const dealerValue = handValue(state.zones['hand_dealer']?.cards ?? [])
		for (const pid of state.players) {
			// Primary hand — a natural blackjack only counts if the player never split.
			const bet0 = state.bets[pid] ?? 0
			if (bet0 > 0) {
				const cards0 = state.zones[`hand_${pid}`]?.cards ?? []
				const out0 = outcomeFor(dealerValue, cards0, state.playerStatus[pid] === 'bust')
				const natural0 = !hasSplit(state, pid) && isNaturalBlackjack(cards0)
				coins[pid] = (coins[pid] ?? 0) + bet0 + betNet(bet0, out0, natural0)
			}
			// Split hand (never a natural blackjack).
			if (hasSplit(state, pid)) {
				const betS = state.splitBets[pid] ?? 0
				if (betS > 0) {
					const cardsS = state.zones[splitZoneId(pid)]?.cards ?? []
					const outS = outcomeFor(dealerValue, cardsS, state.splitStatus[pid] === 'bust')
					coins[pid] = (coins[pid] ?? 0) + betS + betNet(betS, outS, false)
				}
			}
		}
	}
	return { ...state, coins, phase: 'scoring', turnPlayerId: state.players[0] }
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

	return enterScoring({
		...state,
		zones: {
			...state.zones,
			deck: { ...state.zones['deck'], cards: deckCards },
			hand_dealer: { ...state.zones['hand_dealer'], cards: dealerCards }
		}
	})
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

/**
 * Advance after a sub-hand finishes: if the current player split and still has a
 * second hand to play, switch to it; otherwise move on to the next player.
 */
function advanceTurn(state: BlackjackState, pid: string): BlackjackState {
	if (hasSplit(state, pid)) {
		const cur = state.activeHand[pid] ?? 0
		if (cur === 0 && state.splitStatus[pid] === 'playing') {
			return { ...state, activeHand: { ...state.activeHand, [pid]: 1 } }
		}
	}
	return advanceFromPlayer(state)
}

type RoundBase = Pick<BlackjackState, 'options' | 'coins' | 'bets' | 'buyIns'>

function dealRound(players: string[], base: RoundBase): BlackjackState {
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

	const common = {
		players,
		zones,
		activeGameId: 'blackjack',
		options: base.options,
		coins: base.coins,
		bets: base.bets,
		buyIns: base.buyIns,
		playerStatus,
		splitStatus: {},
		splitBets: {},
		activeHand: {}
	}

	// Dealer blackjack: skip player turns, go straight to scoring
	const dealerBJ = handValue(hands[players.length]) === 21
	if (dealerBJ) {
		// Non-BJ players lose; BJ players push — both are 'standing' for scoring comparison
		players.forEach((pid) => {
			if (playerStatus[pid] !== 'standing') playerStatus[pid] = 'standing'
		})
		return enterScoring({
			...common,
			turnPlayerId: players[0],
			phase: 'playing'
		} as BlackjackState)
	}

	const firstPlaying = players.find((p) => playerStatus[p] === 'playing')

	// All players have natural BJ — go straight to dealer turn
	if (!firstPlaying) {
		return resolveDealerTurn({
			...common,
			turnPlayerId: players[0],
			phase: 'playing'
		} as BlackjackState)
	}

	return {
		...common,
		turnPlayerId: firstPlaying,
		phase: 'playing'
	} as BlackjackState
}

/** Open the betting phase: rebuy broke players, clear bets, deal nothing yet. */
function startBetting(
	players: string[],
	options: BlackjackOptions,
	coins: Record<string, number>,
	buyIns: Record<string, number>
): BlackjackState {
	const newCoins = { ...coins }
	const newBuyIns = { ...buyIns }
	for (const pid of players) {
		// First stack or a rebuy after going broke — bump the buy-in counter either way.
		if (newCoins[pid] === undefined || newCoins[pid] <= 0) {
			newCoins[pid] = options.startingCoins
			newBuyIns[pid] = (newBuyIns[pid] ?? 0) + 1
		}
	}

	const zones: BlackjackState['zones'] = {
		hand_dealer: createZone('hand_dealer', 'fan', [])
	}
	const playerStatus: Record<string, PlayerStatus> = {}
	players.forEach((pid) => {
		zones[`hand_${pid}`] = createZone(`hand_${pid}`, 'fan', [], pid)
		playerStatus[pid] = 'playing'
	})

	return {
		players,
		zones,
		turnPlayerId: players[0],
		phase: 'betting',
		activeGameId: 'blackjack',
		playerStatus,
		options,
		coins: newCoins,
		bets: {},
		buyIns: newBuyIns,
		splitStatus: {},
		splitBets: {},
		activeHand: {}
	}
}

function newRound(state: BlackjackState): BlackjackState {
	if (state.options.betting)
		return startBetting(state.players, state.options, state.coins, state.buyIns)
	return dealRound(state.players, { options: state.options, coins: {}, bets: {}, buyIns: {} })
}

export const blackjack: GameDefinition<BlackjackState> = {
	id: 'blackjack',
	name: 'Blackjack',
	deckType: 'FrenchDeckWithoutJoker',
	minPlayers: 1,
	maxPlayers: 6,
	optionsSchema: blackjackOptionsSchema,
	isNew: true,

	setup(players, rawOptions) {
		const options = parseOptions(rawOptions)
		if (options.betting) return startBetting(players, options, {}, {})
		return dealRound(players, { options, coins: {}, bets: {}, buyIns: {} })
	},

	getValidActions(state, playerId) {
		if (state.phase === 'gameover') return []

		if (state.phase === 'betting') {
			if (!state.players.includes(playerId)) return []
			if (state.bets[playerId] !== undefined) return []
			return [{ type: 'PLACE_BET', playerId }]
		}

		if (state.phase === 'scoring') {
			if (playerId !== state.players[0]) return []
			return [
				{ type: 'NEW_ROUND', playerId },
				{ type: 'END_GAME', playerId }
			]
		}

		if (state.turnPlayerId !== playerId) return []

		const idx = activeIndex(state, playerId)
		const activeStatus = idx === 0 ? state.playerStatus[playerId] : state.splitStatus[playerId]
		if (activeStatus !== 'playing') return []

		const hand = state.zones[activeZone(state, playerId)]?.cards ?? []
		const actions = [
			{ type: 'HIT', playerId },
			{ type: 'STAND', playerId }
		]

		if (hand.length === 2) {
			const balance = state.coins[playerId] ?? 0
			const baseBet = state.bets[playerId] ?? 0
			const curBet = idx === 0 ? baseBet : (state.splitBets[playerId] ?? 0)

			// Doubling matches the current hand's stake — only offer it if affordable
			if (!state.options.betting || balance >= curBet) {
				actions.push({ type: 'DOUBLE', playerId })
			}
			// Splitting an equal-value pair (primary hand only, once per round)
			if (idx === 0 && !hasSplit(state, playerId) && isSplittablePair(hand[0], hand[1])) {
				if (!state.options.betting || balance >= baseBet) {
					actions.push({ type: 'SPLIT', playerId })
				}
			}
		}
		return actions
	},

	applyAction(state, action) {
		const pid = action.playerId

		if (action.type === 'PLACE_BET') {
			if (state.phase !== 'betting') return state
			if (!state.players.includes(pid) || state.bets[pid] !== undefined) return state
			const amount = Math.floor(Number((action.payload as { amount?: unknown })?.amount))
			const balance = state.coins[pid] ?? 0
			if (!Number.isFinite(amount) || amount < 1 || amount > balance) return state

			const bets = { ...state.bets, [pid]: amount }
			const coins = { ...state.coins, [pid]: balance - amount }

			if (state.players.every((p) => bets[p] !== undefined)) {
				return dealRound(state.players, {
					options: state.options,
					coins,
					bets,
					buyIns: state.buyIns
				})
			}
			return { ...state, bets, coins }
		}

		if (action.type === 'NEW_ROUND') {
			return newRound(state)
		}

		if (action.type === 'END_GAME') {
			return { ...state, phase: 'gameover' }
		}

		if (action.type === 'HIT') {
			if (state.turnPlayerId !== pid) return state
			const idx = activeIndex(state, pid)
			const zoneId = activeZone(state, pid)
			const result = drawCard(state.zones['deck'].cards)
			if (!result) return state

			const newHand = [...state.zones[zoneId].cards, result.card]
			const zones = {
				...state.zones,
				deck: { ...state.zones['deck'], cards: result.remaining },
				[zoneId]: { ...state.zones[zoneId], cards: newHand }
			}

			if (handValue(newHand) > 21) {
				const busted = setHandStatus(state, pid, idx, 'bust')
				return advanceTurn({ ...busted, zones }, pid)
			}
			return { ...state, zones }
		}

		if (action.type === 'STAND') {
			if (state.turnPlayerId !== pid) return state
			const idx = activeIndex(state, pid)
			return advanceTurn(setHandStatus(state, pid, idx, 'standing'), pid)
		}

		if (action.type === 'DOUBLE') {
			if (state.turnPlayerId !== pid) return state
			const idx = activeIndex(state, pid)
			const zoneId = activeZone(state, pid)
			const result = drawCard(state.zones['deck'].cards)
			if (!result) return state

			let coins = state.coins
			let bets = state.bets
			let splitBets = state.splitBets
			if (state.options.betting) {
				const curBet = idx === 0 ? (state.bets[pid] ?? 0) : (state.splitBets[pid] ?? 0)
				const balance = state.coins[pid] ?? 0
				if (balance < curBet) return state
				coins = { ...state.coins, [pid]: balance - curBet }
				if (idx === 0) bets = { ...state.bets, [pid]: curBet * 2 }
				else splitBets = { ...state.splitBets, [pid]: curBet * 2 }
			}

			const newHand = [...state.zones[zoneId].cards, result.card]
			const zones = {
				...state.zones,
				deck: { ...state.zones['deck'], cards: result.remaining },
				[zoneId]: { ...state.zones[zoneId], cards: newHand }
			}
			const status: PlayerStatus = handValue(newHand) > 21 ? 'bust' : 'standing'

			return advanceTurn(
				setHandStatus({ ...state, zones, coins, bets, splitBets }, pid, idx, status),
				pid
			)
		}

		if (action.type === 'SPLIT') {
			if (state.phase !== 'playing' || state.turnPlayerId !== pid) return state
			if (hasSplit(state, pid)) return state
			const hand = state.zones[`hand_${pid}`]?.cards ?? []
			if (hand.length !== 2 || !isSplittablePair(hand[0], hand[1])) return state

			// Matching second stake (betting only)
			let coins = state.coins
			const baseBet = state.bets[pid] ?? 0
			if (state.options.betting) {
				const balance = state.coins[pid] ?? 0
				if (balance < baseBet) return state
				coins = { ...state.coins, [pid]: balance - baseBet }
			}

			// Each hand keeps one of the pair and draws a fresh second card.
			let deckCards = state.zones['deck'].cards
			const d1 = drawCard(deckCards)
			if (!d1) return state
			const handA = [hand[0], d1.card]
			deckCards = d1.remaining
			const d2 = drawCard(deckCards)
			if (!d2) return state
			const handB = [hand[1], d2.card]
			deckCards = d2.remaining

			const splitZone = splitZoneId(pid)
			const zones = {
				...state.zones,
				deck: { ...state.zones['deck'], cards: deckCards },
				[`hand_${pid}`]: { ...state.zones[`hand_${pid}`], cards: handA },
				[splitZone]: createZone(splitZone, 'fan', handB, pid)
			}

			// Split aces get exactly one card each, then auto-stand.
			const isAces = hand[0].face === 'A'
			const status: PlayerStatus = isAces ? 'standing' : 'playing'

			const next: BlackjackState = {
				...state,
				zones,
				coins,
				playerStatus: { ...state.playerStatus, [pid]: status },
				splitStatus: { ...state.splitStatus, [pid]: status },
				splitBets: { ...state.splitBets, [pid]: baseBet },
				activeHand: { ...state.activeHand, [pid]: 0 }
			}

			if (isAces) return advanceTurn(next, pid)
			return next
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

		// A player's best non-bust hand value, or -1 if every hand busted.
		const bestValue = (p: string): number => {
			let best = -1
			if (state.playerStatus[p] !== 'bust') {
				best = Math.max(best, handValue(state.zones[`hand_${p}`]?.cards ?? []))
			}
			if (hasSplit(state, p) && state.splitStatus[p] !== 'bust') {
				best = Math.max(best, handValue(state.zones[splitZoneId(p)]?.cards ?? []))
			}
			return best
		}

		if (dealerBust) {
			const eligible = state.players.filter((p) => bestValue(p) >= 0)
			if (eligible.length === 0) return null
			return eligible.reduce((a, b) => (bestValue(b) > bestValue(a) ? b : a))
		}

		const winners = state.players.filter((p) => bestValue(p) > dealerValue)
		if (winners.length === 0) return null
		return winners.reduce((a, b) => (bestValue(b) > bestValue(a) ? b : a))
	},

	onPlayerDisconnect(state, playerId) {
		const wasTheirTurn = state.turnPlayerId === playerId && state.phase === 'playing'
		const players = state.players.filter((p) => p !== playerId)
		const playerStatus = omitKey(state.playerStatus, playerId)
		const zones = Object.fromEntries(
			Object.entries(state.zones).filter(
				([k]) => k !== `hand_${playerId}` && k !== splitZoneId(playerId)
			)
		)
		const coins = omitKey(state.coins, playerId)
		const bets = omitKey(state.bets, playerId)
		const buyIns = omitKey(state.buyIns, playerId)
		const splitStatus = omitKey(state.splitStatus, playerId)
		const splitBets = omitKey(state.splitBets, playerId)
		const activeHand = omitKey(state.activeHand, playerId) as Record<string, 0 | 1>

		const cleaned = {
			...state,
			players,
			zones,
			playerStatus,
			coins,
			bets,
			buyIns,
			splitStatus,
			splitBets,
			activeHand
		}

		if (players.length === 0) {
			return { ...cleaned, phase: 'gameover' }
		}

		// In the betting phase, deal once every remaining player has bet
		if (state.phase === 'betting') {
			if (players.every((p) => bets[p] !== undefined)) {
				return dealRound(players, { options: state.options, coins, bets, buyIns })
			}
			return { ...cleaned, turnPlayerId: players[0] }
		}

		if (!wasTheirTurn) return cleaned

		const originalIdx = state.players.indexOf(playerId)
		for (let i = originalIdx + 1; i < state.players.length; i++) {
			if (cleaned.playerStatus[state.players[i]] === 'playing') {
				return { ...cleaned, turnPlayerId: state.players[i] }
			}
		}
		return resolveDealerTurn(cleaned)
	}
}

/** Set the status of a player's active sub-hand (0 = primary, 1 = split). */
function setHandStatus(
	state: BlackjackState,
	pid: string,
	idx: 0 | 1,
	status: PlayerStatus
): BlackjackState {
	if (idx === 0) return { ...state, playerStatus: { ...state.playerStatus, [pid]: status } }
	return { ...state, splitStatus: { ...state.splitStatus, [pid]: status } }
}

function omitKey<T>(obj: Record<string, T>, key: string): Record<string, T> {
	return Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key)) as Record<string, T>
}
