import { describe, expect, it } from 'vitest'
import { createCard, deal, drawCard, shuffle, topCard } from './cards'

describe('createCard', () => {
	it('sets face and suit', () => {
		const c = createCard('A', 'spades')
		expect(c.face).toBe('A')
		expect(c.suit).toBe('spades')
		expect(c.isHidden).toBe(false)
	})

	it('omits suit when not provided', () => {
		const c = createCard('Joker')
		expect(c.suit).toBeUndefined()
	})

	it('respects isHidden flag', () => {
		const c = createCard('K', 'hearts', true)
		expect(c.isHidden).toBe(true)
	})

	it('generates unique ids', () => {
		const ids = Array.from({ length: 100 }, () => createCard('A').id)
		expect(new Set(ids).size).toBe(100)
	})
})

describe('shuffle', () => {
	it('preserves length', () => {
		const cards = Array.from({ length: 52 }, (_, i) => createCard(String(i)))
		expect(shuffle(cards)).toHaveLength(52)
	})

	it('preserves all elements', () => {
		const cards = Array.from({ length: 52 }, (_, i) => createCard(String(i)))
		const result = shuffle(cards)
		expect(result.map((c) => c.face).sort()).toEqual(cards.map((c) => c.face).sort())
	})

	it('does not mutate input', () => {
		const cards = [createCard('A'), createCard('B'), createCard('C')]
		const original = [...cards]
		shuffle(cards)
		expect(cards.map((c) => c.face)).toEqual(original.map((c) => c.face))
	})
})

describe('deal', () => {
	it('deals correct count per player', () => {
		const deck = Array.from({ length: 52 }, (_, i) => createCard(String(i)))
		const { hands } = deal(deck, 5, 4)
		expect(hands).toHaveLength(4)
		hands.forEach((h) => expect(h).toHaveLength(5))
	})

	it('distributes round-robin (first player gets first card)', () => {
		const deck = [createCard('1'), createCard('2'), createCard('3'), createCard('4')]
		const { hands } = deal(deck, 2, 2)
		expect(hands[0][0].face).toBe('1')
		expect(hands[1][0].face).toBe('2')
		expect(hands[0][1].face).toBe('3')
		expect(hands[1][1].face).toBe('4')
	})

	it('remaining contains leftover cards', () => {
		const deck = Array.from({ length: 52 }, (_, i) => createCard(String(i)))
		const { remaining } = deal(deck, 5, 4)
		expect(remaining).toHaveLength(52 - 5 * 4)
	})

	it('no card appears twice across all hands', () => {
		const deck = Array.from({ length: 52 }, (_, i) => createCard(String(i)))
		const { hands } = deal(deck, 13, 4)
		const allIds = hands.flatMap((h) => h.map((c) => c.id))
		expect(new Set(allIds).size).toBe(allIds.length)
	})
})

describe('drawCard', () => {
	it('returns null on empty deck', () => {
		expect(drawCard([])).toBeNull()
	})

	it('returns the top (first) card', () => {
		const cards = [createCard('A'), createCard('K')]
		const result = drawCard(cards)
		expect(result?.card.face).toBe('A')
	})

	it('remaining excludes the drawn card', () => {
		const cards = [createCard('A'), createCard('K')]
		const result = drawCard(cards)
		expect(result?.remaining).toHaveLength(1)
		expect(result?.remaining[0].face).toBe('K')
	})
})

describe('topCard', () => {
	it('returns null on empty pile', () => {
		expect(topCard([])).toBeNull()
	})

	it('returns the last card without removing it', () => {
		const pile = [createCard('2'), createCard('A')]
		expect(topCard(pile)?.face).toBe('A')
		expect(pile).toHaveLength(2)
	})
})
