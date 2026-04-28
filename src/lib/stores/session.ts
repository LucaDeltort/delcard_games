import { writable } from 'svelte/store'
import type { GameClient } from '$lib/network/client'
import type { GameHost } from '$lib/network/host'

export const activeHost = writable<GameHost | null>(null)
export const activeClient = writable<GameClient | null>(null)
