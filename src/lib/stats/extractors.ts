// Per-game stat extractors.
//
// Each extractor receives the final GameState at game-over time and the
// requesting player's ID. It returns a flat map of stat_key -> number that will
// be accumulated into localStorage by the stats store.
//
// The keys must match the i18n namespace `stats.<gameId>.<key>`.

import type { GameStateGeneric } from '$lib/core/types'

export type GameStats = Record<string, number>

type Extractor = (state: GameStateGeneric, playerId: string) => GameStats

// ── War ─────────────────────────────────────────────────────────────────────

const warExtractor: Extractor = (state, playerId) => {
	const wonCards = state.zones[`won_${playerId}`]?.cards.length ?? 0
	const deckCards = state.zones[`deck_${playerId}`]?.cards.length ?? 0
	return {
		cardsWon: wonCards,
		totalCards: wonCards + deckCards
	}
}

// ── Fight ────────────────────────────────────────────────────────────────────

interface FightHistoryEntry {
	type: string
	actorId?: string
	targetId?: string
	damage?: number
	timestamp: number
}

const fightExtractor: Extractor = (state, playerId) => {
	const history = (state as GameStateGeneric & { history?: FightHistoryEntry[] }).history ?? []
	let damageDealt = 0
	let damageTaken = 0
	let attacks = 0
	let charges = 0
	for (const entry of history) {
		if (entry.type === 'ATTACK') {
			if (entry.actorId === playerId) {
				damageDealt += entry.damage ?? 0
				attacks++
			}
			if (entry.targetId === playerId) {
				damageTaken += entry.damage ?? 0
			}
		} else if (entry.type === 'CHARGE' && entry.actorId === playerId) {
			charges++
		}
	}
	return {
		damageDealt,
		damageTaken,
		attacks,
		charges
	}
}

// ── Color ─────────────────────────────────────────────────────────────────────

const colorExtractor: Extractor = (state, _playerId) => {
	const handSize = state.zones[`hand_${_playerId}`]?.cards.length ?? 0
	return {
		cardsLeftInHand: handSize
	}
}

// ── Presidents ─────────────────────────────────────────────────────────────────

interface PresidentsState extends GameStateGeneric {
	finishOrder: string[]
	passedThisTrick: string[]
	scumPenalties: string[]
}

const presidentsExtractor: Extractor = (state, playerId) => {
	const ps = state as PresidentsState
	const finishOrder = ps.finishOrder ?? []
	const rank = finishOrder.indexOf(playerId)
	const wasPresident = finishOrder[0] === playerId ? 1 : 0
	const wasScum = finishOrder[finishOrder.length - 1] === playerId ? 1 : 0
	return {
		finalRank: rank >= 0 ? rank + 1 : 99,
		wasPresident,
		wasScum
	}
}

// ── Purple ──────────────────────────────────────────────────────────────────────

interface PurpleState extends GameStateGeneric {
	scores: Record<string, number>
}

const purpleExtractor: Extractor = (state, playerId) => {
	const ps = state as PurpleState
	return {
		finalScore: ps.scores?.[playerId] ?? 0
	}
}

// ── Werewolf ────────────────────────────────────────────────────────────────────

interface WerewolfState extends GameStateGeneric {
	roles: Record<string, string>
	winTeam: 'villagers' | 'werewolves' | 'lovers' | null
	alive: string[]
	lovers: [string, string] | null
}

const werewolfExtractor: Extractor = (state, playerId) => {
	const ws = state as WerewolfState
	const role = ws.roles?.[playerId] ?? 'unknown'
	const survived = ws.alive?.includes(playerId) ?? false
	return {
		wasWerewolf: role === 'werewolf' ? 1 : 0,
		wasVillager: role !== 'werewolf' && !ws.lovers?.includes(playerId) ? 1 : 0,
		wasLover: ws.lovers?.includes(playerId) ? 1 : 0,
		survived: survived ? 1 : 0
	}
}

// ── Yams ────────────────────────────────────────────────────────────────────────

interface YamsScores {
	[key: string]: number | null
}

interface YamsState extends GameStateGeneric {
	dice: number[]
	held: boolean[]
	rollsRemaining: number
	scores: Record<string, YamsScores>
}

function yamsGrandTotal(scores: YamsScores): number {
	return Object.values(scores).reduce<number>((sum, v) => sum + (v ?? 0), 0)
}

const yamsExtractor: Extractor = (state, playerId) => {
	const ys = state as YamsState
	const myScores = ys.scores?.[playerId] ?? {}
	const total = yamsGrandTotal(myScores)
	const upperScore = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'].reduce(
		(sum, cat) => sum + (myScores[cat] ?? 0),
		0
	)
	const yamsCount = (myScores['yams'] ?? 0) > 0 ? 1 : 0
	return {
		scoreTotal: total,
		upperSection: upperScore,
		lowerSection: total - upperScore,
		yamsRolled: yamsCount
	}
}

// ── Blackjack ──────────────────────────────────────────────────────────────────

interface BlackjackState extends GameStateGeneric {
	coins: Record<string, number>
	buyIns: Record<string, number>
	playerStatus: Record<string, string>
	options: { betting?: boolean; startingCoins?: number }
}

const blackjackExtractor: Extractor = (state, playerId) => {
	const bj = state as BlackjackState
	const startCoins = bj.options?.startingCoins ?? 500
	const currentCoins = bj.coins?.[playerId] ?? startCoins
	return {
		netGainLoss: currentCoins - startCoins,
		coinsFinal: currentCoins,
		rebuys: (bj.buyIns?.[playerId] ?? 1) - 1
	}
}

// ── Registry ────────────────────────────────────────────────────────────────────

const extractors: Record<string, Extractor> = {
	war: warExtractor,
	fight: fightExtractor,
	color: colorExtractor,
	presidents: presidentsExtractor,
	purple: purpleExtractor,
	werewolf: werewolfExtractor,
	yams: yamsExtractor,
	blackjack: blackjackExtractor
}

export function extractGameStats(
	gameId: string,
	state: GameStateGeneric,
	playerId: string
): GameStats {
	const fn = extractors[gameId]
	if (!fn) return {}
	try {
		return fn(state, playerId)
	} catch {
		return {}
	}
}

// ── Schema definitions for UI rendering ────────────────────────────────────────

export interface StatFieldDef {
	key: string
	/** i18n key suffix under stats.<gameId>.<suffix> */
	labelKey: string
	aggregation: 'sum' | 'avg' | 'max' | 'min' | 'last'
	format?: 'int' | 'percent'
}

export const statsSchema: Record<string, StatFieldDef[]> = {
	war: [
		{ key: 'cardsWon', labelKey: 'war.cardsWon', aggregation: 'sum' },
		{ key: 'totalCards', labelKey: 'war.totalCards', aggregation: 'sum' }
	],
	fight: [
		{ key: 'damageDealt', labelKey: 'fight.damageDealt', aggregation: 'sum' },
		{ key: 'damageTaken', labelKey: 'fight.damageTaken', aggregation: 'sum' },
		{ key: 'attacks', labelKey: 'fight.attacks', aggregation: 'sum' },
		{ key: 'charges', labelKey: 'fight.charges', aggregation: 'sum' }
	],
	color: [{ key: 'cardsLeftInHand', labelKey: 'color.cardsLeftInHand', aggregation: 'avg' }],
	presidents: [
		{ key: 'wasPresident', labelKey: 'presidents.wasPresident', aggregation: 'sum' },
		{ key: 'wasScum', labelKey: 'presidents.wasScum', aggregation: 'sum' },
		{ key: 'finalRank', labelKey: 'presidents.finalRank', aggregation: 'avg' }
	],
	purple: [{ key: 'finalScore', labelKey: 'purple.finalScore', aggregation: 'avg' }],
	werewolf: [
		{ key: 'wasWerewolf', labelKey: 'werewolf.wasWerewolf', aggregation: 'sum' },
		{ key: 'wasVillager', labelKey: 'werewolf.wasVillager', aggregation: 'sum' },
		{ key: 'wasLover', labelKey: 'werewolf.wasLover', aggregation: 'sum' },
		{ key: 'survived', labelKey: 'werewolf.survived', aggregation: 'sum' }
	],
	yams: [
		{ key: 'scoreTotal', labelKey: 'yams.scoreTotal', aggregation: 'avg' },
		{ key: 'upperSection', labelKey: 'yams.upperSection', aggregation: 'avg' },
		{ key: 'lowerSection', labelKey: 'yams.lowerSection', aggregation: 'avg' },
		{ key: 'yamsRolled', labelKey: 'yams.yamsRolled', aggregation: 'sum' }
	],
	blackjack: [
		{ key: 'netGainLoss', labelKey: 'blackjack.netGainLoss', aggregation: 'sum' },
		{ key: 'rebuys', labelKey: 'blackjack.rebuys', aggregation: 'sum' },
		{ key: 'coinsFinal', labelKey: 'blackjack.coinsFinal', aggregation: 'last' }
	]
}
