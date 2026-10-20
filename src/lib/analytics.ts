type Umami = { track: (name: string, data?: Record<string, unknown>) => void }

/** Send a custom event to Umami. No-op if the script is blocked or not loaded. */
export function track(name: string, data?: Record<string, unknown>) {
	try {
		;(globalThis as { umami?: Umami }).umami?.track(name, data)
	} catch {
		// analytics must never break the game
	}
}
