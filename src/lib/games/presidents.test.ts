import { describe, expect, it } from 'vitest'
import { createCard } from '$lib/engine/cards'
import { createZone } from '$lib/engine/zones'
import type { PresidentsState } from './presidents'
import { presidents } from './presidents'

const P1 = 'p1'
const P2 = 'p2'
const P3 = 'p3'
const PLAYERS = [P1, P2, P3]

function setup() {
	return presidents.setup(PLAYERS)
}

function makeState(overrides: Partial<PresidentsState>): PresidentsState {
	const base = setup()
	return { ...base, ...overrides }
}

// Build a minimal 3-player state with controlled hands and known starter
function buildState(
	hands: { pid: string; cards: ReturnType<typeof createCard>[] }[],
	overrides: Partial<PresidentsState> = {}
): PresidentsState {
	const base = setup()
	const zones: PresidentsState['zones'] = { ...base.zones, pile: createZone('pile', 'public', []) }
	for (const { pid, cards } of hands) {
		zones[`hand_${pid}`] = createZone(`hand_${pid}`, 'fan', cards, pid)
	}
	return {
		...base,
		zones,
		turnPlayerId: hands[0].pid,
		trickLeaderId: hands[0].pid,
		activePlayers: hands.map((h) => h.pid),
		lastPlay: null,
		passedThisTrick: [],
		...overrides
	}
}

describe('presidents.setup', () => {
	it('distributes all 52 cards', () => {
		const state = setup()
		const total = PLAYERS.reduce((sum, p) => sum + (state.zones[`hand_${p}`]?.cards.length ?? 0), 0)
		expect(total).toBe(52)
	})

	it('starts in playing phase', () => {
		expect(setup().phase).toBe('playing')
	})

	it('activePlayers = all players', () => {
		const state = setup()
		expect(state.activePlayers).toEqual(PLAYERS)
	})

	it('finishOrder is empty', () => {
		expect(setup().finishOrder).toHaveLength(0)
	})

	it('lastPlay is null', () => {
		expect(setup().lastPlay).toBeNull()
	})

	it('no card duplicated across hands', () => {
		const state = setup()
		const allIds = PLAYERS.flatMap((p) => state.zones[`hand_${p}`].cards.map((c) => c.id))
		expect(new Set(allIds).size).toBe(allIds.length)
	})

	it('pile zone exists and is empty', () => {
		const state = setup()
		expect(state.zones.pile).toBeDefined()
		expect(state.zones.pile.cards).toHaveLength(0)
	})

	it('Q♥ holder starts', () => {
		const state = setup()
		const starter = state.turnPlayerId
		const hand = state.zones[`hand_${starter}`]
		expect(hand.cards.some((c) => c.face === 'Q' && c.suit === 'hearts')).toBe(true)
	})
})

describe('presidents.getValidActions', () => {
	it('returns empty for wrong player', () => {
		const state = buildState([
			{ pid: P1, cards: [createCard('5', 'spades')] },
			{ pid: P2, cards: [createCard('7', 'hearts')] },
			{ pid: P3, cards: [createCard('9', 'clubs')] }
		])
		expect(presidents.getValidActions(state, P2)).toHaveLength(0)
		expect(presidents.getValidActions(state, P3)).toHaveLength(0)
	})

	it('returns empty in gameover phase', () => {
		const state = makeState({ phase: 'gameover' })
		PLAYERS.forEach((p) => expect(presidents.getValidActions(state, p)).toHaveLength(0))
	})

	it('returns empty for finished player', () => {
		const state = buildState(
			[
				{ pid: P1, cards: [createCard('5', 'spades')] },
				{ pid: P2, cards: [createCard('7', 'hearts')] },
				{ pid: P3, cards: [createCard('9', 'clubs')] }
			],
			{ activePlayers: [P1, P3] }
		)
		expect(presidents.getValidActions(state, P2)).toHaveLength(0)
	})

	it('no PASS when leading (lastPlay null)', () => {
		const state = buildState([
			{ pid: P1, cards: [createCard('5', 'spades')] },
			{ pid: P2, cards: [createCard('7', 'hearts')] },
			{ pid: P3, cards: [createCard('9', 'clubs')] }
		])
		const actions = presidents.getValidActions(state, P1)
		expect(actions.every((a) => a.type !== 'PASS')).toBe(true)
	})

	it('PASS available when lastPlay exists', () => {
		const card = createCard('5', 'spades')
		const state = buildState(
			[
				{ pid: P1, cards: [createCard('3', 'hearts')] },
				{ pid: P2, cards: [card] },
				{ pid: P3, cards: [createCard('9', 'clubs')] }
			],
			{
				turnPlayerId: P2,
				lastPlay: { playerId: P1, comboType: 'single', value: 10 }
			}
		)
		const actions = presidents.getValidActions(state, P2)
		expect(actions.some((a) => a.type === 'PASS')).toBe(true)
	})

	it('only returns combos that beat lastPlay', () => {
		const low = createCard('3', 'hearts')
		const high = createCard('K', 'spades')
		const state = buildState(
			[
				{ pid: P1, cards: [createCard('5', 'clubs')] },
				{ pid: P2, cards: [low, high] },
				{ pid: P3, cards: [createCard('9', 'diamonds')] }
			],
			{
				turnPlayerId: P2,
				lastPlay: { playerId: P1, comboType: 'single', value: 8 }
			}
		)
		const actions = presidents.getValidActions(state, P2).filter((a) => a.type === 'PLAY')
		const cardIds = actions.flatMap((a) => (a.payload as { cardIds: string[] }).cardIds)
		expect(cardIds).toContain(high.id)
		expect(cardIds).not.toContain(low.id)
	})

	it('quad beats any non-quad', () => {
		const quads = ['hearts', 'diamonds', 'clubs', 'spades'].map((s) => createCard('3', s))
		const state = buildState(
			[
				{ pid: P1, cards: [createCard('A', 'hearts')] },
				{ pid: P2, cards: quads },
				{ pid: P3, cards: [createCard('9', 'diamonds')] }
			],
			{
				turnPlayerId: P2,
				lastPlay: { playerId: P1, comboType: 'single', value: 14 }
			}
		)
		const playActions = presidents.getValidActions(state, P2).filter((a) => a.type === 'PLAY')
		expect(playActions.some((a) => (a.payload as { cardIds: string[] }).cardIds.length === 4)).toBe(
			true
		)
	})
})

describe('presidents.applyAction PLAY', () => {
	it('moves cards from hand to pile', () => {
		const card = createCard('7', 'spades')
		const state = buildState([
			{ pid: P1, cards: [card, createCard('5', 'hearts')] },
			{ pid: P2, cards: [createCard('9', 'diamonds')] },
			{ pid: P3, cards: [createCard('K', 'clubs')] }
		])
		const next = presidents.applyAction(state, {
			type: 'PLAY',
			playerId: P1,
			payload: { cardIds: [card.id] }
		})
		expect(next.zones.pile.cards).toHaveLength(1)
		expect(next.zones.pile.cards[0].id).toBe(card.id)
		expect(next.zones[`hand_${P1}`].cards).toHaveLength(1)
	})

	it('advances turn to next active player', () => {
		const card = createCard('7', 'spades')
		const state = buildState([
			{ pid: P1, cards: [card] },
			{ pid: P2, cards: [createCard('9', 'diamonds')] },
			{ pid: P3, cards: [createCard('K', 'clubs')] }
		])
		const next = presidents.applyAction(state, {
			type: 'PLAY',
			playerId: P1,
			payload: { cardIds: [card.id] }
		})
		expect(next.turnPlayerId).toBe(P2)
	})

	it('clears passedThisTrick on play', () => {
		const card = createCard('7', 'spades')
		const state = buildState(
			[
				{ pid: P1, cards: [card] },
				{ pid: P2, cards: [createCard('9', 'diamonds')] },
				{ pid: P3, cards: [createCard('K', 'clubs')] }
			],
			{ passedThisTrick: [P3], lastPlay: null, turnPlayerId: P1 }
		)
		const next = presidents.applyAction(state, {
			type: 'PLAY',
			playerId: P1,
			payload: { cardIds: [card.id] }
		})
		expect(next.passedThisTrick).toHaveLength(0)
	})

	it('player enters finishOrder when hand empties', () => {
		const card = createCard('7', 'spades')
		const state = buildState([
			{ pid: P1, cards: [card] },
			{ pid: P2, cards: [createCard('9', 'diamonds')] },
			{ pid: P3, cards: [createCard('K', 'clubs')] }
		])
		const next = presidents.applyAction(state, {
			type: 'PLAY',
			playerId: P1,
			payload: { cardIds: [card.id] }
		})
		expect(next.finishOrder).toContain(P1)
		expect(next.activePlayers).not.toContain(P1)
	})

	it('gameover when activePlayers drops to 1', () => {
		const c1 = createCard('7', 'spades')
		const state = buildState(
			[
				{ pid: P1, cards: [c1] },
				{ pid: P2, cards: [createCard('K', 'diamonds')] }
			],
			{ activePlayers: [P1, P2] }
		)
		const next = presidents.applyAction(state, {
			type: 'PLAY',
			playerId: P1,
			payload: { cardIds: [c1.id] }
		})
		expect(next.phase).toBe('gameover')
	})

	it('rejects invalid combo (different faces)', () => {
		const c1 = createCard('7', 'spades')
		const c2 = createCard('8', 'hearts')
		const state = buildState([
			{ pid: P1, cards: [c1, c2] },
			{ pid: P2, cards: [createCard('9', 'diamonds')] },
			{ pid: P3, cards: [createCard('K', 'clubs')] }
		])
		const unchanged = presidents.applyAction(state, {
			type: 'PLAY',
			playerId: P1,
			payload: { cardIds: [c1.id, c2.id] }
		})
		expect(unchanged).toBe(state)
	})

	it('does not mutate input state', () => {
		const card = createCard('7', 'spades')
		const state = buildState([
			{ pid: P1, cards: [card] },
			{ pid: P2, cards: [createCard('9', 'diamonds')] },
			{ pid: P3, cards: [createCard('K', 'clubs')] }
		])
		const frozen = Object.freeze({ ...state })
		expect(() =>
			presidents.applyAction(frozen, {
				type: 'PLAY',
				playerId: P1,
				payload: { cardIds: [card.id] }
			})
		).not.toThrow()
	})
})

describe('presidents.applyAction PASS', () => {
	it('advances turn on pass', () => {
		const state = buildState(
			[
				{ pid: P1, cards: [createCard('3', 'hearts')] },
				{ pid: P2, cards: [createCard('5', 'spades')] },
				{ pid: P3, cards: [createCard('9', 'clubs')] }
			],
			{
				turnPlayerId: P2,
				lastPlay: { playerId: P1, comboType: 'single', value: 10 }
			}
		)
		const next = presidents.applyAction(state, { type: 'PASS', playerId: P2 })
		expect(next.turnPlayerId).toBe(P3)
		expect(next.passedThisTrick).toContain(P2)
	})

	it('new trick when all others pass', () => {
		const state = buildState(
			[
				{ pid: P1, cards: [createCard('K', 'hearts')] },
				{ pid: P2, cards: [createCard('5', 'spades')] },
				{ pid: P3, cards: [createCard('9', 'clubs')] }
			],
			{
				turnPlayerId: P3,
				trickLeaderId: P1,
				lastPlay: { playerId: P1, comboType: 'single', value: 13 },
				passedThisTrick: [P2]
			}
		)
		// P3 passes — all others have passed, leader gets another chance
		const after = presidents.applyAction(state, { type: 'PASS', playerId: P3 })
		expect(after.turnPlayerId).toBe(P1)
		expect(after.leaderCanPlay).toBe(true)
		expect(after.lastPlay).not.toBeNull()

		// Leader passes → trick finally ends
		const next = presidents.applyAction(after, { type: 'PASS', playerId: P1 })
		expect(next.lastPlay).toBeNull()
		expect(next.passedThisTrick).toHaveLength(0)
		expect(next.leaderCanPlay).toBe(false)
		expect(next.zones.pile.cards).toHaveLength(0)
	})

	it('no-op when leading (lastPlay null)', () => {
		const state = buildState([
			{ pid: P1, cards: [createCard('5', 'spades')] },
			{ pid: P2, cards: [createCard('7', 'hearts')] },
			{ pid: P3, cards: [createCard('9', 'clubs')] }
		])
		const unchanged = presidents.applyAction(state, { type: 'PASS', playerId: P1 })
		expect(unchanged).toBe(state)
	})
})

describe('presidents.isOver / getWinner', () => {
	it('isOver false during playing', () => {
		expect(presidents.isOver(setup())).toBe(false)
	})

	it('isOver true in gameover', () => {
		const state = makeState({ phase: 'gameover' })
		expect(presidents.isOver(state)).toBe(true)
	})

	it('getWinner null while playing', () => {
		expect(presidents.getWinner(setup())).toBeNull()
	})

	it('getWinner returns first in finishOrder', () => {
		const state = makeState({ phase: 'gameover', finishOrder: [P2, P1] })
		expect(presidents.getWinner(state)).toBe(P2)
	})

	it('getWinner null when finishOrder empty and gameover', () => {
		const state = makeState({ phase: 'gameover', finishOrder: [] })
		expect(presidents.getWinner(state)).toBeNull()
	})
})

describe('presidents.onPlayerDisconnect', () => {
	it('ends game and removes player from activePlayers', () => {
		const state = setup()
		const next = presidents.onPlayerDisconnect!(state, P2)
		expect(next.phase).toBe('gameover')
		expect(next.activePlayers).not.toContain(P2)
	})
})

describe('presidents exchange', () => {
	it('finishOrder includes loser when gameover', () => {
		const c1 = createCard('7', 'spades')
		const state = buildState(
			[
				{ pid: P1, cards: [c1] },
				{ pid: P2, cards: [createCard('K', 'diamonds')] }
			],
			{ activePlayers: [P1, P2] }
		)
		const next = presidents.applyAction(state, {
			type: 'PLAY',
			playerId: P1,
			payload: { cardIds: [c1.id] }
		})
		expect(next.finishOrder).toContain(P1)
		expect(next.finishOrder).toContain(P2)
		expect(next.finishOrder[0]).toBe(P1)
		expect(next.finishOrder[next.finishOrder.length - 1]).toBe(P2)
	})

	it('setup with prevState auto-takes scum 2 best cards for president', () => {
		// Build a fake previous state where P1=president, P3=scum
		const prevState = makeState({
			phase: 'gameover',
			finishOrder: [P1, P2, P3],
			activeGameId: 'presidents'
		})
		const next = presidents.setup(PLAYERS, { previousState: prevState })
		expect(next.phase).toBe('exchanging')
		expect(next.pendingExchange).toMatchObject({ president: P1, scum: P3, count: 2 })
		// President should have more cards than base deal (2 extra from scum)
		const presCards = next.zones[`hand_${P1}`].cards.length
		const scumCards = next.zones[`hand_${P3}`].cards.length
		// Total still 52 cards
		const total = PLAYERS.reduce((s, p) => s + next.zones[`hand_${p}`].cards.length, 0)
		expect(total).toBe(52)
		// President gained 2, scum lost 2
		const basePresCards = Math.floor(52 / 3) + 1 // 52 % 3 = 1, first player gets extra card
		const baseScumCards = Math.floor(52 / 3)
		expect(presCards).toBe(basePresCards + 2)
		expect(scumCards).toBe(baseScumCards - 2)
	})

	it('getValidActions during exchanging: only president gets GIVE_CARDS', () => {
		const prevState = makeState({
			phase: 'gameover',
			finishOrder: [P1, P2, P3],
			activeGameId: 'presidents'
		})
		const state = presidents.setup(PLAYERS, { previousState: prevState })
		expect(state.phase).toBe('exchanging')
		const p1Actions = presidents.getValidActions(state, P1)
		expect(p1Actions.every((a) => a.type === 'GIVE_CARDS')).toBe(true)
		expect(p1Actions.length).toBeGreaterThan(0)
		expect(presidents.getValidActions(state, P2)).toHaveLength(0)
		expect(presidents.getValidActions(state, P3)).toHaveLength(0)
	})

	it('applyAction GIVE_CARDS moves cards and transitions to playing', () => {
		const prevState = makeState({
			phase: 'gameover',
			finishOrder: [P1, P2, P3],
			activeGameId: 'presidents'
		})
		const state = presidents.setup(PLAYERS, { previousState: prevState })
		const actions = presidents.getValidActions(state, P1)
		const give = actions[0]
		const cardIds = (give.payload as { cardIds: string[] }).cardIds
		const next = presidents.applyAction(state, give)
		expect(next.phase).toBe('playing')
		expect(next.pendingExchange).toBeNull()
		// Cards moved from president to scum
		const presCards = next.zones[`hand_${P1}`].cards.map((c) => c.id)
		const scumCards = next.zones[`hand_${P3}`].cards.map((c) => c.id)
		for (const id of cardIds) {
			expect(presCards).not.toContain(id)
			expect(scumCards).toContain(id)
		}
	})

	it('setup without prevState starts normally (no exchange)', () => {
		const state = presidents.setup(PLAYERS)
		expect(state.phase).toBe('playing')
		expect(state.pendingExchange).toBeNull()
	})
})

describe('presidents square rule', () => {
	it('quad played alone ends trick immediately', () => {
		const quads = ['hearts', 'diamonds', 'clubs', 'spades'].map((s) => createCard('7', s))
		const state = buildState([
			{ pid: P1, cards: quads },
			{ pid: P2, cards: [createCard('9', 'diamonds')] },
			{ pid: P3, cards: [createCard('K', 'clubs')] }
		])
		const next = presidents.applyAction(state, {
			type: 'PLAY',
			playerId: P1,
			payload: { cardIds: quads.map((c) => c.id) }
		})
		expect(next.lastPlay).toBeNull()
		expect(next.zones.pile.cards).toHaveLength(0)
		expect(next.passedThisTrick).toHaveLength(0)
	})

	it('4 consecutive singles of same value ends trick', () => {
		const _c1 = createCard('9', 'hearts')
		const _c2 = createCard('9', 'diamonds')
		const _c3 = createCard('9', 'clubs')
		const c4 = createCard('9', 'spades')
		// 3 singles already played → sameValueCount = 3, sameValueLock = true
		const s1 = buildState(
			[
				{ pid: P1, cards: [createCard('K', 'hearts')] },
				{ pid: P2, cards: [createCard('K', 'diamonds')] },
				{ pid: P3, cards: [c4] }
			],
			{
				turnPlayerId: P3,
				lastPlay: { playerId: P2, comboType: 'single', value: 9 },
				sameValueLock: true,
				sameValueCount: 3
			}
		)
		const next = presidents.applyAction(s1, {
			type: 'PLAY',
			playerId: P3,
			payload: { cardIds: [c4.id] }
		})
		expect(next.lastPlay).toBeNull()
		expect(next.zones.pile.cards).toHaveLength(0)
		expect(next.sameValueCount).toBe(0)
	})

	it('2 pairs of same value ends trick', () => {
		const c1 = createCard('9', 'clubs')
		const c2 = createCard('9', 'spades')
		// 1 pair already played → sameValueCount = 2, sameValueLock = true
		const s1 = buildState(
			[
				{ pid: P1, cards: [createCard('K', 'hearts')] },
				{ pid: P2, cards: [c1, c2] },
				{ pid: P3, cards: [createCard('K', 'clubs')] }
			],
			{
				turnPlayerId: P2,
				lastPlay: { playerId: P1, comboType: 'pair', value: 9 },
				sameValueLock: true,
				sameValueCount: 2
			}
		)
		const next = presidents.applyAction(s1, {
			type: 'PLAY',
			playerId: P2,
			payload: { cardIds: [c1.id, c2.id] }
		})
		expect(next.lastPlay).toBeNull()
		expect(next.zones.pile.cards).toHaveLength(0)
	})

	it('pass resets sameValueLock but preserves sameValueCount', () => {
		const state = buildState(
			[
				{ pid: P1, cards: [createCard('3', 'hearts')] },
				{ pid: P2, cards: [createCard('9', 'spades')] },
				{ pid: P3, cards: [createCard('K', 'clubs')] }
			],
			{
				turnPlayerId: P2,
				lastPlay: { playerId: P1, comboType: 'single', value: 9 },
				sameValueLock: true,
				sameValueCount: 3
			}
		)
		const next = presidents.applyAction(state, { type: 'PASS', playerId: P2 })
		expect(next.sameValueCount).toBe(3)
		expect(next.sameValueLock).toBe(false)
	})

	it('square completes via passes between two pairs', () => {
		const pair1 = [createCard('9', 'hearts'), createCard('9', 'diamonds')]
		const pair2 = [createCard('9', 'clubs'), createCard('9', 'spades')]
		// Both P1 and P3 have extra cards so finishing hand branch is not triggered
		const s0 = buildState([
			{ pid: P1, cards: [...pair1, createCard('3', 'clubs')] },
			{ pid: P2, cards: [createCard('3', 'hearts')] },
			{ pid: P3, cards: [...pair2, createCard('4', 'clubs')] }
		])
		const s1 = presidents.applyAction(s0, {
			type: 'PLAY',
			playerId: P1,
			payload: { cardIds: pair1.map((c) => c.id) }
		})
		expect(s1.sameValueCount).toBe(2)
		// P2 passes — count must be preserved
		const s2 = presidents.applyAction(s1, { type: 'PASS', playerId: P2 })
		expect(s2.sameValueCount).toBe(2)
		// P3 plays pair of 9s → count = 4 → square → trick ends, P3 leads
		const s3 = presidents.applyAction(s2, {
			type: 'PLAY',
			playerId: P3,
			payload: { cardIds: pair2.map((c) => c.id) }
		})
		expect(s3.lastPlay).toBeNull()
		expect(s3.zones.pile.cards).toHaveLength(0)
		expect(s3.turnPlayerId).toBe(P3)
	})

	it('finishing with a 2 puts player in scumPenalties not finishOrder', () => {
		const c2 = createCard('2', 'hearts')
		const state = buildState([
			{ pid: P1, cards: [c2] },
			{ pid: P2, cards: [createCard('K', 'diamonds')] },
			{ pid: P3, cards: [createCard('A', 'clubs')] }
		])
		const next = presidents.applyAction(state, {
			type: 'PLAY',
			playerId: P1,
			payload: { cardIds: [c2.id] }
		})
		expect(next.scumPenalties).toContain(P1)
		expect(next.finishOrder).not.toContain(P1)
		expect(next.activePlayers).not.toContain(P1)
	})

	it('scumPenalties appended to finishOrder at gameover', () => {
		const c2 = createCard('2', 'hearts')
		const state = buildState(
			[
				{ pid: P1, cards: [c2] },
				{ pid: P2, cards: [createCard('K', 'diamonds')] }
			],
			{ activePlayers: [P1, P2], scumPenalties: [] }
		)
		const next = presidents.applyAction(state, {
			type: 'PLAY',
			playerId: P1,
			payload: { cardIds: [c2.id] }
		})
		expect(next.phase).toBe('gameover')
		expect(next.finishOrder[next.finishOrder.length - 1]).toBe(P1)
		expect(next.finishOrder[0]).toBe(P2)
	})
})
