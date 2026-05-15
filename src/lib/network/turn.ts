import { PUBLIC_TURN_CREDS_URL } from '$env/static/public'

const FETCH_TIMEOUT_MS = 8000
const CACHE_TTL_MS = 10 * 60 * 1000

let cache: { value: RTCIceServer[]; expiresAt: number } | null = null

function isValidIceServer(entry: unknown): entry is RTCIceServer {
	if (!entry || typeof entry !== 'object') return false
	const urls = (entry as { urls?: unknown }).urls
	if (typeof urls === 'string') return true
	if (Array.isArray(urls) && urls.every((u) => typeof u === 'string')) return true
	return false
}

export async function getTurnIceServers(): Promise<RTCIceServer[]> {
	if (!PUBLIC_TURN_CREDS_URL) return []

	if (cache && cache.expiresAt > Date.now()) return cache.value

	try {
		const res = await fetch(PUBLIC_TURN_CREDS_URL, {
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
		})
		if (!res.ok) throw new Error(`HTTP ${res.status}`)
		const data: unknown = await res.json()
		const raw = (data as { iceServers?: unknown })?.iceServers
		const servers = Array.isArray(raw) ? raw.filter(isValidIceServer) : []
		cache = { value: servers, expiresAt: Date.now() + CACHE_TTL_MS }
		return servers
	} catch (err) {
		if (import.meta.env.DEV) console.warn('TURN fetch failed', err)
		return []
	}
}
