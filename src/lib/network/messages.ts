import type { GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'

export type LobbyPlayer = { id: string; name: string }

export type ClientMessage =
	| { type: 'JOIN'; playerName: string }
	| { type: 'ACTION'; action: Action }
	| { type: 'RESYNC' }

export type HostMessage =
	| { type: 'WELCOME'; playerId: string }
	| { type: 'LOBBY'; players: LobbyPlayer[] }
	| { type: 'STATE'; state: GameStateGeneric; seq: number }
	| { type: 'HOST_GONE'; message: string }
	| { type: 'REJECTED'; message: string }
