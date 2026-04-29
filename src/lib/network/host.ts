import Peer, { type DataConnection } from 'peerjs'
import { get } from 'svelte/store'
import type { GameStateGeneric } from '$lib/core/types'
import type { Action, GameDefinition } from '$lib/engine'
import { t } from '$lib/i18n'
import type { ClientMessage, HostMessage, LobbyPlayer } from './messages'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PEER_PREFIX = 'delcard-'

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
	private state: GameStateGeneric | null = null
	private _code: string
	private hostName: string

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

	private initPeer() {
		this.peer = new Peer(PEER_PREFIX + this._code)

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
				const welcome: HostMessage = { type: 'WELCOME', playerId: conn.peer }
				conn.send(welcome)
				this.broadcastLobby()
			} else if (msg.type === 'ACTION') {
				this.handleAction(conn.peer, msg.action)
			}
		})

		conn.on('close', () => {
			this.clients.delete(conn.peer)
			this.broadcastLobby()
			this.handlePlayerDisconnect(conn.peer)
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
				return
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
			(a: Action) => a.type === action.type && a.playerId === action.playerId
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
		this.broadcast({ type: 'STATE', state })
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

	close(message?: string) {
		this.broadcast({ type: 'HOST_GONE', message: message ?? get(t)('network.hostGone') })
		this.peer.destroy()
	}
}
