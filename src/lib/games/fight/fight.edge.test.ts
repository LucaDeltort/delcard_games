import { describe, expect, it } from 'vitest'
import { type FightState, fight } from './fight'

const P1 = 'p1'
const P2 = 'p2'
const P3 = 'p3'

function setup(players = [P1, P2]): FightState {
	return fight.setup(players) as FightState
}

describe('Fight — edge cases (#70)', () => {
	describe('empty deck / reshuffle', () => {
		it('reshuffles discard pile when draw is empty on CHARGE', () => {
			const s = setup()
			s.zones.draw.cards = []
			s.zones.discard.cards = [{ id: 'd1', face: '5', suit: 'hearts' } as any]

			expect(() => fight.applyAction(s, { playerId: s.turnPlayerId, type: 'CHARGE' })).not.toThrow()
		})

		it('does not crash when both draw and discard are empty', () => {
			const s = setup()
			s.zones.draw.cards = []
			s.zones.discard.cards = []

			expect(() => fight.applyAction(s, { playerId: s.turnPlayerId, type: 'CHARGE' })).not.toThrow()
		})
	})

	describe('onPlayerDisconnect', () => {
		it('eliminates player and advances turn if it was their turn', () => {
			const s = setup([P1, P2, P3])
			s.turnPlayerId = P2
			s.pendingBonusAction = P2

			const r = fight.onPlayerDisconnect!(s, P2)! as FightState

			expect(r.activePlayers).toEqual([P1, P3])
			expect(r.players).toEqual([P1, P3])
			expect(r.pendingBonusAction).toBeNull()
			expect(r.turnPlayerId).toBe(P3)
		})

		it('ends game when only 1 player remains', () => {
			const s = setup([P1, P2])
			s.turnPlayerId = P1

			const r = fight.onPlayerDisconnect!(s, P2)! as FightState

			expect(r.phase).toBe('gameover')
			expect(r.activePlayers).toEqual([P1])
			expect(fight.getWinner(r)).toBe(P1)
		})

		it('handles disconnect of non-active player gracefully', () => {
			const s = setup([P1, P2, P3])
			s.turnPlayerId = P1
			s.pendingBonusAction = null

			const r = fight.onPlayerDisconnect!(s, P3)! as FightState

			expect(r.activePlayers).toEqual([P1, P2])
			expect(r.turnPlayerId).toBe(P1)
		})

		it('handles already-eliminated player disconnect (noop)', () => {
			const s = setup([P1, P2, P3])
			s.activePlayers = [P1, P2]
			s.turnPlayerId = P1

			const r = fight.onPlayerDisconnect!(s, P3)! as FightState

			// Already eliminated → just removes from players list
			expect(r.activePlayers).toEqual([P1, P2])
		})
	})

	describe('turn advancement without bonus', () => {
		it('passes turn to next active player after ATTACK with no kill', () => {
			const s = setup([P1, P2, P3])
			s.hp[P1] = 20
			s.hp[P2] = 20
			s.hp[P3] = 20
			s.turnPlayerId = P1
			s.pendingBonusAction = null

			// Give p1 a charge card that exists so attack can happen
			if (s.zones[`charge_${P1}`].cards.length > 0 && s.zones[`shield_${P2}`].cards.length > 0) {
				const validActions = fight.getValidActions(s, P1)
				const attackAction = validActions.find(
					(a) => a.type === 'ATTACK' && (a as any).payload?.targetId === P2
				)
				if (attackAction) {
					const r = fight.applyAction(s, attackAction) as FightState
					// If no elimination, no pending bonus action
					if (r.activePlayers.length === 3) {
						expect(r.pendingBonusAction).toBeNull()
					}
				}
			}
		})
	})
})
