// Rich per-device statistics stored in localStorage.
// No player names — stats are global across all sessions on this device.

import { writable } from 'svelte/store'
import { browser } from '$app/environment'

export interface GameStatsEntry {
	played: number
	wins: number
	losses: number
	/** Game-specific cumulative stats. Values are arrays so we can do avg/max/min. */
	extra: Record<string, number[]>
}

export type StatsMap = Record<string, GameStatsEntry> // gameId -> entry

const STORAGE_KEY = 'delcard-stats-v2'

function load(): StatsMap {
	if (!browser) return {}
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return {}
		const parsed = JSON.parse(raw)
		// Migration from v1 format (playerName -> gameId -> entry)
		// If the old format is detected, flatten it by merging all players.
		const firstValue = Object.values(parsed)[0]
		if (firstValue && typeof firstValue === 'object' && 'played' in firstValue) {
			return parsed as StatsMap
		}
		// Old nested format: merge all players into one
		const flat: StatsMap = {}
		for (const playerData of Object.values(parsed)) {
			for (const [gameId, entry] of Object.entries(playerData as Record<string, GameStatsEntry>)) {
				if (!flat[gameId]) flat[gameId] = { played: 0, wins: 0, losses: 0, extra: {} }
				flat[gameId].played += entry.played ?? 0
				flat[gameId].wins += entry.wins ?? 0
				flat[gameId].losses += entry.losses ?? 0
				for (const [key, values] of Object.entries(entry.extra ?? {})) {
					if (!flat[gameId].extra[key]) flat[gameId].extra[key] = []
					flat[gameId].extra[key].push(...values)
				}
			}
		}
		return flat
	} catch {
		return {}
	}
}

function save(data: StatsMap) {
	if (!browser) return
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
	} catch {
		// storage full or unavailable
	}
}

export const statsStore = writable<StatsMap>(load())

statsStore.subscribe((data) => save(data))

/**
 * Record a finished game with rich extra stats.
 * No playerName — stats are global per device.
 */
export function recordGameResult(
	gameId: string,
	won: boolean | null,
	extra: Record<string, number> = {}
): void {
	statsStore.update((data) => {
		const entry = (data[gameId] ??= { played: 0, wins: 0, losses: 0, extra: {} })
		entry.played++
		if (won === true) entry.wins++
		else if (won === false) entry.losses++

		for (const [key, value] of Object.entries(extra)) {
			if (!entry.extra[key]) entry.extra[key] = []
			entry.extra[key].push(value)
			// Cap history at 100 entries per stat to avoid unbounded growth
			if (entry.extra[key].length > 100) entry.extra[key].shift()
		}

		return data
	})
}

/**
 * Aggregate an extra stat array according to the aggregation mode.
 */
export function aggregateStat(
	values: number[] | undefined,
	mode: 'sum' | 'avg' | 'max' | 'min' | 'last'
): number {
	if (!values || values.length === 0) return 0
	switch (mode) {
		case 'sum':
			return values.reduce((a, b) => a + b, 0)
		case 'avg':
			return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
		case 'max':
			return Math.max(...values)
		case 'min':
			return Math.min(...values)
		case 'last':
			return values[values.length - 1]
	}
}
