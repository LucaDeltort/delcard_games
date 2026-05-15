import { browser } from '$app/environment'

const STORAGE_KEY = 'gameOptions'

function loadAll(): Record<string, Record<string, unknown>> {
	if (!browser) return {}
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (raw) return JSON.parse(raw)
	} catch {
		// ignore parse errors
	}
	return {}
}

export function loadGameOptions(gameId: string): Record<string, unknown> {
	return loadAll()[gameId] ?? {}
}

export function saveGameOptions(gameId: string, options: Record<string, unknown>): void {
	if (!browser) return
	const all = loadAll()
	all[gameId] = options
	localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}
