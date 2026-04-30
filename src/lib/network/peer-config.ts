import { PUBLIC_PEER_HOST, PUBLIC_PEER_PATH, PUBLIC_PEER_PORT } from '$env/static/public'
import type { PeerOptions } from 'peerjs'

export function peerOptions(): PeerOptions | undefined {
	if (!PUBLIC_PEER_HOST) return undefined
	return {
		host: PUBLIC_PEER_HOST,
		port: PUBLIC_PEER_PORT ? parseInt(PUBLIC_PEER_PORT) : 443,
		path: PUBLIC_PEER_PATH || '/peerjs',
		secure: true
	}
}
