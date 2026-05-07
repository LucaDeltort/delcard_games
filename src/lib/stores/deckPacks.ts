import { writable } from 'svelte/store'
import { browser } from '$app/environment'
import { getDeckBySlug } from '$lib/decks/registry'
import type { CardPack } from '$lib/decks/types'

const STORAGE_KEY = 'deckPacks'

type State = Record<string, string> // slug → packId

function load(): State {
	if (!browser) return {}
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		const state: State = raw ? JSON.parse(raw) : {}
		// Migrate from old single-pack store
		if (!state['french-deck']) {
			const legacy = localStorage.getItem('deckPackId')
			if (legacy) state['french-deck'] = legacy
		}
		return state
	} catch {
		return {}
	}
}

function createStore() {
	const { subscribe, update } = writable<State>(load())

	return {
		subscribe,
		select(slug: string, pack: CardPack) {
			update((state) => {
				const next = { ...state, [slug]: pack.id }
				if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
				return next
			})
		}
	}
}

export const deckPacks = createStore()

export function resolvePackFor(state: State, slug: string): CardPack {
	const entry = getDeckBySlug(slug)
	if (!entry) return { id: '', name: '', author: '', basePath: '' }
	const packId = state[slug]
	return (
		entry.packs.find((p) => p.id === packId) ??
		entry.packs.find((p) => p.id === entry.defaultPackId) ??
		entry.packs[0]
	)
}
