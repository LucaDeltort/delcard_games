// Local player statistics stored in localStorage.
// Tracks games played, wins, and losses per game type per player name.

import { writable } from 'svelte/store'
import { browser } from '$app/environment'

export interface GameStats {
	played: number
	wins: number
	losses: number
}

export type StatsMap = Record<string, Record<string, GameStats>> // playerName -> gameId -> stats

const STORAGE_KEY = 'delcard-stats'

function load(): StatsMap {
	if (!browser) return {}
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		return raw ? JSON.parse(raw) : {}
	} catch {
		return {}
	}
}

function save(data: StatsMap) {
	if (!browser) return
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
	} catch {
		// storage full or unavailable — silently ignore
	}
}

export const statsStore = writable<StatsMap>(load())

statsStore.subscribe((data) => save(data))

/**
 * Record a finished game.
 */
export function recordGame(playerName: string, gameId: string, won: boolean) {
	statsStore.update((data) => {
		const player = (data[playerName] ??= {})
		const stats = (player[gameId] ??= { played: 0, wins: 0, losses: 0 })
		stats.played++
		if (won) stats.wins++
		else stats.losses++
		return data
	})
}

/**
 * Get all stats for a given player name.
 */
export function getPlayerStats(playerName: string): Record<string, GameStats> {
	return load()[playerName] ?? {}
}
