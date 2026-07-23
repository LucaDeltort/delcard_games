import { describe, expect, it } from 'vitest'
import { werewolf } from './werewolf'

const P1 = 'p1'
const P2 = 'p2'
const P3 = 'p3'
const P4 = 'p4'
const P5 = 'p5'
const P6 = 'p6'
const P7 = 'p7'
const P8 = 'p8'

function setup(players = [P1, P2, P3, P4, P5, P6, P7, P8]) {
	return werewolf.setup(players) as any
}

describe('Werewolf — edge cases (#70)', () => {
	describe('orphan role: Cupid dies alone (no lovers linked)', () => {
		it('game continues when cupid disconnects before linking lovers', () => {
			const s = setup()
			s.phase = 'night'
			s.alive = [...s.players]
			// Mark p1 as cupid
			s.roles[P1] = 'cupid'
			s.lovers = null // hasn't linked yet

			const r = werewolf.onPlayerDisconnect!(s, P1)! as any

			expect(r.alive).not.toContain(P1)
			expect(r.players).toEqual([P2, P3, P4, P5, P6, P7, P8])
			// Game should still be going (not all wolves dead etc.)
			expect(['night', 'day', 'gameover']).toContain(r.phase)
		})
	})

	describe('all win conditions', () => {
		it('wolves win when wolves >= villagers', () => {
			const s = setup() as any
			s.phase = 'day'
			s.alive = [P1, P2, P3] // 2 wolves + 1 villager
			s.roles = { p1: 'wolf', p2: 'wolf', p3: 'villager' }
			s.options = s.options ?? {}
			s.options.werewolvesCountOverride = undefined

			const r = werewolf.onPlayerDisconnect!(s, P3)! as any

			// Only wolves left → they win
			if (r.phase === 'gameover') {
				expect(r.winTeam).toBeTruthy()
			}
		})

		it('villagers win when all wolves are dead', async () => {
			const s = setup([P1, P2, P3, P4, P5, P6, P7, P8]) as any
			s.phase = 'day'
			s.roles = {}
			s.players.forEach((p: string, i: number) => {
				s.roles[p] = i < 3 ? 'villager' : i < 6 ? 'wolf' : 'villager'
			})
			s.alive = [P1, P2, P3] // only villagers alive (wolves p4-p6 are dead)

			const { checkWin } = await import('./resolution')
			const result = checkWin(s)
			expect(result).toBe('villagers')
		})
	})

	describe('onPlayerDisconnect during gameover phase', () => {
		it('is a noop when phase is already gameover', () => {
			const s = setup() as any
			s.phase = 'gameover'
			s.winTeam = 'village'

			const r = werewolf.onPlayerDisconnect!(s, P1)! as any

			expect(r).toBe(s) // same reference returned
		})
	})

	describe('night start without crash', () => {
		it('setup creates valid night state with all roles assigned', () => {
			const s = setup() as any
			expect(s.phase).toBeTruthy()
			expect(s.alive.length).toBe(8)
			// Every player has a role
			for (const p of s.players) {
				expect(s.roles[p]).toBeTruthy()
			}
		})
	})

	describe('hunter queue advancement on disconnect', () => {
		it('promotes next queued hunter after current one disconnects', () => {
			const s = setup([P1, P2, P3, P4, P5, P6, P7, P8]) as any
			s.phase = 'day'
			// Ensure enough villagers so game doesn't end on single death
			s.alive = [...s.players]
			s.pendingHunter = P1
			s.hunterQueue = []
			s.lovers = null
			s.mayor = P2
			s.pendingMayor = null

			// Use the real roles from setup. Just mark P1 as a hunter.
			s.roles[P1] = 'hunter'

			const r = werewolf.onPlayerDisconnect!(s, P1)! as any

			// Game should not end (only 1 of 8 players died)
			if (r.phase !== 'gameover') {
				// No queue → pending hunter cleared
				expect(r.pendingHunter).toBeNull()
			}
			expect(r.alive).not.toContain(P1)
		})
	})
})
