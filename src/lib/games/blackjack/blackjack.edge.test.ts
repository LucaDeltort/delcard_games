import { describe, expect, it } from 'vitest'
import { blackjack } from './blackjack'

const P1 = 'p1'
const P2 = 'p2'

function setup(players = [P1, P2]) {
	return blackjack.setup(players) as any
}

const disconnect = (s: any, pId: string) => blackjack.onPlayerDisconnect!(s, pId)

describe('Blackjack — edge cases (#70)', () => {
	describe('onPlayerDisconnect', () => {
		it('removes player and their zones cleanly', () => {
			const s = setup([P1, P2])
			s.phase = 'playing'
			s.turnPlayerId = P1

			const r = disconnect(s, P2) as any

			expect(r.players).toEqual([P1])
		})

		it('ends game when all players disconnect', () => {
			const s = setup([P1, P2])
			s.phase = 'playing'
			s.turnPlayerId = P1

			let r = disconnect(s, P1) as any
			r = disconnect(r, P2) as any

			expect(r.phase).toBe('gameover')
		})

		it('advances turn to next playing player if current disconnects', () => {
			const s = setup([P1, P2]) as any
			s.phase = 'playing'
			s.turnPlayerId = P1
			s.playerStatus = { p1: 'playing', p2: 'playing' }

			const r = disconnect(s, P1) as any

			expect(r.turnPlayerId).toBe(P2)
		})
	})

	describe('getWinner', () => {
		it('returns null during playing phase', () => {
			const s = setup() as any
			s.phase = 'playing'
			expect(blackjack.getWinner(s)).toBeNull()
		})

		it('declares player winner when dealer busts and player did not', () => {
			const s = setup([P1, P2]) as any
			s.phase = 'gameover'
			s.zones['hand_dealer'] = {
				cards: [
					{ face: 'K', suit: 'spades' },
					{ face: '9', suit: 'hearts' },
					{ face: '8', suit: 'clubs' }
				]
			}
			s.zones[`hand_${P1}`] = {
				cards: [
					{ face: 'K', suit: 'diamonds' },
					{ face: '10', suit: 'clubs' }
				]
			}
			s.zones[`hand_${P2}`] = {
				cards: [
					{ face: '9', suit: 'diamonds' },
					{ face: '9', suit: 'clubs' }
				]
			}
			s.playerStatus = { p1: 'stand', p2: 'stand' }
			s.splitStatus = {}

			expect(blackjack.getWinner(s)).toBe(P1)
		})

		it('returns null when everyone busts', () => {
			const s = setup([P1]) as any
			s.phase = 'gameover'
			s.zones['hand_dealer'] = {
				cards: [
					{ face: 'K', suit: 'spades' },
					{ face: '9', suit: 'hearts' },
					{ face: '8', suit: 'clubs' }
				]
			}
			s.zones[`hand_${P1}`] = {
				cards: [
					{ face: 'K', suit: 'diamonds' },
					{ face: '6', suit: 'clubs' },
					{ face: '7', suit: 'hearts' }
				]
			}
			s.playerStatus = { p1: 'bust' }
			s.splitStatus = {}

			expect(blackjack.getWinner(s)).toBeNull()
		})

		it('betting mode: richest player wins', () => {
			const s = setup([P1, P2]) as any
			s.phase = 'gameover'
			s.options = { betting: true }
			s.coins = { p1: 500, p2: 200 }

			expect(blackjack.getWinner(s)).toBe(P1)
		})
	})
})
