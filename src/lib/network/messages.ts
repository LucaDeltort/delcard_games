import type { GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'

export type LobbyPlayer = { id: string; name: string; pending?: boolean }

export type ClientMessage =
	| { type: 'JOIN'; playerName: string; resumePlayerId?: string }
	| { type: 'ACTION'; action: Action }
	| { type: 'RESYNC' }
	| { type: 'PING'; t: number }
	| { type: 'PONG'; t: number }
	| { type: 'CHAT_SEND'; text: string }

export type HostMessage =
	| { type: 'WELCOME'; playerId: string; gameId: string; hostPlayerId: string }
	| { type: 'LOBBY'; players: LobbyPlayer[]; options: Record<string, unknown> }
	| { type: 'STATE'; state: GameStateGeneric; seq: number }
	| { type: 'HOST_GONE'; message: string }
	| { type: 'MIGRATE_HOST'; migrationIndex: number }
	| { type: 'REJECTED'; message: string }
	| { type: 'PING'; t: number }
	| { type: 'PONG'; t: number }
	| { type: 'CHAT_RECEIVE'; playerId: string; playerName: string; text: string }
