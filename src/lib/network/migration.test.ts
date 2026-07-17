import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameStateGeneric } from '$lib/core/types'
import type { Action, GameDefinition } from '$lib/engine'

// ── Minimal game def for testing ────────────────────────────

function makeTestGame(): GameDefinition<GameStateGeneric> {
	return {
		id: 'testgame',
		name: 'Test',
		deckType: 'FrenchDeckWithoutJoker',
		minPlayers: 2,
		maxPlayers: 4,
		setup(players: string[]): GameStateGeneric {
			return {
				players,
				zones: {},
				turnPlayerId: players[0],
				phase: 'playing',
				activeGameId: 'testgame'
			}
		},
		getValidActions(state: GameStateGeneric, playerId: string): Action[] {
			if (state.turnPlayerId === playerId && state.phase === 'playing') {
				return [{ type: 'pass', playerId }]
			}
			return []
		},
		applyAction(state: GameStateGeneric, action: Action): GameStateGeneric {
			if (action.type === 'pass') {
				const idx = state.players.indexOf(action.playerId)
				const nextTurn = state.players[(idx + 1) % state.players.length]
				return { ...state, turnPlayerId: nextTurn }
			}
			return state
		},
		isOver(state: GameStateGeneric): boolean {
			return state.phase === 'gameover'
		},
		getWinner(_: GameStateGeneric): string | null {
			return null
		},
		onPlayerDisconnect(state: GameStateGeneric, playerId: string): GameStateGeneric {
			const remaining = state.players.filter((p) => p !== playerId)
			let nextTurn = state.turnPlayerId
			if (nextTurn === playerId) {
				nextTurn = remaining[0] ?? playerId
			}
			return { ...state, players: remaining, turnPlayerId: nextTurn }
		}
	}
}

// ── Types for accessing private fields in tests ──────────────
// We cast instances to these interfaces to access internal state without triggering linter errors.

type FakeConn = { send(data: unknown): void; close(): void }

type HostInternals = {
	migrateAway(migrationIndex: number): void
	close(message?: string): void
	peer: { destroyed: boolean; destroy(): void } | null
	clients: Map<string, { conn: FakeConn; name: string; playerId: string }>
	pendingDisconnects: Map<string, ReturnType<typeof setTimeout>>
	_pendingMigrationReconnects: Map<string, ReturnType<typeof setTimeout>>
	onLobbyChange?: () => void
}

type ClientInternals = {
	attemptMigration(migrationIndex: number): Promise<void>
	onMigration?: (result: { role: string }) => void
	onDisconnected?: (msg: string) => void
	saveMigrationIndex(index: number): void
	removeVisibilityListeners(): void
	_lastState: GameStateGeneric | null
	_def: GameDefinition<GameStateGeneric> | null
	_playerId: string | null
	_code: string
	_playerName: string
	_migrationIndex: number
	peer: unknown
}

type CapturedMessage =
	| { type: 'MIGRATE_HOST'; migrationIndex: number }
	| { type: 'HOST_GONE'; message: string }
	| { type: 'STATE'; state: GameStateGeneric; seq: number }
	| { type: 'WELCOME'; playerId: string; gameId: string; hostPlayerId: string }
	| { type: 'LOBBY' }

const capturedMessages: CapturedMessage[] = []

function createFakePeer(id: string) {
	return {
		id,
		destroyed: false,
		disconnected: false,
		connect(_target: string) {
			return {
				peer: _target,
				open: true,
				send(data: unknown) {
					capturedMessages.push(data as CapturedMessage)
				},
				close() {
					this.open = false
				},
				on() {
					// no-op
				},
				off() {
					// no-op
				}
			} as FakeConn & { peer: string; open: boolean }
		},
		reconnect() {
			this.disconnected = false
		},
		destroy() {
			this.destroyed = true
		},
		on() {
			// no-op
		},
		off() {
			// no-op
		},
		once() {
			// no-op
		}
	}
}

describe('host migration — GameHost.resume()', () => {
	it('removes dead host via onPlayerDisconnect and keeps remaining players', async () => {
		const { GameHost, PEER_PREFIX } = await import('./host')
		const def = makeTestGame()

		const originalState: GameStateGeneric = {
			players: ['dead-host', 'survivor-1', 'survivor-2'],
			zones: {},
			turnPlayerId: 'survivor-1',
			phase: 'playing',
			activeGameId: 'testgame'
		}

		const peer = createFakePeer(`${PEER_PREFIX}CODE-m1`)

		const migratedHost = (
			GameHost as unknown as {
				resume: (...args: unknown[]) => {
					code: string
					migrationIndex: number
					playerId: string
					lastState: GameStateGeneric
				}
			}
		).resume('CODE', 1, originalState, 'survivor-1', 'dead-host', def, 'Survivor One', peer)

		expect(migratedHost.code).toBe('CODE-m1')
		expect(migratedHost.migrationIndex).toBe(1)
		expect(migratedHost.playerId).toBe('survivor-1')
		expect(migratedHost.lastState.players).toEqual(['survivor-1', 'survivor-2'])
		expect(migratedHost.lastState.turnPlayerId).toBe('survivor-1')
	})

	it('advances turn when dead host was the active player', async () => {
		const { GameHost, PEER_PREFIX } = await import('./host')
		const def = makeTestGame()

		const originalState: GameStateGeneric = {
			players: ['dead-host', 'survivor-1', 'survivor-2'],
			zones: {},
			turnPlayerId: 'dead-host',
			phase: 'playing',
			activeGameId: 'testgame'
		}

		const peer = createFakePeer(`${PEER_PREFIX}CODE-m1`)

		const migratedHost = (
			GameHost as unknown as {
				resume: (...args: unknown[]) => {
					lastState: GameStateGeneric
				}
			}
		).resume('CODE', 1, originalState, 'survivor-1', 'dead-host', def, 'Survivor One', peer)

		expect(migratedHost.lastState.turnPlayerId).not.toBe('dead-host')
		expect(['survivor-1', 'survivor-2']).toContain(migratedHost.lastState.turnPlayerId)
	})
})

describe('host migration — migrateAway()', () => {
	beforeEach(() => {
		capturedMessages.length = 0
	})

	it('broadcasts MIGRATE_HOST with correct index before destroying peer', async () => {
		vi.useFakeTimers()
		const { GameHost } = await import('./host')

		const host = Object.create(GameHost.prototype) as unknown as HostInternals & {
			def: GameDefinition<GameStateGeneric>
			_options: Record<string, unknown>
			hostName: string
			_hostPlayerId: string
			_isMigrated: boolean
			state: GameStateGeneric | null
			_stateSeq: number
			pendingPlayerIds: Set<string>
			_autoTimer: ReturnType<typeof setTimeout> | null
			onLobbyChange: () => void
		}
		host.def = makeTestGame()
		host._options = {}
		host.hostName = 'Host Player'
		host._hostPlayerId = 'host-pid'
		host._isMigrated = false
		host.clients = new Map()
		host.state = null
		host._stateSeq = 0
		host.pendingDisconnects = new Map()
		host.pendingPlayerIds = new Set()
		host._pendingMigrationReconnects = new Map()
		host._autoTimer = null
		host.peer = {
			destroyed: false,
			destroy() {
				this.destroyed = true
			}
		}

		host.clients.set('client-peer-id', {
			conn: {
				send(data: unknown) {
					capturedMessages.push(data as CapturedMessage)
				},
				close() {
					// no-op
				}
			},
			name: 'Client One',
			playerId: 'client-player-id'
		})

		host.onLobbyChange = () => {
			// no-op
		}

		host.migrateAway(1)

		expect(capturedMessages).toHaveLength(1)
		expect(capturedMessages[0].type).toBe('MIGRATE_HOST')
		expect((capturedMessages[0] as { migrationIndex: number }).migrationIndex).toBe(1)

		vi.advanceTimersByTime(200)
		expect(host.peer?.destroyed).toBe(true)

		vi.useRealTimers()
	})

	it('close() sends HOST_GONE only if peer is NOT already destroyed', async () => {
		const { GameHost } = await import('./host')

		// Case 1: peer alive → close() should send HOST_GONE
		capturedMessages.length = 0
		const host1 = Object.create(GameHost.prototype) as unknown as HostInternals
		host1.peer = {
			destroyed: false,
			destroy() {
				this.destroyed = true
			}
		}
		host1.clients = new Map([
			[
				'c1',
				{
					conn: {
						send(d: unknown) {
							capturedMessages.push(d as CapturedMessage)
						},
						close() {
							// no-op
						}
					},
					name: '',
					playerId: ''
				}
			]
		])
		host1.pendingDisconnects = new Map()
		host1._pendingMigrationReconnects = new Map()
		host1.close()
		expect(capturedMessages.some((m) => m.type === 'HOST_GONE')).toBe(true)

		// Case 2: peer already destroyed → no HOST_GONE
		capturedMessages.length = 0
		const host2 = Object.create(GameHost.prototype) as unknown as HostInternals
		host2.peer = {
			destroyed: true,
			destroy() {
				// no-op
			}
		}
		host2.clients = new Map([
			[
				'c1',
				{
					conn: {
						send(d: unknown) {
							capturedMessages.push(d as CapturedMessage)
						},
						close() {
							// no-op
						}
					},
					name: '',
					playerId: ''
				}
			]
		])
		host2.pendingDisconnects = new Map()
		host2._pendingMigrationReconnects = new Map()
		host2.close()
		expect(capturedMessages.some((m) => m.type === 'HOST_GONE')).toBe(false)
	})
})

describe('host migration — client spectator handling', () => {
	it('spectators skip election and reconnect as clients directly', async () => {
		const { GameClient } = await import('./client')
		const def = makeTestGame()

		const state: GameStateGeneric = {
			players: ['p1', 'p2'],
			zones: {},
			turnPlayerId: 'p1',
			phase: 'playing',
			activeGameId: 'testgame'
		}

		const client = Object.create(GameClient.prototype) as unknown as ClientInternals
		client._lastState = state
		client._def = def
		client._playerId = 'spectator-id'
		client._code = 'CODE'
		client._playerName = 'Watcher'
		client._migrationIndex = 0
		client.peer = null

		let migrationResult: { role: string } | null = null
		client.onMigration = (result: { role: string }) => {
			migrationResult = result
		}
		client.saveMigrationIndex = () => {
			// no-op
		}
		client.removeVisibilityListeners = () => {
			// no-op
		}

		await client.attemptMigration(1)

		expect(migrationResult).not.toBeNull()
		expect((migrationResult as { role: string } | null)?.role).toBe('client')
	})

	it('disconnects if no game state available for migration', async () => {
		const { GameClient } = await import('./client')

		const client = Object.create(GameClient.prototype) as unknown as ClientInternals
		client._lastState = null
		client._def = makeTestGame()
		client._playerId = 'p1'

		let disconnectMsg: string | null = null
		client.onDisconnected = (msg: string) => {
			disconnectMsg = msg
		}

		await client.attemptMigration(1)

		expect(disconnectMsg).not.toBeNull()
	})
})
