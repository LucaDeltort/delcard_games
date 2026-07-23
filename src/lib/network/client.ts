import Peer, { type DataConnection } from 'peerjs'
import { get } from 'svelte/store'
import type { GameStateGeneric } from '$lib/core/types'
import type { Action, GameDefinition } from '$lib/engine'
import { t } from '$lib/i18n'
import { GameHost, PEER_PREFIX } from './host'
import type { ClientMessage, HostMessage, LobbyPlayer } from './messages'
import { getTurnIceServers } from './turn'

const RETRY_BACKOFF_MS = [1000, 2000, 4000, 8000, 12000, 20000]
const MAX_RETRIES = RETRY_BACKOFF_MS.length
const PING_INTERVAL_MS = 5000
const PONG_TIMEOUT_MS = 12000
const MAX_MIGRATION_PROBE = 5
const MIGRATION_RACE_TIMEOUT_MS = 5000
const MIGRATION_INDEX_STORAGE_PREFIX = 'delcard-migration-'

export type MigrationResult =
	| { role: 'host'; host: GameHost }
	| { role: 'client'; client: GameClient }

export class GameClient {
	private peer!: Peer
	private conn: DataConnection | null = null
	private _playerId: string | null = null
	private _gameId: string | null = null
	private _lobbyPlayers: LobbyPlayer[] = []
	private _options: Record<string, unknown> = {}
	private _intentionalClose = false
	private _retryCount = 0
	private _code: string
	private _playerName: string
	private _heartbeatInterval: ReturnType<typeof setInterval> | null = null
	private _heartbeatCheck: ReturnType<typeof setInterval> | null = null
	private _lastPongAt = 0
	private _lastQuality: 'good' | 'warn' | 'poor' | null = null
	private _lastSeq = -1
	private _lastState: GameStateGeneric | null = null
	private _actionQueue: Action[] = []
	private _onVisible: (() => void) | null = null
	private _onOnline: (() => void) | null = null
	private _initInProgress = false
	private _migrationIndex: number
	private _connectionTargetIndex = -1 // -1 = base code, 0+ = probe m1, m2...
	private _def: GameDefinition<GameStateGeneric> | null = null
	private _currentHostPlayerId: string | null = null

	onWelcome?: (playerId: string) => void
	onLobby?: (players: LobbyPlayer[]) => void
	onState?: (state: GameStateGeneric) => void
	onDisconnected?: (message: string) => void
	onReconnecting?: () => void
	onMigrating?: () => void
	onQualityChange?: (quality: 'good' | 'warn' | 'poor') => void
	onMigration?: (result: MigrationResult) => void

	constructor(
		code: string,
		playerName: string,
		def?: GameDefinition<GameStateGeneric>,
		startConnectionTargetIndex = -1,
		resumePlayerId?: string
	) {
		this._code = code
		this._playerName = playerName
		this._def = def ?? null
		this._connectionTargetIndex = startConnectionTargetIndex
		this._playerId = resumePlayerId ?? null
		this._migrationIndex = this.loadMigrationIndex()
		this.installVisibilityListeners()
		this.initPeer()
	}

	// ── localStorage helpers ──────────────────────────────────

	private storageKey(): string {
		return `delcard-peerid-${this._code}`
	}

	private migrationStorageKey(): string {
		return `${MIGRATION_INDEX_STORAGE_PREFIX}${this._code}`
	}

	private loadStoredPeerId(): string | undefined {
		if (typeof localStorage === 'undefined') return undefined
		try {
			return localStorage.getItem(this.storageKey()) ?? undefined
		} catch {
			return undefined
		}
	}

	private saveStoredPeerId(id: string) {
		if (typeof localStorage === 'undefined') return
		try {
			localStorage.setItem(this.storageKey(), id)
			this.saveStoredPlayerName(this._playerName)
		} catch {
			// ignore quota / privacy-mode errors
		}
	}

	private clearStoredPeerId() {
		if (typeof localStorage === 'undefined') return
		try {
			localStorage.removeItem(this.storageKey())
			this.clearStoredPlayerName()
		} catch {
			// ignore
		}
	}

	private playerNameKey(): string {
		return `delcard-playername-${this._code}`
	}

	private saveStoredPlayerName(name: string) {
		if (typeof localStorage === 'undefined') return
		try {
			localStorage.setItem(this.playerNameKey(), name)
		} catch {
			// ignore quota / privacy-mode errors
		}
	}

	private clearStoredPlayerName() {
		if (typeof localStorage === 'undefined') return
		try {
			localStorage.removeItem(this.playerNameKey())
		} catch {
			// ignore
		}
	}

	static getStoredSession(code: string): { peerId: string; playerName: string } | null {
		if (typeof localStorage === 'undefined') return null
		try {
			const peerId = localStorage.getItem(`delcard-peerid-${code}`)
			const playerName = localStorage.getItem(`delcard-playername-${code}`)
			if (peerId && playerName) return { peerId, playerName }
			return null
		} catch {
			return null
		}
	}

	static hasStoredSession(code: string): boolean {
		return GameClient.getStoredSession(code) !== null
	}

	static clearStoredSession(code: string) {
		if (typeof localStorage === 'undefined') return
		try {
			localStorage.removeItem(`delcard-peerid-${code}`)
			localStorage.removeItem(`delcard-playername-${code}`)
		} catch {
			// ignore
		}
	}

	private loadMigrationIndex(): number {
		if (typeof localStorage === 'undefined') return 0
		try {
			return parseInt(localStorage.getItem(this.migrationStorageKey()) ?? '0', 10) || 0
		} catch {
			return 0
		}
	}

	private saveMigrationIndex(index: number) {
		if (typeof localStorage === 'undefined') return
		try {
			localStorage.setItem(this.migrationStorageKey(), String(index))
		} catch {
			// ignore
		}
	}

	// ── connection target (supports migration probing) ──────────

	private getConnectionTarget(): string {
		const base = PEER_PREFIX + this._code
		if (this._connectionTargetIndex < 0) return base
		return `${base}-m${this._connectionTargetIndex + 1}`
	}

	// ── peer init ────────────────────────────────────────────────

	private async initPeer() {
		if (this._initInProgress) return
		this._initInProgress = true
		try {
			const iceServers = await getTurnIceServers()
			if (this._intentionalClose) return
			const config = iceServers.length ? { config: { iceServers } } : {}
			const storedId = this.loadStoredPeerId()
			this.peer = storedId ? new Peer(storedId, config) : new Peer(config)

			this.peer.on('open', (id) => {
				this.saveStoredPeerId(id)
				this.openConnection()
			})

			this.peer.on('error', (err) => {
				const type = (err as { type?: string }).type
				if (type === 'unavailable-id') {
					this.clearStoredPeerId()
					try {
						this.peer.destroy()
					} catch {
						// ignore
					}
					this.initPeer()
					return
				}
				if (type === 'peer-unavailable') {
					// Target host peer not found — probe next migration level
					if (this._connectionTargetIndex < MAX_MIGRATION_PROBE - 1) {
						this._connectionTargetIndex++
						this.openConnection()
					} else {
						this._connectionTargetIndex = -1 // reset for future use
						this.onDisconnected?.(get(t)('network.hostNotFound'))
					}
				} else if (!this._intentionalClose) {
					this.onDisconnected?.(get(t)('network.connectionError'))
				}
			})
		} finally {
			this._initInProgress = false
		}
	}

	private openConnection() {
		const target = this.getConnectionTarget()
		const conn = this.peer.connect(target)
		this.conn = conn

		conn.on('open', () => {
			conn.send({
				type: 'JOIN',
				playerName: this._playerName,
				resumePlayerId: this._playerId ?? undefined
			} as ClientMessage)
			this.startHeartbeat(conn)
		})

		conn.on('data', (raw) => this.handleMessage(raw as HostMessage))

		conn.on('close', () => {
			this.stopHeartbeat()
			if (this._intentionalClose) return
			this._retryCount++
			if (this._retryCount <= MAX_RETRIES) {
				this.onReconnecting?.()
				setTimeout(() => this.tryReconnect(), RETRY_BACKOFF_MS[this._retryCount - 1])
			} else {
				// Retries exhausted — attempt host migration if game was active
				if (this._lastState && this._lastState.phase !== 'gameover') {
					this._intentionalClose = true // prevent further reconnect attempts
					this.attemptMigration(this._migrationIndex + 1)
				} else {
					this.onDisconnected?.(get(t)('network.connectionLost'))
				}
			}
		})

		conn.on('error', () => {
			if (!this._intentionalClose) {
				this.onDisconnected?.(get(t)('network.connectionError'))
			}
		})
	}

	private async tryReconnect() {
		if (this._intentionalClose) return
		this._lastSeq = -1
		if (!this.peer || this.peer.destroyed) {
			await this.initPeer()
			return
		}
		if (this.peer.disconnected) {
			this.peer.reconnect()
			this.peer.once('open', () => this.openConnection())
			return
		}
		this.openConnection()
	}

	private probeOrReconnect() {
		if (this._intentionalClose) return
		if (!this.peer || this.peer.destroyed) {
			this.tryReconnect()
			return
		}
		if (this.peer.disconnected) {
			this.onReconnecting?.()
			this.peer.reconnect()
			this.peer.once('open', () => this.openConnection())
			return
		}
		if (!this.conn || !this.conn.open) {
			this.onReconnecting?.()
			this.openConnection()
			return
		}
		try {
			this.conn.send({ type: 'PING', t: Date.now() } as ClientMessage)
		} catch {
			// send failed — heartbeat check will detect and close
		}
	}

	private installVisibilityListeners() {
		if (typeof document === 'undefined' || typeof window === 'undefined') return
		this._onVisible = () => {
			if (document.visibilityState === 'visible') this.probeOrReconnect()
		}
		this._onOnline = () => this.probeOrReconnect()
		document.addEventListener('visibilitychange', this._onVisible)
		window.addEventListener('online', this._onOnline)
	}

	private removeVisibilityListeners() {
		if (typeof document === 'undefined' || typeof window === 'undefined') return
		if (this._onVisible) document.removeEventListener('visibilitychange', this._onVisible)
		if (this._onOnline) window.removeEventListener('online', this._onOnline)
		this._onVisible = null
		this._onOnline = null
	}

	private handleMessage(msg: HostMessage) {
		switch (msg.type) {
			case 'WELCOME':
				this._retryCount = 0
				this._playerId = msg.playerId
				this._gameId = msg.gameId
				this._currentHostPlayerId = msg.hostPlayerId
				this.onWelcome?.(msg.playerId)
				this.flushActionQueue()
				break
			case 'LOBBY':
				this._lobbyPlayers = msg.players
				this._options = msg.options
				this.onLobby?.(msg.players)
				break
			case 'STATE':
				if (this._lastSeq >= 0 && msg.seq !== this._lastSeq + 1) {
					this.conn?.send({ type: 'RESYNC' } as ClientMessage)
				}
				this._lastSeq = msg.seq
				this._lastState = msg.state
				this.onState?.(msg.state)
				break
			case 'HOST_GONE':
				this._intentionalClose = true
				this.clearStoredPeerId()
				this.onDisconnected?.(msg.message)
				break
			case 'MIGRATE_HOST':
				// Host is gracefully handing off — start migration immediately
				this._intentionalClose = true // stop retry loop
				this.stopHeartbeat()
				this.attemptMigration(msg.migrationIndex)
				break
			case 'REJECTED':
				this._intentionalClose = true
				this.clearStoredPeerId()
				this.onDisconnected?.(msg.message)
				break
			case 'PING':
				this.conn?.send({ type: 'PONG', t: msg.t } as ClientMessage)
				break
			case 'PONG': {
				const now = Date.now()
				this._lastPongAt = now
				const rtt = now - msg.t
				const quality = rtt < 250 ? 'good' : rtt < 600 ? 'warn' : 'poor'
				if (quality !== this._lastQuality) {
					this._lastQuality = quality
					this.onQualityChange?.(quality)
				}
				break
			}
		}
	}

	// ── host migration ───────────────────────────────────────────

	async attemptMigration(migrationIndex: number) {
		if (!this._lastState || !this._def || !this._playerId) {
			this.onDisconnected?.(get(t)('network.connectionLost'))
			return
		}

		// Spectator: not in active players list — skip election, just find the new host
		if (!this._lastState.players.includes(this._playerId)) {
			this.saveMigrationIndex(migrationIndex)
			const newClient = new GameClient(
				this._code,
				this._playerName,
				this._def,
				migrationIndex - 1,
				this._playerId
			)
			this.removeVisibilityListeners()
			this.onMigration?.({ role: 'client', client: newClient })
			return
		}

		this.onMigrating?.()

		const savedState = this._lastState
		const savedPlayerId = this._playerId
		const deadHostPlayerId = this._currentHostPlayerId ?? savedPlayerId
		const def = this._def
		const code = this._code

		const iceServers = await getTurnIceServers()
		const config = iceServers.length ? { config: { iceServers } } : {}
		const newPeerId = `${PEER_PREFIX}${code}-m${migrationIndex}`

		// Race: try to claim the new host peer ID
		const winnerPeer = await new Promise<Peer | null>((resolve) => {
			const racePeer = new Peer(newPeerId, config)
			const timeout = setTimeout(() => {
				racePeer.destroy()
				resolve(null)
			}, MIGRATION_RACE_TIMEOUT_MS)

			const onOpen = () => {
				clearTimeout(timeout)
				racePeer.off('open', onOpen)
				racePeer.off('error', onError)
				resolve(racePeer) // won — keep peer alive, pass to GameHost.resume
			}
			const onError = (err: { type?: string }) => {
				if (err.type === 'unavailable-id') {
					// Someone else claimed the reserved host ID — lost the race
					clearTimeout(timeout)
					racePeer.destroy()
					resolve(null)
				}
				// Any other error (network, ICE, etc.): also abort — but distinguish
				// semantically from "lost the election"
				clearTimeout(timeout)
				racePeer.destroy()
				resolve(null)
			}
			racePeer.on('open', onOpen)
			racePeer.on('error', onError)
		})

		this.saveMigrationIndex(migrationIndex)

		if (winnerPeer) {
			// Won the election — become the new host
			const host = GameHost.resume(
				code,
				migrationIndex,
				savedState,
				savedPlayerId,
				deadHostPlayerId,
				def,
				this._playerName,
				winnerPeer
			)
			this.removeVisibilityListeners()
			this.onMigration?.({ role: 'host', host })
		} else {
			// Lost the election — connect to the winner as a client
			const newClient = new GameClient(
				code,
				this._playerName,
				def,
				migrationIndex - 1,
				savedPlayerId
			)
			this.removeVisibilityListeners()
			this.onMigration?.({ role: 'client', client: newClient })
		}
	}

	// ── getters ──────────────────────────────────────────────────

	get playerId(): string | null {
		return this._playerId
	}

	get gameId(): string | null {
		return this._gameId
	}

	get options(): Record<string, unknown> {
		return this._options
	}

	get lobbyPlayers(): LobbyPlayer[] {
		return this._lobbyPlayers
	}

	get lastState(): GameStateGeneric | null {
		return this._lastState
	}

	setDef(def: GameDefinition<GameStateGeneric>) {
		this._def = def
	}

	// ── heartbeat ────────────────────────────────────────────────

	private startHeartbeat(conn: DataConnection) {
		this.stopHeartbeat()
		this._lastPongAt = Date.now()
		this._heartbeatInterval = setInterval(() => {
			if (!conn.open) return
			try {
				conn.send({ type: 'PING', t: Date.now() } as ClientMessage)
			} catch {
				// ignore — next health check handles it
			}
		}, PING_INTERVAL_MS)
		this._heartbeatCheck = setInterval(() => {
			if (Date.now() - this._lastPongAt > PONG_TIMEOUT_MS) {
				this.stopHeartbeat()
				try {
					conn.close()
				} catch {
					// ignore
				}
			}
		}, PING_INTERVAL_MS)
	}

	private stopHeartbeat() {
		if (this._heartbeatInterval !== null) {
			clearInterval(this._heartbeatInterval)
			this._heartbeatInterval = null
		}
		if (this._heartbeatCheck !== null) {
			clearInterval(this._heartbeatCheck)
			this._heartbeatCheck = null
		}
		this._lastQuality = null
	}

	// ── actions ──────────────────────────────────────────────────

	private flushActionQueue() {
		if (!this.conn || !this.conn.open || this._actionQueue.length === 0) return
		for (const action of this._actionQueue) {
			this.conn.send({ type: 'ACTION', action } as ClientMessage)
		}
		this._actionQueue = []
	}

	sendAction(action: Action) {
		if (!this.conn || !this.conn.open) {
			this._actionQueue.push(action)
			return
		}
		this.conn.send({ type: 'ACTION', action } as ClientMessage)
	}

	close() {
		this._intentionalClose = true
		this._actionQueue = []
		this.stopHeartbeat()
		this.removeVisibilityListeners()
		this.clearStoredPeerId()
		this.peer?.destroy()
	}
}
