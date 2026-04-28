import Peer, { type DataConnection } from 'peerjs'
import { get } from 'svelte/store'
import type { GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'
import { t } from '$lib/i18n'
import type { ClientMessage, HostMessage, LobbyPlayer } from './messages'

const PEER_PREFIX = 'delcard-'

export class GameClient {
	private peer: Peer
	private conn: DataConnection | null = null
	private _playerId: string | null = null
	private _lobbyPlayers: LobbyPlayer[] = []
	private _disconnected = false

	onWelcome?: (playerId: string) => void
	onLobby?: (players: LobbyPlayer[]) => void
	onState?: (state: GameStateGeneric) => void
	onDisconnected?: (message: string) => void

	constructor(code: string, playerName: string) {
		this.peer = new Peer()

		this.peer.on('open', () => {
			this.conn = this.peer.connect(PEER_PREFIX + code)

			this.conn.on('open', () => {
				const msg: ClientMessage = { type: 'JOIN', playerName }
				this.conn!.send(msg)
			})

			this.conn.on('data', (raw) => this.handleMessage(raw as HostMessage))

			this.conn.on('close', () => {
				if (!this._disconnected) {
					this.onDisconnected?.(get(t)('network.connectionLost'))
				}
			})

			this.conn.on('error', () => {
				this.onDisconnected?.(get(t)('network.connectionError'))
			})
		})

		this.peer.on('error', () => {
			this.onDisconnected?.(get(t)('network.connectionError'))
		})
	}

	private handleMessage(msg: HostMessage) {
		switch (msg.type) {
			case 'WELCOME':
				this._playerId = msg.playerId
				this.onWelcome?.(msg.playerId)
				break
			case 'LOBBY':
				this._lobbyPlayers = msg.players
				this.onLobby?.(msg.players)
				break
			case 'STATE':
				this.onState?.(msg.state)
				break
			case 'HOST_GONE':
				this._disconnected = true
				this.onDisconnected?.(msg.message)
				break
			case 'REJECTED':
				this._disconnected = true
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

	sendAction(action: Action) {
		if (!this.conn) return
		const msg: ClientMessage = { type: 'ACTION', action }
		this.conn.send(msg)
	}

	close() {
		this.peer.destroy()
	}
}
