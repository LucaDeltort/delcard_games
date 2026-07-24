// Reactive game audio: compares successive GameState snapshots and plays
// appropriate SFX (card-flip, dice-roll, win/lose) without modifying each
// game view individually.
//
// Usage: call onGameStateChange(prev, next, myPlayerId) from the game page's
// $effect or onState callback.

import type { GameStateGeneric } from '$lib/core/types'
import { playSound } from './player'
import { Sounds } from './sounds'

/**
 * Detect if cards moved between zones (not just reshuffled in place).
 */
function cardsChanged(prev: GameStateGeneric, next: GameStateGeneric): boolean {
	if (!prev || !next) return false
	for (const id of Object.keys(next.zones)) {
		const pz = prev.zones[id]
		const nz = next.zones[id]
		if ((pz?.cards.length ?? 0) !== (nz?.cards.length ?? 0)) return true
	}
	return false
}

/**
 * Check if the game transitioned to a 'gameover' / 'finished' phase.
 */
function isGameOver(state: GameStateGeneric): boolean {
	return state.phase === 'gameover' || state.phase === 'finished' || state.phase === 'done'
}

/**
 * Call this whenever gameState updates. Plays sounds reactively.
 * @param prev previous state (or null on first load)
 * @param next new state
 * @param winnerId the winner's player ID, or undefined if not over
 * @param myPlayerId current viewer's player ID
 */
export function onGameStateChange(
	prev: GameStateGeneric | null,
	next: GameStateGeneric,
	winnerId?: string | null,
	myPlayerId?: string
): void {
	if (!next) return

	// Game over detection
	if (isGameOver(next) && prev && !isGameOver(prev)) {
		if (winnerId && myPlayerId) {
			playSound(winnerId === myPlayerId ? Sounds.sfx.Win : Sounds.sfx.Lose)
		} else {
			playSound(Sounds.sfx.Win)
		}
		return
	}

	// Card flip detection: card count changed in any zone
	if (prev && cardsChanged(prev, next)) {
		// Yams uses dice, detect by game id
		if (next.activeGameId === 'yams') {
			playSound(Sounds.sfx.DiceRoll)
		} else {
			playSound(Sounds.sfx.CardFlip)
		}
	}
}
