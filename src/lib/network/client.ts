import Peer, { type DataConnection } from 'peerjs'
import { get } from 'svelte/store'
import type { GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'
import { t } from '$lib/i18n'
import type { ClientMessage, HostMessage, LobbyPlayer } from './messages'
import { getTurnIceServers } from './turn'

const PEER_PREFIX = 'delcard-'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

export class GameClient {
	private peer!: Peer
	private conn: DataConnection | null = null
	private _playerId: string | null = null
	private _lobbyPlayers: LobbyPlayer[] = []
	private _intentionalClose = false
	private _retryCount = 0
	private _code: string
	private _playerName: string
	private _qualityInterval: ReturnType<typeof setInterval> | null = null
	private _lastQuality: 'good' | 'warn' | 'poor' | null = null
	private _lastSeq = 0
	private _actionQueue: Action[] = []

	onWelcome?: (playerId: string) => void
	onLobby?: (players: LobbyPlayer[]) => void
	onState?: (state: GameStateGeneric) => void
	onDisconnected?: (message: string) => void
	onReconnecting?: () => void
	onQualityChange?: (quality: 'good' | 'warn' | 'poor') => void

	constructor(code: string, playerName: string) {
		this._code = code
		this._playerName = playerName
		this.initPeer()
	}

	private async initPeer() {
		const iceServers = await getTurnIceServers()
		const config = iceServers.length ? { config: { iceServers } } : {}
		this.peer = new Peer(config)

		this.peer.on('open', () => this.openConnection())

		this.peer.on('error', (err) => {
			const type = (err as { type?: string }).type
			if (type === 'peer-unavailable') {
				this.onDisconnected?.(get(t)('network.hostNotFound'))
			} else {
				this.onDisconnected?.(get(t)('network.connectionError'))
			}
		})
	}

	private openConnection() {
		const conn = this.peer.connect(PEER_PREFIX + this._code)
		this.conn = conn

		conn.on('open', () => {
			conn.send({ type: 'JOIN', playerName: this._playerName } as ClientMessage)
			this.startQualityPolling(conn)
		})

		conn.on('data', (raw) => this.handleMessage(raw as HostMessage))

		conn.on('close', () => {
			this.stopQualityPolling()
			if (this._intentionalClose) return
			this._retryCount++
			if (this._retryCount <= MAX_RETRIES) {
				this.onReconnecting?.()
				setTimeout(() => this.tryReconnect(), RETRY_DELAY_MS * Math.pow(2, this._retryCount - 1))
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

	private tryReconnect() {
		if (this._intentionalClose || this.peer.destroyed) return
		this._lastSeq = 0
		if (this.peer.disconnected) {
			this.peer.reconnect()
			this.peer.once('open', () => this.openConnection())
		} else {
			this.openConnection()
		}
	}

	private handleMessage(msg: HostMessage) {
		switch (msg.type) {
			case 'WELCOME':
				this._retryCount = 0
				this._playerId = msg.playerId
				this.onWelcome?.(msg.playerId)
				this.flushActionQueue()
				break
			case 'LOBBY':
				this._lobbyPlayers = msg.players
				this.onLobby?.(msg.players)
				break
			case 'STATE':
				if (this._lastSeq > 0 && msg.seq !== this._lastSeq + 1) {
					this.conn?.send({ type: 'RESYNC' } as ClientMessage)
				}
				this._lastSeq = msg.seq
				this.onState?.(msg.state)
				break
			case 'HOST_GONE':
				this._intentionalClose = true
				this.onDisconnected?.(msg.message)
				break
			case 'REJECTED':
				this._intentionalClose = true
				this.onDisconnected?.(msg.message)
				break
		}
	}

	get playerId(): string | null {
		return this._playerId
	}

	get lobbyPlayers(): LobbyPlayer[] {
		return this._lobbyPlayers
	}

	private startQualityPolling(conn: DataConnection) {
		this._qualityInterval = setInterval(async () => {
			const pc = conn.peerConnection
			if (!pc) return
			const stats = await pc.getStats()
			let rtt: number | undefined
			stats.forEach((report) => {
				if (
					report.type === 'candidate-pair' &&
					report.state === 'succeeded' &&
					report.currentRoundTripTime !== undefined
				) {
					rtt = report.currentRoundTripTime * 1000
				}
			})
			if (rtt === undefined) return
			const quality = rtt < 100 ? 'good' : rtt < 300 ? 'warn' : 'poor'
			if (quality !== this._lastQuality) {
				this._lastQuality = quality
				this.onQualityChange?.(quality)
			}
		}, 3000)
	}

	private stopQualityPolling() {
		if (this._qualityInterval !== null) {
			clearInterval(this._qualityInterval)
			this._qualityInterval = null
		}
		this._lastQuality = null
	}

	private flushActionQueue() {
		if (!this.conn || this._actionQueue.length === 0) return
		for (const action of this._actionQueue) {
			this.conn.send({ type: 'ACTION', action } as ClientMessage)
		}
		this._actionQueue = []
	}

	sendAction(action: Action) {
		if (!this.conn) {
			this._actionQueue.push(action)
			return
		}
		this.conn.send({ type: 'ACTION', action } as ClientMessage)
	}

	close() {
		this._intentionalClose = true
		this._actionQueue = []
		this.stopQualityPolling()
		this.peer?.destroy()
	}
}
