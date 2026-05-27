import { writable } from 'svelte/store'
import { browser } from '$app/environment'
import { getDiceBySlug } from '$lib/dice/registry'
import type { DicePack } from '$lib/dice/types'

const STORAGE_KEY = 'dicePacks'

type State = Record<string, string> // slug → packId

function load(): State {
	if (!browser) return {}
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		return raw ? JSON.parse(raw) : {}
	} catch {
		return {}
	}
}

function createStore() {
	const { subscribe, update } = writable<State>(load())

	return {
		subscribe,
		select(slug: string, pack: DicePack) {
			update((state) => {
				const next = { ...state, [slug]: pack.id }
				if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
				return next
			})
		}
	}
}

export const dicePacks = createStore()

export function resolvePackFor(state: State, slug: string): DicePack {
	const entry = getDiceBySlug(slug)
	if (!entry) return { id: '', name: '', basePath: '' }
	const packId = state[slug]
	return (
		entry.packs.find((p) => p.id === packId) ??
		entry.packs.find((p) => p.id === entry.defaultPackId) ??
		entry.packs[0]
	)
}
