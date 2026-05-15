import type { GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'

export type LobbyPlayer = { id: string; name: string }

export type ClientMessage =
	| { type: 'JOIN'; playerName: string }
	| { type: 'ACTION'; action: Action }
	| { type: 'RESYNC' }
	| { type: 'PING'; t: number }
	| { type: 'PONG'; t: number }

export type HostMessage =
	| { type: 'WELCOME'; playerId: string; gameId: string }
	| { type: 'LOBBY'; players: LobbyPlayer[]; options: Record<string, unknown> }
	| { type: 'STATE'; state: GameStateGeneric; seq: number }
	| { type: 'HOST_GONE'; message: string }
	| { type: 'REJECTED'; message: string }
	| { type: 'PING'; t: number }
	| { type: 'PONG'; t: number }
