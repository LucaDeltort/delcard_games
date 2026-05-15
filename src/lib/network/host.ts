import Peer, { type DataConnection } from 'peerjs'
import { get } from 'svelte/store'
import type { GameStateGeneric } from '$lib/core/types'
import type { Action, GameDefinition } from '$lib/engine'
import { t } from '$lib/i18n'
import type { ClientMessage, HostMessage, LobbyPlayer } from './messages'
import { getTurnIceServers } from './turn'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PEER_PREFIX = 'delcard-'
const RECONNECT_WINDOW_MS = 60_000

function generateCode(): string {
	return Array.from(
		{ length: 4 },
		() => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
	).join('')
}

type ClientEntry = { conn: DataConnection; name: string }

export class GameHost {
	private def: GameDefinition<GameStateGeneric>
	private peer!: Peer
	private clients = new Map<string, ClientEntry>()
	private pendingDisconnects = new Map<string, ReturnType<typeof setTimeout>>()
	private state: GameStateGeneric | null = null
	private _code: string
	private hostName: string
	private _stateSeq = 0

	onReady?: () => void
	onLobbyChange?: (players: LobbyPlayer[]) => void
	onState?: (state: GameStateGeneric) => void
	onError?: (message: string) => void

	constructor(def: GameDefinition<GameStateGeneric>, hostName: string) {
		this.def = def
		this.hostName = hostName
		this._code = generateCode()
		this.initPeer()
	}

	get code(): string {
		return this._code
	}

	/** The host's own player ID — available after onReady fires. */
	get playerId(): string {
		return this.peer?.id ?? ''
	}

	get lobbyPlayers(): LobbyPlayer[] {
		const hostEntry: LobbyPlayer = { id: this.playerId, name: this.hostName }
		const clientEntries = Array.from(this.clients.entries()).map(([id, c]) => ({
			id,
			name: c.name
		}))
		return [hostEntry, ...clientEntries]
	}

	private async initPeer() {
		const iceServers = await getTurnIceServers()
		const config = iceServers.length ? { config: { iceServers } } : {}
		this.peer = new Peer(PEER_PREFIX + this._code, config)

		this.peer.on('open', () => this.onReady?.())

		this.peer.on('error', (err) => {
			if ((err as { type?: string }).type === 'unavailable-id') {
				this._code = generateCode()
				this.peer.destroy()
				this.initPeer()
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
				// Reconnecting player: cancel the pending disconnect timer and restore
				const pendingTimer = this.pendingDisconnects.get(conn.peer)
				if (pendingTimer !== undefined) {
					clearTimeout(pendingTimer)
					this.pendingDisconnects.delete(conn.peer)
					this.clients.set(conn.peer, { conn, name: msg.playerName })
					conn.send({ type: 'WELCOME', playerId: conn.peer } as HostMessage)
					this.broadcastLobby()
					if (this.state) this.sendStateTo(conn, this.state)
					return
				}

				if (this.state !== null) {
					conn.send({ type: 'REJECTED', message: get(t)('network.gameInProgress') } as HostMessage)
					setTimeout(() => conn.close(), 300)
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
				this.clients.set(conn.peer, { conn, name: msg.playerName })
				conn.send({ type: 'WELCOME', playerId: conn.peer } as HostMessage)
				this.broadcastLobby()
			} else if (msg.type === 'ACTION') {
				this.handleAction(conn.peer, msg.action)
			} else if (msg.type === 'RESYNC') {
				if (this.state) this.sendStateTo(conn, this.state)
			} else if (msg.type === 'PING') {
				conn.send({ type: 'PONG', t: msg.t } as HostMessage)
			}
		})

		conn.on('close', () => {
			this.clients.delete(conn.peer)
			this.broadcastLobby()

			if (!this.state || this.state.phase === 'gameover') return

			// Grace period: give the player time to reconnect before processing disconnect
			const timer = setTimeout(() => {
				this.pendingDisconnects.delete(conn.peer)
				this.handlePlayerDisconnect(conn.peer)
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
			const remaining = 1 + this.clients.size
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
	}

	private handleAction(playerId: string, action: Action) {
		if (!this.state) return
		const valid = this.def.getValidActions(this.state, playerId)
		const isValid = valid.some(
			(a: Action) =>
				a.type === action.type &&
				a.playerId === action.playerId &&
				JSON.stringify(a.payload) === JSON.stringify(action.payload)
		)
		if (!isValid) return
		const next = this.def.applyAction(this.state, action)
		this.state = next
		this.onState?.(next)
		this.broadcastState(next)
	}

	private broadcastLobby() {
		const msg: HostMessage = { type: 'LOBBY', players: this.lobbyPlayers }
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

	kick(peerId: string) {
		const client = this.clients.get(peerId)
		if (!client) return
		client.conn.send({ type: 'HOST_GONE', message: get(t)('network.kicked') } as HostMessage)
		this.clients.delete(peerId)
		this.broadcastLobby()
		client.conn.close()
	}

	/** Host submits their own action (skips the network round-trip). */
	submitAction(action: Action) {
		this.handleAction(this.peer.id, action)
	}

	/** Start the game. Player order = lobby order (host first). */
	startGame() {
		const playerIds = this.lobbyPlayers.map((p) => p.id)
		const initial = this.def.setup(playerIds)
		this.state = initial
		this.onState?.(initial)
		this.broadcastState(initial)
	}

	/** Re-open the PeerJS signaling socket if mobile suspend killed it. */
	reconnectSignaling() {
		if (this.peer && !this.peer.destroyed && this.peer.disconnected) {
			this.peer.reconnect()
		}
	}

	close(message?: string) {
		for (const timer of this.pendingDisconnects.values()) clearTimeout(timer)
		this.pendingDisconnects.clear()
		this.broadcast({ type: 'HOST_GONE', message: message ?? get(t)('network.hostGone') })
		this.peer?.destroy()
	}
}
