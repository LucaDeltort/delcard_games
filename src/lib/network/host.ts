import Peer, { type DataConnection } from 'peerjs'
import { get } from 'svelte/store'
import type { GameStateGeneric } from '$lib/core/types'
import type { Action, GameDefinition } from '$lib/engine'
import { defaultOptions } from '$lib/engine'
import { t } from '$lib/i18n'
import type { ClientMessage, HostMessage, LobbyPlayer } from './messages'
import { getTurnIceServers } from './turn'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const PEER_PREFIX = 'delcard-'
const RECONNECT_WINDOW_MS = 60_000

function generateCode(): string {
	return Array.from(
		{ length: 4 },
		() => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
	).join('')
}

type ClientEntry = { conn: DataConnection; name: string; playerId: string }

export class GameHost {
	private def: GameDefinition<GameStateGeneric>
	private peer!: Peer
	private clients = new Map<string, ClientEntry>()
	private pendingDisconnects = new Map<string, ReturnType<typeof setTimeout>>()
	private pendingPlayerIds = new Set<string>()
	private state: GameStateGeneric | null = null
	private _code: string
	private hostName: string
	private _stateSeq = 0
	private _options: Record<string, unknown> = {}
	private _autoTimer: ReturnType<typeof setTimeout> | null = null
	private _hostPlayerId: string | null = null
	private _isMigrated = false
	private _pendingMigrationReconnects = new Map<string, ReturnType<typeof setTimeout>>()

	onReady?: () => void
	onLobbyChange?: (players: LobbyPlayer[]) => void
	onState?: (state: GameStateGeneric) => void
	onError?: (message: string) => void
	onChat?: (playerId: string, playerName: string, text: string) => void

	constructor(def: GameDefinition<GameStateGeneric>, hostName: string) {
		this.def = def
		this.hostName = hostName
		this._code = generateCode()
		this._options = defaultOptions(def.optionsSchema ?? [])
		this.saveHostSession()
		this.initPeer()
	}

	// ── localStorage helpers for host reload ─────────────────

	private hostStorageKey(): string {
		return `delcard-host-${this._code}`
	}

	private saveHostSession() {
		if (typeof localStorage === 'undefined') return
		try {
			localStorage.setItem(this.hostStorageKey(), this.hostName)
		} catch {
			// ignore quota / privacy-mode errors
		}
	}

	static getStoredHostSession(code: string): { playerName: string } | null {
		if (typeof localStorage === 'undefined') return null
		try {
			const playerName = localStorage.getItem(`delcard-host-${code}`)
			if (playerName) return { playerName }
			return null
		} catch {
			return null
		}
	}

	static hasStoredHostSession(code: string): boolean {
		return GameHost.getStoredHostSession(code) !== null
	}

	static clearStoredHostSession(code: string) {
		if (typeof localStorage === 'undefined') return
		try {
			localStorage.removeItem(`delcard-host-${code}`)
		} catch {
			// ignore
		}
	}

	/**
	 * Create a migrated host that resumes an in-progress game.
	 * The old host is removed from state; remaining players can reconnect.
	 */
	static resume(
		originalCode: string,
		migrationIndex: number,
		resumeState: GameStateGeneric,
		hostPlayerId: string,
		deadHostPlayerId: string,
		def: GameDefinition<GameStateGeneric>,
		hostName: string,
		existingPeer?: Peer
	): GameHost {
		const instance = Object.create(GameHost.prototype) as GameHost
		instance.def = def
		instance.hostName = hostName
		instance._code = `${originalCode}-m${migrationIndex}`
		instance._options = defaultOptions(def.optionsSchema ?? [])
		instance._hostPlayerId = hostPlayerId
		instance._isMigrated = true
		instance.saveHostSession()
		instance.clients = new Map()
		instance.pendingDisconnects = new Map()
		instance.pendingPlayerIds = new Set()
		instance._pendingMigrationReconnects = new Map()
		instance._stateSeq = 0
		instance._autoTimer = null

		// Remove dead host from state
		let initialState: GameStateGeneric
		if (def.onPlayerDisconnect) {
			initialState = def.onPlayerDisconnect(resumeState, deadHostPlayerId)
		} else {
			const remaining = resumeState.players.filter((p) => p !== deadHostPlayerId)
			if (remaining.length < def.minPlayers) {
				initialState = { ...resumeState, phase: 'gameover', players: remaining }
			} else {
				let nextTurn = resumeState.turnPlayerId
				if (nextTurn === deadHostPlayerId) {
					const idx = resumeState.players.indexOf(deadHostPlayerId)
					nextTurn = resumeState.players[(idx + 1) % resumeState.players.length]
					if (nextTurn === deadHostPlayerId) nextTurn = remaining[0] ?? deadHostPlayerId
				}
				initialState = { ...resumeState, players: remaining, turnPlayerId: nextTurn }
			}
		}
		instance.state = initialState

		// Start reconnection timers for all players except the new host
		for (const playerId of initialState.players) {
			if (playerId === hostPlayerId) continue
			const timer = setTimeout(() => {
				instance._pendingMigrationReconnects.delete(playerId)
				instance.handlePlayerDisconnect(playerId)
			}, RECONNECT_WINDOW_MS)
			instance._pendingMigrationReconnects.set(playerId, timer)
		}

		if (existingPeer) {
			// Reuse the peer that won the election race — no ID gap
			instance.peer = existingPeer
			existingPeer.on('connection', (conn) => instance.handleConnection(conn))
			Promise.resolve().then(() => {
				instance.onReady?.()
				if (instance.state) instance.onState?.(instance.state)
			})
		} else {
			instance.initPeer()
		}
		return instance
	}

	get code(): string {
		return this._code
	}

	/** The host's own player ID — available after onReady fires. */
	get playerId(): string {
		return this._hostPlayerId ?? this.peer?.id ?? ''
	}

	/** Current migration generation (0 = original, 1 = first migration, etc.). */
	get migrationIndex(): number {
		const match = this._code.match(/-m(\d+)$/)
		return match ? parseInt(match[1], 10) : 0
	}

	/** Current game state (null if game not started). */
	get lastState(): GameStateGeneric | null {
		return this.state
	}

	get options(): Record<string, unknown> {
		return this._options
	}

	updateOption(key: string, value: unknown) {
		this._options = { ...this._options, [key]: value }
		if (this.def.onOptionsChange) {
			const patch = this.def.onOptionsChange(this._options, this.lobbyPlayers.length)
			if (Object.keys(patch).length > 0) this._options = { ...this._options, ...patch }
		}
		this.broadcastLobby()
	}

	get lobbyPlayers(): LobbyPlayer[] {
		const hostEntry: LobbyPlayer = { id: this.playerId, name: this.hostName }
		const clientEntries = Array.from(this.clients.entries()).map(([peerId, c]) => ({
			id: c.playerId,
			name: c.name,
			...(this.pendingPlayerIds.has(peerId) ? { pending: true } : {})
		}))
		return [hostEntry, ...clientEntries]
	}

	private async initPeer() {
		const iceServers = await getTurnIceServers()
		const config = iceServers.length ? { config: { iceServers } } : {}
		this.peer = new Peer(PEER_PREFIX + this._code, config)

		this.peer.on('open', () => {
			this.onReady?.()
			if (this._isMigrated && this.state) {
				// Emit initial state so page can render immediately
				this.onState?.(this.state)
			}
		})

		this.peer.on('error', (err) => {
			if ((err as { type?: string }).type === 'unavailable-id') {
				if (!this._isMigrated) {
					// Normal host: regenerate code
					this._code = generateCode()
					this.peer.destroy()
					this.initPeer()
				}
				// Migrated host: unavailable-id means we lost the race — caller handles this
			} else {
				this.onError?.(get(t)('network.connectionError'))
			}
		})

		this.peer.on('connection', (conn) => this.handleConnection(conn))
	}

	private handleConnection(conn: DataConnection) {
		conn.on('data', (raw) => {
			const msg = raw as ClientMessage

			if (msg.type === 'JOIN') {
				// Reconnecting player (by peer ID — normal reconnect within grace window)
				const pendingTimer = this.pendingDisconnects.get(conn.peer)
				if (pendingTimer !== undefined) {
					clearTimeout(pendingTimer)
					this.pendingDisconnects.delete(conn.peer)
					const entry: ClientEntry = { conn, name: msg.playerName, playerId: conn.peer }
					this.clients.set(conn.peer, entry)
					conn.send({
						type: 'WELCOME',
						playerId: conn.peer,
						gameId: this.def.id,
						hostPlayerId: this.playerId
					} as HostMessage)
					this.broadcastLobby()
					if (this.state) this.sendStateTo(conn, this.state)
					return
				}

				// Migrated host: reconnecting player identifies by their old player ID
				if (
					this._isMigrated &&
					msg.resumePlayerId &&
					this.state?.players.includes(msg.resumePlayerId)
				) {
					const migrationTimer = this._pendingMigrationReconnects.get(msg.resumePlayerId)
					if (migrationTimer !== undefined) {
						clearTimeout(migrationTimer)
						this._pendingMigrationReconnects.delete(msg.resumePlayerId)
					}
					// Deduplicate: if another live connection already claims this playerId, close it first
					for (const [existingPeer, existingEntry] of this.clients) {
						if (existingEntry.playerId === msg.resumePlayerId) {
							existingEntry.conn.close()
							this.clients.delete(existingPeer)
							break
						}
					}
					const entry: ClientEntry = {
						conn,
						name: msg.playerName,
						playerId: msg.resumePlayerId
					}
					this.clients.set(conn.peer, entry)
					conn.send({
						type: 'WELCOME',
						playerId: msg.resumePlayerId,
						gameId: this.def.id,
						hostPlayerId: this.playerId
					} as HostMessage)
					this.broadcastLobby()
					if (this.state) this.sendStateTo(conn, this.state)
					return
				}

				if (this.state !== null) {
					const capacity =
						this.state.phase === 'gameover'
							? this.clients.size + 1
							: this.state.players.length + this.pendingPlayerIds.size
					if (capacity >= this.def.maxPlayers) {
						conn.send({ type: 'REJECTED', message: get(t)('network.sessionFull') } as HostMessage)
						setTimeout(() => conn.close(), 300)
						return
					}
					const entry: ClientEntry = { conn, name: msg.playerName, playerId: conn.peer }
					this.clients.set(conn.peer, entry)
					this.pendingPlayerIds.add(conn.peer)
					conn.send({
						type: 'WELCOME',
						playerId: conn.peer,
						gameId: this.def.id,
						hostPlayerId: this.playerId
					} as HostMessage)
					this.broadcastLobby()
					this.sendStateTo(conn, this.state)
					return
				}

				if (this.clients.size + 1 >= this.def.maxPlayers) {
					const rejected: HostMessage = {
						type: 'REJECTED',
						message: get(t)('network.sessionFull')
					}
					conn.send(rejected)
					setTimeout(() => conn.close(), 300)
					return
				}
				const entry: ClientEntry = { conn, name: msg.playerName, playerId: conn.peer }
				this.clients.set(conn.peer, entry)
				conn.send({
					type: 'WELCOME',
					playerId: conn.peer,
					gameId: this.def.id,
					hostPlayerId: this.playerId
				} as HostMessage)
				this.broadcastLobby()
			} else if (msg.type === 'ACTION') {
				const clientEntry = this.clients.get(conn.peer)
				const playerId = clientEntry?.playerId ?? conn.peer
				this.handleAction(playerId, msg.action)
			} else if (msg.type === 'RESYNC') {
				if (this.state) this.sendStateTo(conn, this.state)
			} else if (msg.type === 'PING') {
				conn.send({ type: 'PONG', t: msg.t } as HostMessage)
			} else if (msg.type === 'CHAT_SEND') {
				const clientEntry = this.clients.get(conn.peer)
				const senderId = clientEntry?.playerId ?? conn.peer
				const senderName = clientEntry?.name ?? this.hostName
				this.onChat?.(senderId, senderName, msg.text.slice(0, 200))
				this.broadcast({
					type: 'CHAT_RECEIVE',
					playerId: senderId,
					playerName: senderName,
					text: msg.text.slice(0, 200)
				} as HostMessage)
			}
		})

		conn.on('close', () => {
			const entry = this.clients.get(conn.peer)
			const wasPending = this.pendingPlayerIds.has(conn.peer)
			this.clients.delete(conn.peer)
			this.pendingPlayerIds.delete(conn.peer)
			this.broadcastLobby()

			if (wasPending || !this.state || this.state.phase === 'gameover') return

			// Grace period: give the player time to reconnect before processing disconnect
			const timer = setTimeout(() => {
				this.pendingDisconnects.delete(conn.peer)
				// Use stored playerId (important for migrated hosts)
				const playerId = entry?.playerId ?? conn.peer
				this.handlePlayerDisconnect(playerId)
			}, RECONNECT_WINDOW_MS)
			this.pendingDisconnects.set(conn.peer, timer)
		})
	}

	private handlePlayerDisconnect(playerId: string) {
		if (!this.state || this.state.phase === 'gameover') return

		let next: GameStateGeneric
		if (this.def.onPlayerDisconnect) {
			next = this.def.onPlayerDisconnect(this.state, playerId)
		} else {
			const remaining = this.state.players.filter((p) => p !== playerId).length
			if (remaining < this.def.minPlayers) {
				next = {
					...this.state,
					phase: 'gameover',
					players: this.state.players.filter((p) => p !== playerId)
				}
			} else {
				const filtered = this.state.players.filter((p) => p !== playerId)
				let nextTurn = this.state.turnPlayerId
				if (nextTurn === playerId) {
					if (filtered.length === 0) return
					const idx = this.state.players.indexOf(playerId)
					nextTurn = this.state.players[(idx + 1) % this.state.players.length]
					if (nextTurn === playerId) nextTurn = filtered[0] ?? playerId
				}
				next = { ...this.state, players: filtered, turnPlayerId: nextTurn }
			}
		}

		this.state = next
		this.onState?.(next)
		this.broadcastState(next)
		this.scheduleAutoAction(next)
	}

	private handleAction(playerId: string, action: Action) {
		if (!this.state) return
		const valid = this.def.getValidActions(this.state, playerId)
		const isValid = valid.some(
			(a: Action) =>
				a.type === action.type &&
				a.playerId === action.playerId &&
				Object.entries(a.payload ?? {}).every(
					([k, v]) =>
						JSON.stringify((action.payload as Record<string, unknown>)?.[k]) === JSON.stringify(v)
				)
		)
		if (!isValid) return
		const next = this.def.applyAction(this.state, action)
		this.state = next
		this.onState?.(next)
		this.broadcastState(next)
		this.scheduleAutoAction(next)
	}

	private scheduleAutoAction(state: GameStateGeneric) {
		if (this._autoTimer !== null) {
			clearTimeout(this._autoTimer)
			this._autoTimer = null
		}

		// Game-specific scheduled action (e.g. Werewolf night phase)
		const sched = this.def.scheduleAction?.(state)
		if (sched) {
			this._autoTimer = setTimeout(
				() => {
					this._autoTimer = null
					this.handleAction(sched.action.playerId, sched.action)
				},
				Math.max(0, sched.delayMs)
			)
			return
		}

		// Global per-turn timer option
		const timerSeconds = this._options?.timerSeconds as number | undefined
		if (!timerSeconds || !state.turnPlayerId) return
		const validActions = this.def.getValidActions(state, state.turnPlayerId)
		if (validActions.length === 0) return

		// Pick a "pass"-like action if available, otherwise the first valid one
		const passAction =
			validActions.find((a: Action) => a.type === 'PASS' || a.type === 'SKIP') ?? validActions[0]

		this._autoTimer = setTimeout(() => {
			this._autoTimer = null
			this.handleAction(passAction.playerId, passAction)
		}, timerSeconds * 1000)
	}

	private broadcastLobby() {
		if (!this.state && this.def.onOptionsChange) {
			const patch = this.def.onOptionsChange(this._options, this.lobbyPlayers.length)
			if (Object.keys(patch).length > 0) this._options = { ...this._options, ...patch }
		}
		const msg: HostMessage = { type: 'LOBBY', players: this.lobbyPlayers, options: this._options }
		this.broadcast(msg)
		this.onLobbyChange?.(this.lobbyPlayers)
	}

	private broadcastState(state: GameStateGeneric) {
		this._stateSeq++
		this.broadcast({ type: 'STATE', state, seq: this._stateSeq })
	}

	private sendStateTo(conn: DataConnection, state: GameStateGeneric) {
		conn.send({ type: 'STATE', state, seq: this._stateSeq } as HostMessage)
	}

	private broadcast(msg: HostMessage) {
		for (const { conn } of this.clients.values()) {
			conn.send(msg)
		}
	}

	kick(playerId: string) {
		const [peerId, client] = this.clients.entries().find(([, c]) => c.playerId === playerId) ?? [
			null,
			null
		]
		if (!client || !peerId) return
		client.conn.send({ type: 'HOST_GONE', message: get(t)('network.kicked') } as HostMessage)
		this.clients.delete(peerId)
		this.pendingPlayerIds.delete(peerId)
		this.broadcastLobby()
		client.conn.close()
	}

	/** Host submits their own action (skips the network round-trip). */
	submitAction(action: Action) {
		this.handleAction(this.playerId, action)
	}

	sendChat(text: string) {
		const trimmed = text.trim().slice(0, 200)
		if (!trimmed) return
		this.onChat?.(this.playerId, this.hostName, trimmed)
		this.broadcast({
			type: 'CHAT_RECEIVE',
			playerId: this.playerId,
			playerName: this.hostName,
			text: trimmed
		} as HostMessage)
	}

	/** Start the game. Player order = lobby order (host first). */
	startGame() {
		this.pendingPlayerIds.clear()
		const playerIds = this.lobbyPlayers.map((p) => p.id)
		const opts = this.state ? { ...this._options, previousState: this.state } : this._options
		const initial = this.def.setup(playerIds, opts)
		this.state = initial
		this.broadcastLobby()
		this.onState?.(initial)
		this.broadcastState(initial)
		this.scheduleAutoAction(initial)
	}

	/**
	 * Graceful handoff: notify all clients of the upcoming migration,
	 * then destroy the peer so they can elect a new host.
	 */
	migrateAway(migrationIndex: number) {
		this.broadcast({ type: 'MIGRATE_HOST', migrationIndex } as HostMessage)
		// Delay destroy slightly so the message can be flushed
		setTimeout(() => this.peer?.destroy(), 100)
	}

	/** Re-open the PeerJS signaling socket if mobile suspend killed it. */
	reconnectSignaling() {
		if (this.peer && !this.peer.destroyed && this.peer.disconnected) {
			this.peer.reconnect()
		}
	}

	close(message?: string) {
		if (this._autoTimer !== null) {
			clearTimeout(this._autoTimer)
			this._autoTimer = null
		}
		for (const timer of this.pendingDisconnects.values()) clearTimeout(timer)
		for (const timer of this._pendingMigrationReconnects.values()) clearTimeout(timer)
		this.pendingDisconnects.clear()
		this._pendingMigrationReconnects.clear()
		GameHost.clearStoredHostSession(this._code)
		// If peer is already destroyed (migrateAway was called), skip HOST_GONE
		if (!this.peer?.destroyed) {
			this.broadcast({ type: 'HOST_GONE', message: message ?? get(t)('network.hostGone') })
			this.peer?.destroy()
		}
	}
}
