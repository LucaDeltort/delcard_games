import type { GameStateGeneric } from '$lib/core/types'
import type { GameDefinition } from '$lib/engine'
import { nextPlayer } from '$lib/engine'

export type CategoryId =
	| 'ones'
	| 'twos'
	| 'threes'
	| 'fours'
	| 'fives'
	| 'sixes'
	| 'threeOfAKind'
	| 'fourOfAKind'
	| 'fullHouse'
	| 'smallStraight'
	| 'largeStraight'
	| 'yams'
	| 'chance'

export type YamsScores = Record<CategoryId, number | null>

export type YamsState = GameStateGeneric & {
	phase: 'rolling' | 'gameover'
	dice: number[]
	held: boolean[]
	rollsRemaining: number
	scores: Record<string, YamsScores>
}

const CATEGORIES: CategoryId[] = [
	'ones',
	'twos',
	'threes',
	'fours',
	'fives',
	'sixes',
	'threeOfAKind',
	'fourOfAKind',
	'fullHouse',
	'smallStraight',
	'largeStraight',
	'yams',
	'chance'
]

const UPPER: CategoryId[] = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes']

function emptyScores(): YamsScores {
	return Object.fromEntries(CATEGORIES.map((c) => [c, null])) as YamsScores
}

function diceCounts(dice: number[]): Record<number, number> {
	const counts: Record<number, number> = {}
	for (const d of dice) counts[d] = (counts[d] ?? 0) + 1
	return counts
}

export function scoreUpper(face: number, dice: number[]): number {
	return dice.filter((d) => d === face).reduce((a, b) => a + b, 0)
}

export function scoreThreeOfAKind(dice: number[]): number {
	const counts = diceCounts(dice)
	return Math.max(...Object.values(counts)) >= 3 ? dice.reduce((a, b) => a + b, 0) : 0
}

export function scoreFourOfAKind(dice: number[]): number {
	const counts = diceCounts(dice)
	return Math.max(...Object.values(counts)) >= 4 ? dice.reduce((a, b) => a + b, 0) : 0
}

export function scoreFullHouse(dice: number[]): number {
	const counts = Object.values(diceCounts(dice)).sort()
	return counts.length === 2 && counts[0] === 2 && counts[1] === 3 ? 25 : 0
}

export function scoreSmallStraight(dice: number[]): number {
	const unique = new Set(dice)
	const straights = [
		[1, 2, 3, 4],
		[2, 3, 4, 5],
		[3, 4, 5, 6]
	]
	return straights.some((s) => s.every((v) => unique.has(v))) ? 30 : 0
}

export function scoreLargeStraight(dice: number[]): number {
	const unique = new Set(dice)
	const straights = [
		[1, 2, 3, 4, 5],
		[2, 3, 4, 5, 6]
	]
	return straights.some((s) => s.every((v) => unique.has(v))) ? 40 : 0
}

export function scoreYams(dice: number[]): number {
	const counts = diceCounts(dice)
	return Math.max(...Object.values(counts)) === 5 ? 50 : 0
}

export function scoreChance(dice: number[]): number {
	return dice.reduce((a, b) => a + b, 0)
}

export function scoreCategory(cat: CategoryId, dice: number[]): number {
	switch (cat) {
		case 'ones':
			return scoreUpper(1, dice)
		case 'twos':
			return scoreUpper(2, dice)
		case 'threes':
			return scoreUpper(3, dice)
		case 'fours':
			return scoreUpper(4, dice)
		case 'fives':
			return scoreUpper(5, dice)
		case 'sixes':
			return scoreUpper(6, dice)
		case 'threeOfAKind':
			return scoreThreeOfAKind(dice)
		case 'fourOfAKind':
			return scoreFourOfAKind(dice)
		case 'fullHouse':
			return scoreFullHouse(dice)
		case 'smallStraight':
			return scoreSmallStraight(dice)
		case 'largeStraight':
			return scoreLargeStraight(dice)
		case 'yams':
			return scoreYams(dice)
		case 'chance':
			return scoreChance(dice)
	}
}

export function upperBonus(scores: YamsScores): number {
	const total = UPPER.reduce((sum, cat) => sum + (scores[cat] ?? 0), 0)
	return total >= 63 ? 35 : 0
}

export function grandTotal(scores: YamsScores): number {
	const sum = CATEGORIES.reduce((acc, cat) => acc + (scores[cat] ?? 0), 0)
	return sum + upperBonus(scores)
}

export const yams: GameDefinition<YamsState> = {
	id: 'yams',
	name: 'Yams',
	diceSlug: 'd6',
	minPlayers: 2,
	maxPlayers: 6,
	isNew: true,

	setup(players) {
		return {
			players,
			zones: {},
			turnPlayerId: players[0],
			phase: 'rolling',
			activeGameId: 'yams',
			dice: [1, 1, 1, 1, 1],
			held: [false, false, false, false, false],
			rollsRemaining: 3,
			scores: Object.fromEntries(players.map((p) => [p, emptyScores()]))
		}
	},

	getValidActions(state, playerId) {
		if (state.phase === 'gameover') return []
		if (state.turnPlayerId !== playerId) return []

		const hasRolled = state.rollsRemaining < 3
		const actions = []

		if (state.rollsRemaining > 0) {
			actions.push({ type: 'ROLL', playerId })
		}

		if (hasRolled && state.rollsRemaining > 0) {
			for (let i = 0; i < 5; i++) {
				actions.push({ type: 'TOGGLE_HOLD', playerId, payload: { index: i } })
			}
		}

		if (hasRolled) {
			const playerScores = state.scores[playerId]
			for (const cat of CATEGORIES) {
				if (playerScores[cat] === null) {
					actions.push({ type: 'SCORE', playerId, payload: { category: cat } })
				}
			}
		}

		return actions
	},

	applyAction(state, action) {
		if (state.phase === 'gameover') return state
		if (action.playerId !== state.turnPlayerId) return state

		if (action.type === 'ROLL') {
			if (state.rollsRemaining === 0) return state
			const dice = state.dice.map((v, i) => (state.held[i] ? v : Math.floor(Math.random() * 6) + 1))
			return { ...state, dice, rollsRemaining: state.rollsRemaining - 1 }
		}

		if (action.type === 'TOGGLE_HOLD') {
			if (state.rollsRemaining === 3 || state.rollsRemaining === 0) return state
			const { index } = action.payload as { index: number }
			if (index < 0 || index > 4) return state
			const held = state.held.map((v, i) => (i === index ? !v : v))
			return { ...state, held }
		}

		if (action.type === 'SCORE') {
			if (state.rollsRemaining === 3) return state
			const { category } = action.payload as { category: CategoryId }
			const playerScores = state.scores[action.playerId]
			if (playerScores[category] !== null) return state

			const value = scoreCategory(category, state.dice)
			const newScores = {
				...state.scores,
				[action.playerId]: { ...playerScores, [category]: value }
			}

			const allFilled = state.players.every((p) =>
				CATEGORIES.every((c) => newScores[p][c] !== null)
			)

			return {
				...state,
				scores: newScores,
				dice: [1, 1, 1, 1, 1],
				held: [false, false, false, false, false],
				rollsRemaining: 3,
				turnPlayerId: nextPlayer(state.players, action.playerId),
				phase: allFilled ? 'gameover' : 'rolling'
			}
		}

		return state
	},

	isOver(state) {
		return state.phase === 'gameover'
	},

	getWinner(state) {
		if (state.phase !== 'gameover') return null
		return state.players.reduce((best, p) =>
			grandTotal(state.scores[p]) > grandTotal(state.scores[best]) ? p : best
		)
	},

	onPlayerDisconnect(state, playerId) {
		const remaining = state.players.filter((p) => p !== playerId)
		const newScores = Object.fromEntries(
			Object.entries(state.scores).filter(([p]) => p !== playerId)
		)
		if (remaining.length < 2) {
			return { ...state, players: remaining, scores: newScores, phase: 'gameover' }
		}
		const newTurn =
			state.turnPlayerId === playerId ? nextPlayer(state.players, playerId) : state.turnPlayerId
		const advancedTurn = state.turnPlayerId === playerId
		return {
			...state,
			players: remaining,
			scores: newScores,
			turnPlayerId: newTurn,
			...(advancedTurn
				? { dice: [1, 1, 1, 1, 1], held: [false, false, false, false, false], rollsRemaining: 3 }
				: {})
		}
	}
}
