import { writable } from 'svelte/store'
import { browser } from '$app/environment'
import { defaultFrenchDeckPack, frenchDeckPacks } from '$lib/decks/FrenchDeck/packs'
import type { CardPack } from '$lib/decks/types'

const STORAGE_KEY = 'deckPackId'

function createDeckPackStore() {
	const savedId = browser ? localStorage.getItem(STORAGE_KEY) : null
	const initial = frenchDeckPacks.find((p) => p.id === savedId) ?? defaultFrenchDeckPack

	const { subscribe, set } = writable<CardPack>(initial)

	return {
		subscribe,
		select(pack: CardPack) {
			if (browser) localStorage.setItem(STORAGE_KEY, pack.id)
			set(pack)
		}
	}
}

export const deckPack = createDeckPackStore()
