import { describe, expect, it } from 'vitest'
import { createCard } from '$lib/engine/cards'
import { createZone } from '$lib/engine/zones'
import { type FightState, fight } from './fight'

const PLAYERS = ['p1', 'p2', 'p3']

function setup() {
	return fight.setup(PLAYERS)
}

function makeState(overrides: Partial<FightState> = {}): FightState {
	const base = setup()
	return { ...base, ...overrides }
}

describe('fight.setup', () => {
	it('all players are active', () => {
		const state = setup()
		expect(state.activePlayers).toEqual(PLAYERS)
	})

	it('each player has a shield card', () => {
		const state = setup()
		PLAYERS.forEach((p) => {
			expect(state.zones[`shield_${p}`].cards).toHaveLength(1)
		})
	})

	it('each player has hp > 0', () => {
		const state = setup()
		PLAYERS.forEach((p) => expect(state.hp[p]).toBeGreaterThan(0))
	})

	it('draw pile is non-empty', () => {
		const state = setup()
		expect(state.zones.draw.cards.length).toBeGreaterThan(0)
	})

	it('starts in playing phase', () => {
		expect(setup().phase).toBe('playing')
	})
})

describe('fight.getValidActions', () => {
	it('active player can ATTACK, CHANGE_SHIELD, and CHARGE', () => {
		const state = setup()
		const pid = state.turnPlayerId
		const actions = fight.getValidActions(state, pid)
		const types = new Set(actions.map((a) => a.type))
		expect(types.has('ATTACK')).toBe(true)
		expect(types.has('CHANGE_SHIELD')).toBe(true)
		expect(types.has('CHARGE')).toBe(true)
	})

	it('inactive player gets no actions', () => {
		const state = setup()
		const other = PLAYERS.find((p) => p !== state.turnPlayerId)!
		expect(fight.getValidActions(state, other)).toHaveLength(0)
	})

	it('no actions in gameover phase', () => {
		const state = makeState({ phase: 'gameover' })
		PLAYERS.forEach((p) => expect(fight.getValidActions(state, p)).toHaveLength(0))
	})

	it('cannot CHARGE if charge zone already has a card', () => {
		const base = setup()
		const pid = base.turnPlayerId
		const charged = makeState({
			zones: {
				...base.zones,
				[`charge_${pid}`]: createZone(`charge_${pid}`, 'hidden', [createCard('5')], pid)
			}
		})
		const actions = fight.getValidActions(charged, pid)
		expect(actions.some((a) => a.type === 'CHARGE')).toBe(false)
	})

	it('ATTACK targets only opponents', () => {
		const state = setup()
		const pid = state.turnPlayerId
		const attacks = fight.getValidActions(state, pid).filter((a) => a.type === 'ATTACK')
		const targets = attacks.map((a) => (a.payload as { targetId: string }).targetId)
		expect(targets).not.toContain(pid)
		expect(targets).toHaveLength(PLAYERS.length - 1)
	})
})

describe('fight.applyAction CHARGE', () => {
	it('puts a hidden card in charge zone', () => {
		const state = setup()
		const pid = state.turnPlayerId
		const next = fight.applyAction(state, { type: 'CHARGE', playerId: pid })
		expect(next.zones[`charge_${pid}`].cards).toHaveLength(1)
		expect(next.zones[`charge_${pid}`].cards[0].isHidden).toBe(true)
	})

	it('advances to next player', () => {
		const state = setup()
		const pid = state.turnPlayerId
		const next = fight.applyAction(state, { type: 'CHARGE', playerId: pid })
		expect(next.turnPlayerId).not.toBe(pid)
	})
})

describe('fight.applyAction CHANGE_SHIELD', () => {
	it('replaces target shield with drawn card', () => {
		const state = setup()
		const pid = state.turnPlayerId
		const target = PLAYERS.find((p) => p !== pid)!
		const oldShield = state.zones[`shield_${target}`].cards[0]
		const next = fight.applyAction(state, {
			type: 'CHANGE_SHIELD',
			playerId: pid,
			payload: { targetId: target }
		})
		expect(next.zones[`shield_${target}`].cards[0].id).not.toBe(oldShield.id)
		expect(next.zones.discard.cards.some((c) => c.id === oldShield.id)).toBe(true)
	})
})

describe('fight.applyAction ATTACK', () => {
	it('deals damage that exceeds shield', () => {
		const base = setup()
		const pid = base.turnPlayerId
		const target = base.activePlayers.find((p) => p !== pid)!

		// Force a high draw card and low shield on target
		const highCard = createCard('K', 'spades') // value 13
		const lowShield = createCard('2', 'hearts') // value 2
		const state: FightState = {
			...base,
			zones: {
				...base.zones,
				draw: createZone('draw', 'hidden', [highCard, ...base.zones.draw.cards.slice(1)]),
				[`shield_${target}`]: createZone(`shield_${target}`, 'public', [lowShield], target)
			}
		}

		const prevHp = state.hp[target]
		const next = fight.applyAction(state, {
			type: 'ATTACK',
			playerId: pid,
			payload: { targetId: target }
		})
		// damage = 13 - 2 = 11
		expect(next.hp[target]).toBe(Math.max(0, prevHp - 11))
	})

	it('no damage if attack <= shield', () => {
		const base = setup()
		const pid = base.turnPlayerId
		const target = base.activePlayers.find((p) => p !== pid)!

		const lowCard = createCard('2', 'spades') // value 2
		const highShield = createCard('K', 'hearts') // value 13
		const state: FightState = {
			...base,
			zones: {
				...base.zones,
				draw: createZone('draw', 'hidden', [lowCard, ...base.zones.draw.cards.slice(1)]),
				[`shield_${target}`]: createZone(`shield_${target}`, 'public', [highShield], target)
			}
		}

		const prevHp = state.hp[target]
		const next = fight.applyAction(state, {
			type: 'ATTACK',
			playerId: pid,
			payload: { targetId: target }
		})
		expect(next.hp[target]).toBe(prevHp)
	})
})

describe('fight.isOver / getWinner', () => {
	it('isOver false during playing', () => {
		expect(fight.isOver(setup())).toBe(false)
	})

	it('isOver true in gameover', () => {
		expect(fight.isOver(makeState({ phase: 'gameover' }))).toBe(true)
	})

	it('getWinner returns last active player', () => {
		const state = makeState({ phase: 'gameover', activePlayers: ['p2'] })
		expect(fight.getWinner(state)).toBe('p2')
	})

	it('getWinner returns null if not gameover', () => {
		expect(fight.getWinner(setup())).toBeNull()
	})
})

describe('fight.onPlayerDisconnect', () => {
	it('removes disconnected player from activePlayers and players', () => {
		const state = setup()
		const next = fight.onPlayerDisconnect!(state, 'p3')
		expect(next.activePlayers).not.toContain('p3')
		expect(next.players).not.toContain('p3')
	})

	it('ends game when only 1 active player remains after disconnect', () => {
		const state = makeState({ activePlayers: ['p1', 'p2'] })
		const next = fight.onPlayerDisconnect!(state, 'p2')
		expect(next.phase).toBe('gameover')
	})
})
