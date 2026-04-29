import type { DeckType, GameStateGeneric } from '$lib/core/types'

export type Action = {
	type: string
	playerId: string
	payload?: unknown
}

/**
 * The contract every game must implement.
 *
 * `S` is the game-specific state type, which must extend `GameStateGeneric`.
 * All methods are pure functions — they never mutate their arguments.
 */
export type GameDefinition<S extends GameStateGeneric> = {
	id: string
	name: string
	deckType: DeckType
	minPlayers: number
	maxPlayers: number

	/** Returns the initial game state for the given list of player IDs. */
	setup: (players: string[]) => S

	/** Returns every legal action the given player can take right now. */
	getValidActions: (state: S, playerId: string) => Action[]

	/** Applies an action and returns the new state. Must not mutate `state`. */
	applyAction: (state: S, action: Action) => S

	/** Returns true when the game has ended. */
	isOver: (state: S) => boolean

	/** Returns the winning player's ID, or null if the game is still running. */
	getWinner: (state: S) => string | null

	/**
	 * Called by the host when a non-host player disconnects mid-game.
	 * Return a new state that either continues the game (player removed/skipped)
	 * or ends it (phase set to 'gameover'). If omitted, the host falls back to
	 * a generic gameover when remaining players drop below minPlayers.
	 */
	onPlayerDisconnect?: (state: S, playerId: string) => S
}

/** Returns the ID of the player after `currentId` in a circular list. */
export function nextPlayer(players: string[], currentId: string): string {
	const idx = players.indexOf(currentId)
	return players[(idx + 1) % players.length]
}
