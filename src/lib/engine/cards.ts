import type { Card } from '$lib/core/types'

/** Creates a single card with a unique id. */
export function createCard(face: string, suit?: string, isHidden = false): Card {
	return { id: crypto.randomUUID(), face, suit, isHidden }
}

/** Fisher-Yates in-place shuffle — returns a new array. */
export function shuffle<T>(items: T[]): T[] {
	const arr = [...items]
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[arr[i], arr[j]] = [arr[j], arr[i]]
	}
	return arr
}

/** Deals `countPerPlayer` cards to `nbPlayers` hands, round-robin. */
export function deal(
	deck: Card[],
	countPerPlayer: number,
	nbPlayers: number
): { hands: Card[][]; remaining: Card[] } {
	const hands: Card[][] = Array.from({ length: nbPlayers }, () => [])
	const remaining = [...deck]
	for (let i = 0; i < countPerPlayer; i++) {
		for (let p = 0; p < nbPlayers; p++) {
			const card = remaining.shift()
			if (!card) break
			hands[p].push(card)
		}
	}
	return { hands, remaining }
}

/** Removes and returns the top card of a deck. Returns null if empty. */
export function drawCard(deck: Card[]): { card: Card; remaining: Card[] } | null {
	if (deck.length === 0) return null
	const [card, ...remaining] = deck
	return { card, remaining }
}

/** Returns the top card without removing it. Returns null if empty. */
export function topCard(pile: Card[]): Card | null {
	return pile.length > 0 ? pile[pile.length - 1] : null
}
