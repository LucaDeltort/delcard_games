import { writable } from 'svelte/store'

export interface ChatMessage {
	playerId: string
	playerName: string
	text: string
	timestamp: number
}

export const chatMessages = writable<ChatMessage[]>([])

export function pushChatMessage(playerId: string, playerName: string, text: string) {
	chatMessages.update((msgs) =>
		[...msgs, { playerId, playerName, text, timestamp: Date.now() }].slice(-50)
	) // keep last 50
}

export function clearChat() {
	chatMessages.set([])
}
