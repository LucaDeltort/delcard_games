import { writable } from 'svelte/store'
import { browser } from '$app/environment'

export type TimeFormat = '12' | '24'

export type Settings = {
	timeFormat: TimeFormat
}

const STORAGE_KEY = 'settings'

function load(): Settings {
	if (!browser) return { timeFormat: '24' }
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (raw) return { timeFormat: '24', ...JSON.parse(raw) }
	} catch {
		// ignore parse errors
	}
	return { timeFormat: '24' }
}

function createSettingsStore() {
	const { subscribe, update, set } = writable<Settings>(load())

	return {
		subscribe,
		set(s: Settings) {
			if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
			set(s)
		},
		update(fn: (s: Settings) => Settings) {
			update((s) => {
				const next = fn(s)
				if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
				return next
			})
		}
	}
}

export const settings = createSettingsStore()

export const settingsOpen = writable(false)
