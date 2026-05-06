import { describe, expect, it } from 'vitest'
import { nextPlayer } from './game'

describe('nextPlayer', () => {
	const players = ['p1', 'p2', 'p3']

	it('returns next player in list', () => {
		expect(nextPlayer(players, 'p1')).toBe('p2')
		expect(nextPlayer(players, 'p2')).toBe('p3')
	})

	it('wraps around to first player', () => {
		expect(nextPlayer(players, 'p3')).toBe('p1')
	})

	it('falls back to index 0 for unknown id', () => {
		expect(nextPlayer(players, 'unknown')).toBe('p1')
	})
})
