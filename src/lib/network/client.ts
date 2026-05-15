import Peer, { type DataConnection } from 'peerjs'
import { get } from 'svelte/store'
import type { GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'
import { t } from '$lib/i18n'
import type { ClientMessage, HostMessage, LobbyPlayer } from './messages'
import { getTurnIceServers } from './turn'

const PEER_PREFIX = 'delcard-'
const RETRY_BACKOFF_MS = [1000, 2000, 4000, 8000, 12000, 20000]
const MAX_RETRIES = RETRY_BACKOFF_MS.length
const PING_INTERVAL_MS = 5000
const PONG_TIMEOUT_MS = 12000

export class GameClient {
	private peer!: Peer
	private conn: DataConnection | null = null
	private _playerId: string | null = null
	private _gameId: string | null = null
	private _lobbyPlayers: LobbyPlayer[] = []
	private _intentionalClose = false
	private _retryCount = 0
	private _code: string
	private _playerName: string
	private _heartbeatInterval: ReturnType<typeof setInterval> | null = null
	private _heartbeatCheck: ReturnType<typeof setInterval> | null = null
	private _lastPongAt = 0
	private _lastQuality: 'good' | 'warn' | 'poor' | null = null
	private _lastSeq = -1
	private _actionQueue: Action[] = []
	private _onVisible: (() => void) | null = null
	private _onOnline: (() => void) | null = null
	private _initInProgress = false

	onWelcome?: (playerId: string) => void
	onLobby?: (players: LobbyPlayer[]) => void
	onState?: (state: GameStateGeneric) => void
	onDisconnected?: (message: string) => void
	onReconnecting?: () => void
	onQualityChange?: (quality: 'good' | 'warn' | 'poor') => void

	constructor(code: string, playerName: string) {
		this._code = code
		this._playerName = playerName
		this.installVisibilityListeners()
		this.initPeer()
	}

	private storageKey(): string {
		return `delcard-peerid-${this._code}`
	}

	private loadStoredPeerId(): string | undefined {
		if (typeof sessionStorage === 'undefined') return undefined
		try {
			return sessionStorage.getItem(this.storageKey()) ?? undefined
		} catch {
			return undefined
		}
	}

	private saveStoredPeerId(id: string) {
		if (typeof sessionStorage === 'undefined') return
		try {
			sessionStorage.setItem(this.storageKey(), id)
		} catch {
			// ignore quota / privacy-mode errors
		}
	}

	private clearStoredPeerId() {
		if (typeof sessionStorage === 'undefined') return
		try {
			sessionStorage.removeItem(this.storageKey())
		} catch {
			// ignore
		}
	}

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
					this.onDisconnected?.(get(t)('network.hostNotFound'))
				} else if (!this._intentionalClose) {
					this.onDisconnected?.(get(t)('network.connectionError'))
				}
			})
		} finally {
			this._initInProgress = false
		}
	}

	private openConnection() {
		const conn = this.peer.connect(PEER_PREFIX + this._code)
		this.conn = conn

		conn.on('open', () => {
			conn.send({ type: 'JOIN', playerName: this._playerName } as ClientMessage)
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
				this.onDisconnected?.(get(t)('network.connectionLost'))
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
				this.onWelcome?.(msg.playerId)
				this.flushActionQueue()
				break
			case 'LOBBY':
				this._lobbyPlayers = msg.players
				this.onLobby?.(msg.players)
				break
			case 'STATE':
				if (this._lastSeq >= 0 && msg.seq !== this._lastSeq + 1) {
					this.conn?.send({ type: 'RESYNC' } as ClientMessage)
				}
				this._lastSeq = msg.seq
				this.onState?.(msg.state)
				break
			case 'HOST_GONE':
				this._intentionalClose = true
				this.clearStoredPeerId()
				this.onDisconnected?.(msg.message)
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
				const quality = rtt < 100 ? 'good' : rtt < 300 ? 'warn' : 'poor'
				if (quality !== this._lastQuality) {
					this._lastQuality = quality
					this.onQualityChange?.(quality)
				}
				break
			}
		}
	}

	get playerId(): string | null {
		return this._playerId
	}

	get gameId(): string | null {
		return this._gameId
	}

	get lobbyPlayers(): LobbyPlayer[] {
		return this._lobbyPlayers
	}

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
