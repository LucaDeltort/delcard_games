const TURN_CREDS_URL = import.meta.env.PUBLIC_TURN_CREDS_URL

export async function getTurnIceServers(): Promise<RTCIceServer[]> {
	if (!TURN_CREDS_URL) return []
	try {
		const res = await fetch(TURN_CREDS_URL, { signal: AbortSignal.timeout(3000) })
		const data = await res.json()
		return data.iceServers ?? []
	} catch {
		return []
	}
}
