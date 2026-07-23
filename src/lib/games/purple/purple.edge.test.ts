import { describe, expect, it } from 'vitest'
import type { Action } from '$lib/engine'
import { type PurpleState, purple } from './purple'

function setupGame(players = ['p1', 'p2'], options?: Record<string, unknown>): PurpleState {
	return purple.setup!(players, options) as PurpleState
}

function applyActions(state: PurpleState, ...actions: Action[]): PurpleState {
	let s = state
	for (const a of actions) {
		s = purple.applyAction(s, a) as PurpleState
	}
	return s
}

describe('Purple — edge cases (#70)', () => {
	describe('refillDeckIfNeeded scoring bug', () => {
		it('scores ALL players penalty banks when refilling, not just turn player', () => {
			const s = setupGame(['p1', 'p2'])
			// Manually add cards to both penalty banks
			const zones = { ...s.zones }
			zones.penaltyBank_p1 = {
				...zones.penaltyBank_p1,
				cards: [{ id: 'c1' }, { id: 'c2' }] as any[]
			}
			zones.penaltyBank_p2 = {
				...zones.penaltyBank_p2,
				cards: [{ id: 'c3' }, { id: 'c4' }, { id: 'c5' }] as any[]
			}
			// Empty the deck so refill triggers
			zones.deck = { ...zones.deck, cards: [] }

			// Try BET_RED which requires 1 card → triggers refill
			const result = applyActions({ ...s, zones }, { type: 'BET_RED', playerId: 'p1' })

			// After refill, ALL penalty banks are scored (fixed in purple.ts).
			expect(result.scores.p1).toBe(2)
			expect(result.scores.p2).toBe(3)
		})
	})

	describe('endTurnOnEmptyDeck option', () => {
		it('passes turn to next player and resets bets when deck empty after refill', () => {
			const s = setupGame(['p1', 'p2'], { endTurnOnEmptyDeck: true })
			// Empty deck + no penalty cards → can't refill → end turn
			const zones = { ...s.zones }
			zones.deck = { ...zones.deck, cards: [] }

			const result = applyActions({ ...s, zones }, { type: 'BET_RED', playerId: 'p1' })

			// With endTurnOnEmptyDeck=true, turn passes to p2 and phase goes back to betting
			expect(result.turnPlayerId).toBe('p2')
			expect(result.phase).toBe('betting')
			expect(result.turnBets).toBe(0)
		})

		it('does NOT pass turn when endTurnOnEmptyDeck=false', () => {
			const s = setupGame(['p1', 'p2'], { endTurnOnEmptyDeck: false })
			const zones = { ...s.zones }
			zones.deck = { ...zones.deck, cards: [] }

			const result = applyActions({ ...s, zones }, { type: 'BET_RED', playerId: 'p1' })

			// Turn stays with p1 since refill didn't trigger end-of-turn
			expect(result.turnPlayerId).toBe('p1')
		})
	})

	describe('tie-break in getWinner', () => {
		it('returns one player among tied lowest scores', () => {
			const base = setupGame(['p1', 'p2', 'p3'])
			base.scores = { p1: 10, p2: 10, p3: 15 }
			base.options.endScore = 10

			const winner = purple.getWinner(base)
			expect(winner).toBeTruthy()
			// Winner should be either p1 or p2 (both have 10, lower than p3's 15)
			expect(['p1', 'p2']).toContain(winner)
		})
	})

	describe('STOP action reset behavior', () => {
		it('clears playing bank along with penalty banks', () => {
			const s = setupGame(['p1', 'p2'])
			s.turnBets = 3 // eligible for STOP

			// Add cards to playing bank
			const zones = { ...s.zones }
			zones.playingBank = { ...zones.playingBank, cards: [{ id: 'x1' }, { id: 'x2' }] as any[] }
			zones.penaltyBank_p1 = { ...zones.penaltyBank_p1, cards: [{ id: 'y1' }] as any[] }

			const result = applyActions({ ...s, zones }, { type: 'STOP', playerId: 'p1' })

			// Playing bank should be cleared
			expect(result.zones.playingBank.cards.length).toBe(0)
			// All penalty banks should be cleared
			expect(result.zones.penaltyBank_p1.cards.length).toBe(0)
			// Score updated
			expect(result.scores.p1).toBe(1)
			// New round starts with fresh deck
			expect(result.zones.deck.cards.length).toBe(52)
		})
	})

	describe('all colors played (deck exhaustion + STOP)', () => {
		it('game ends when someone reaches endScore via STOP', () => {
			const s = setupGame(['p1', 'p2'], { endScore: 5 })
			s.scores = { p1: 4, p2: 0 }
			// Give p1 enough penalty cards to reach endScore
			const zones = { ...s.zones }
			zones.penaltyBank_p1 = {
				...zones.penaltyBank_p1,
				cards: Array.from({ length: 5 }, (_, i) => ({ id: `pc${i}` })) as any[]
			}
			s.turnBets = 3

			const result = applyActions({ ...s, zones }, { type: 'STOP', playerId: 'p1' })

			expect(purple.isOver!(result)).toBe(true)
			const w = purple.getWinner(result)
			expect(w).toBe('p2') // p2 has 0, p1 now has 9
		})
	})

	describe('onPlayerDisconnect', () => {
		it('rescues disconnected player cards back to deck', () => {
			const s = setupGame(['p1', 'p2', 'p3'])
			s.phase = 'betting'
			s.turnPlayerId = 'p1'

			const before = s.zones.deck.cards.length
			const result = purple.onPlayerDisconnect!(s, 'p2')

			expect(result!.players).toEqual(['p1', 'p3'])
			// Cards from p2's penalty bank go back to deck
			expect(result!.zones.deck.cards.length).toBeGreaterThanOrEqual(before)
			// Penalty bank zone still exists but should be empty
			expect(result!.zones.penaltyBank_p2.cards.length).toBe(0)
		})

		it('ends game if < 2 players remain', () => {
			const s = setupGame(['p1', 'p2'])
			const result = purple.onPlayerDisconnect!(s, 'p2')

			expect(result!.phase).toBe('gameover')
		})
	})
})
