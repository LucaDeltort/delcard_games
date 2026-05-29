import { describe, expect, it } from 'vitest'
import type { WerewolfState } from './werewolf'
import { werewolf } from './werewolf'

const P1 = 'p1'
const P2 = 'p2'
const P3 = 'p3'
const P4 = 'p4'
const PLAYERS = [P1, P2, P3, P4]

function setup() {
	return werewolf.setup(PLAYERS)
}

type Role = WerewolfState['roles'][string]

function setupWithRoles(roles: Record<string, Role>): WerewolfState {
	const base = setup()
	return { ...base, roles }
}

// A started game with the all-ready gate cleared and on the wolves step.
function started(
	roles: Record<string, Role>,
	overrides: Partial<WerewolfState> = {}
): WerewolfState {
	const base = setupWithRoles(roles)
	return { ...base, readyPlayers: [...PLAYERS], nightStep: 'wolves', ...overrides }
}

function startedMayor(
	roles: Record<string, Role>,
	overrides: Partial<WerewolfState> = {}
): WerewolfState {
	const base = started(roles, overrides)
	return { ...base, options: { ...base.options, mayorEnabled: true } }
}

describe('werewolf.setup', () => {
	it('starts in night phase', () => {
		expect(setup().phase).toBe('night')
	})

	it('starts ungated (no ready players, timer not running)', () => {
		const state = setup()
		expect(state.readyPlayers).toHaveLength(0)
		expect(state.phaseEndTime).toBeNull()
	})

	it('all players alive', () => {
		const state = setup()
		expect(state.alive).toHaveLength(PLAYERS.length)
		expect(state.alive).toEqual(expect.arrayContaining(PLAYERS))
	})

	it('assigns exactly 1 wolf for 4 players', () => {
		const state = setup()
		const wolves = PLAYERS.filter((p) => state.roles[p] === 'werewolf')
		expect(wolves).toHaveLength(1)
	})

	it('getWinner returns null at start', () => {
		expect(werewolf.getWinner(setup())).toBeNull()
	})
})

describe('werewolf.ready gate', () => {
	it('only PLAYER_READY is offered before everyone is ready', () => {
		const state = setupWithRoles({
			[P1]: 'werewolf',
			[P2]: 'villager',
			[P3]: 'villager',
			[P4]: 'villager'
		})
		const actions = werewolf.getValidActions(state, P1)
		expect(actions.map((a) => a.type)).toEqual(['PLAYER_READY'])
	})

	it('last PLAYER_READY starts the first night with a timer', () => {
		let state = setupWithRoles({
			[P1]: 'werewolf',
			[P2]: 'villager',
			[P3]: 'villager',
			[P4]: 'villager'
		})
		for (const p of PLAYERS)
			state = werewolf.applyAction(state, { type: 'PLAYER_READY', playerId: p })
		expect(state.readyPlayers).toHaveLength(PLAYERS.length)
		expect(state.nightStep).toBe('wolves')
		expect(state.phaseEndTime).not.toBeNull()
	})
})

describe('werewolf.getValidActions', () => {
	it('wolf gets NIGHT_VOTE on the wolves step', () => {
		const state = started({
			[P1]: 'werewolf',
			[P2]: 'villager',
			[P3]: 'villager',
			[P4]: 'villager'
		})
		expect(werewolf.getValidActions(state, P1).map((a) => a.type)).toContain('NIGHT_VOTE')
	})

	it('non-host villager gets no actions during the wolves step', () => {
		const state = started({
			[P1]: 'werewolf',
			[P2]: 'villager',
			[P3]: 'villager',
			[P4]: 'villager'
		})
		expect(werewolf.getValidActions(state, P2)).toHaveLength(0)
	})

	it('host gets NEXT_PHASE', () => {
		const state = started({
			[P1]: 'werewolf',
			[P2]: 'villager',
			[P3]: 'villager',
			[P4]: 'villager'
		})
		expect(werewolf.getValidActions(state, P1).map((a) => a.type)).toContain('NEXT_PHASE')
	})

	it('seer gets SEER_PEEK on the seer step', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'seer', [P3]: 'villager', [P4]: 'villager' },
			{ nightStep: 'seer' }
		)
		expect(werewolf.getValidActions(state, P2).map((a) => a.type)).toContain('SEER_PEEK')
	})

	it('alive players get DAY_VOTE during day voting', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'villager', [P4]: 'villager' },
			{ phase: 'day', daySubPhase: 'voting' }
		)
		expect(werewolf.getValidActions(state, P2).map((a) => a.type)).toContain('DAY_VOTE')
	})

	it('revealed village idiot cannot vote', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'village-idiot', [P3]: 'villager', [P4]: 'villager' },
			{ phase: 'day', daySubPhase: 'voting', idiotRevealed: true }
		)
		expect(werewolf.getValidActions(state, P2).map((a) => a.type)).not.toContain('DAY_VOTE')
	})

	it('returns empty array in gameover', () => {
		const state: WerewolfState = { ...setup(), phase: 'gameover' }
		PLAYERS.forEach((p) => expect(werewolf.getValidActions(state, p)).toHaveLength(0))
	})
})

describe('werewolf.applyAction', () => {
	it('NIGHT_VOTE records wolf vote', () => {
		const state = started({
			[P1]: 'werewolf',
			[P2]: 'villager',
			[P3]: 'villager',
			[P4]: 'villager'
		})
		const next = werewolf.applyAction(state, {
			type: 'NIGHT_VOTE',
			playerId: P1,
			payload: { target: P2 }
		})
		expect(next.nightVotes[P1]).toBe(P2)
	})

	it('NIGHT_VOTE ignores self-target', () => {
		const state = started({
			[P1]: 'werewolf',
			[P2]: 'villager',
			[P3]: 'villager',
			[P4]: 'villager'
		})
		const next = werewolf.applyAction(state, {
			type: 'NIGHT_VOTE',
			playerId: P1,
			payload: { target: P1 }
		})
		expect(next.nightVotes[P1]).toBeUndefined()
	})

	it('NEXT_PHASE resolves night, eliminates victim, moves to day', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'villager', [P4]: 'villager' },
			{ nightVotes: { [P1]: P2 } }
		)
		const next = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(next.alive).not.toContain(P2)
		expect(next.lastEliminated).toContain(P2)
		expect(next.phase).toBe('day')
	})

	it('night resolution triggers werewolf win when wolves reach parity', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'villager', [P4]: 'villager' },
			{ alive: [P1, P2], nightVotes: { [P1]: P2 } }
		)
		const next = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(next.phase).toBe('gameover')
		expect(next.winTeam).toBe('werewolves')
	})

	it('protected wolf target survives', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'defender', [P4]: 'villager' },
			{ nightVotes: { [P1]: P2 }, protectedId: P2 }
		)
		const next = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(next.alive).toContain(P2)
		expect(next.lastEliminated).toHaveLength(0)
	})

	it('witch poison adds a second night kill', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'witch', [P4]: 'villager' },
			{ nightVotes: { [P1]: P2 }, witchKillTarget: P4, witchKillUsed: true, witchSaveUsed: true }
		)
		const next = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(next.alive).not.toContain(P2)
		expect(next.alive).not.toContain(P4)
	})

	it('lovers die together', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'villager', [P4]: 'villager' },
			{ nightVotes: { [P1]: P2 }, lovers: [P2, P3] }
		)
		const next = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(next.alive).not.toContain(P2)
		expect(next.alive).not.toContain(P3)
	})

	it('dying hunter pauses for a final shot', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'hunter', [P3]: 'villager', [P4]: 'villager' },
			{ nightVotes: { [P1]: P2 } }
		)
		const next = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(next.pendingHunter).toBe(P2)
		expect(werewolf.getValidActions(next, P2).map((a) => a.type)).toContain('HUNTER_SHOOT')
	})

	it('DAY_VOTE records vote', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'villager', [P4]: 'villager' },
			{ phase: 'day', daySubPhase: 'voting' }
		)
		const next = werewolf.applyAction(state, {
			type: 'DAY_VOTE',
			playerId: P2,
			payload: { target: P1 }
		})
		expect(next.dayVotes[P2]).toBe(P1)
	})

	it('day resolution eliminates the majority-voted player', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'villager', [P4]: 'villager' },
			{ phase: 'day', daySubPhase: 'voting', dayVotes: { [P2]: P1, [P3]: P1, [P4]: P2 } }
		)
		const next = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(next.alive).not.toContain(P1)
		expect(next.lastEliminated).toContain(P1)
	})

	it('lynching the last wolf triggers villager win', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'villager', [P4]: 'villager' },
			{ phase: 'day', daySubPhase: 'voting', dayVotes: { [P1]: P1, [P2]: P1, [P3]: P1, [P4]: P1 } }
		)
		const next = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(next.phase).toBe('gameover')
		expect(next.winTeam).toBe('villagers')
	})

	it('village idiot survives the first lynch and is revealed', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'village-idiot', [P3]: 'villager', [P4]: 'villager' },
			{ phase: 'day', daySubPhase: 'voting', dayVotes: { [P1]: P2, [P3]: P2, [P4]: P2 } }
		)
		const next = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(next.alive).toContain(P2)
		expect(next.idiotRevealed).toBe(true)
	})

	it('does not mutate input state', () => {
		const state = started({
			[P1]: 'werewolf',
			[P2]: 'villager',
			[P3]: 'villager',
			[P4]: 'villager'
		})
		const snap = JSON.stringify(state)
		werewolf.applyAction(state, { type: 'NIGHT_VOTE', playerId: P1, payload: { target: P2 } })
		expect(JSON.stringify(state)).toBe(snap)
	})

	it('seer peek (last step) ends the night immediately', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'seer', [P3]: 'villager', [P4]: 'villager' },
			{ nightStep: 'seer' }
		)
		const next = werewolf.applyAction(state, {
			type: 'SEER_PEEK',
			playerId: P2,
			payload: { target: P1 }
		})
		expect(next.seerReveal?.target).toBe(P1)
		expect(next.phase).toBe('day')
	})

	it('defender pick advances off the defender step', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'defender', [P4]: 'villager' },
			{ nightStep: 'defender' }
		)
		const next = werewolf.applyAction(state, {
			type: 'PROTECT',
			playerId: P3,
			payload: { target: P2 }
		})
		expect(next.protectedId).toBe(P2)
		expect(next.nightStep).not.toBe('defender')
	})

	it('defender can protect themselves', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'defender', [P4]: 'villager' },
			{ nightStep: 'defender' }
		)
		const next = werewolf.applyAction(state, {
			type: 'PROTECT',
			playerId: P3,
			payload: { target: P3 }
		})
		expect(next.protectedId).toBe(P3)
	})

	it('witch confirming marks the turn done and advances', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'witch', [P4]: 'villager' },
			{ nightStep: 'witch', nightVotes: { [P1]: P2 } }
		)
		const next = werewolf.applyAction(state, {
			type: 'WITCH_ACT',
			playerId: P3,
			payload: { save: false }
		})
		expect(next.witchActed).toBe(true)
		expect(next.nightStep).not.toBe('witch')
	})

	it('mayor enabled: first day starts with the election', () => {
		const state = startedMayor(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'villager', [P4]: 'villager' },
			{ nightVotes: { [P1]: P2 } }
		)
		const next = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(next.phase).toBe('day')
		expect(next.daySubPhase).toBe('electing')
		expect(next.mayor).toBeNull()
	})

	it('mayor election picks the majority and moves to talking', () => {
		let state = startedMayor(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'villager', [P4]: 'villager' },
			{ phase: 'day', daySubPhase: 'electing', mayorVotes: { [P1]: P3, [P2]: P3, [P4]: P3 } }
		)
		state = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(state.mayor).toBe(P3)
		expect(state.daySubPhase).toBe('talking')
		expect(state.mayorElectionDone).toBe(true)
	})

	it("mayor's day vote counts double", () => {
		// Without weight: each target gets 1 → tie → no scapegoat → nobody dies.
		// With weight (P2 = mayor voting P1): P1 = 2, others = 1 → P1 lynched.
		const state = startedMayor(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'villager', [P4]: 'villager' },
			{ phase: 'day', daySubPhase: 'voting', mayor: P2, dayVotes: { [P2]: P1, [P3]: P4, [P4]: P3 } }
		)
		const next = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(next.alive).not.toContain(P1)
	})

	it('dying mayor pauses to appoint a successor', () => {
		const state = startedMayor(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'villager', [P4]: 'villager' },
			{ phase: 'day', daySubPhase: 'voting', mayor: P2, dayVotes: { [P1]: P2, [P3]: P2, [P4]: P2 } }
		)
		const lynched = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(lynched.alive).not.toContain(P2)
		expect(lynched.pendingMayor).toBe(P2)
		const appointed = werewolf.applyAction(lynched, {
			type: 'MAYOR_SUCCESSOR',
			playerId: P2,
			payload: { target: P3 }
		})
		expect(appointed.mayor).toBe(P3)
		expect(appointed.pendingMayor).toBeNull()
	})
})

describe('werewolf.isOver / getWinner', () => {
	it('isOver false during play', () => {
		expect(werewolf.isOver(setup())).toBe(false)
	})

	it('isOver true in gameover', () => {
		expect(werewolf.isOver({ ...setup(), phase: 'gameover' })).toBe(true)
	})

	it('getWinner null when not gameover', () => {
		expect(werewolf.getWinner(setup())).toBeNull()
	})

	it('getWinner returns wolf on werewolf win', () => {
		const base = setupWithRoles({
			[P1]: 'werewolf',
			[P2]: 'villager',
			[P3]: 'villager',
			[P4]: 'villager'
		})
		expect(werewolf.getWinner({ ...base, phase: 'gameover', winTeam: 'werewolves' })).toBe(P1)
	})

	it('getWinner returns a villager on villager win', () => {
		const base = setupWithRoles({
			[P1]: 'werewolf',
			[P2]: 'villager',
			[P3]: 'villager',
			[P4]: 'villager'
		})
		const winner = werewolf.getWinner({
			...base,
			alive: [P2, P3, P4],
			phase: 'gameover',
			winTeam: 'villagers'
		})
		expect([P2, P3, P4]).toContain(winner)
	})

	it('getWinner returns a lover on lovers win', () => {
		const base = setupWithRoles({
			[P1]: 'werewolf',
			[P2]: 'villager',
			[P3]: 'villager',
			[P4]: 'villager'
		})
		expect(
			werewolf.getWinner({ ...base, phase: 'gameover', winTeam: 'lovers', lovers: [P1, P2] })
		).toBe(P1)
	})
})

describe('werewolf roles: special behaviours', () => {
	it('cupid links two lovers and advances off the cupid step', () => {
		const state = started(
			{ [P1]: 'cupid', [P2]: 'werewolf', [P3]: 'villager', [P4]: 'villager' },
			{ nightStep: 'cupid' }
		)
		const next = werewolf.applyAction(state, {
			type: 'CUPID_LINK',
			playerId: P1,
			payload: { lovers: [P3, P4] }
		})
		expect(next.lovers).toEqual([P3, P4])
		expect(next.nightStep).not.toBe('cupid')
	})

	it('defender cannot guard the same player two nights running', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'defender', [P4]: 'villager' },
			{ nightStep: 'defender', defenderLast: P2 }
		)
		const next = werewolf.applyAction(state, {
			type: 'PROTECT',
			playerId: P3,
			payload: { target: P2 }
		})
		expect(next.protectedId).toBeNull()
		expect(next.nightStep).toBe('defender')
	})

	it('witch save cancels the wolf kill', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'witch', [P4]: 'villager' },
			{ nightVotes: { [P1]: P2 }, witchSavedVictim: true, witchSaveUsed: true, witchKillUsed: true }
		)
		const next = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(next.alive).toContain(P2)
		expect(next.lastEliminated).toHaveLength(0)
	})

	it('elder survives the first wolf attack and dies on the second', () => {
		const state1 = started(
			{ [P1]: 'werewolf', [P2]: 'elder', [P3]: 'villager', [P4]: 'villager' },
			{ nightVotes: { [P1]: P2 } }
		)
		const afterNight1 = werewolf.applyAction(state1, { type: 'NEXT_PHASE', playerId: P1 })
		expect(afterNight1.alive).toContain(P2)
		expect(afterNight1.elderShieldUsed).toBe(true)
		const state2: WerewolfState = {
			...afterNight1,
			phase: 'night',
			nightStep: 'wolves',
			nightVotes: { [P1]: P2 }
		}
		const afterNight2 = werewolf.applyAction(state2, { type: 'NEXT_PHASE', playerId: P1 })
		expect(afterNight2.alive).not.toContain(P2)
	})

	it('lynching the elder sets powersLost so specials stop working', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'elder', [P3]: 'seer', [P4]: 'villager' },
			{ phase: 'day', daySubPhase: 'voting', dayVotes: { [P1]: P2, [P3]: P2, [P4]: P2 } }
		)
		const next = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(next.powersLost).toBe(true)
	})

	it('scapegoat dies on a tied day vote', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'scapegoat', [P3]: 'villager', [P4]: 'villager' },
			{ phase: 'day', daySubPhase: 'voting', dayVotes: { [P1]: P3, [P3]: P1, [P4]: P3 } }
		)
		// 2 vs 1 tie? counts: P3=2, P1=1 → not tied. Force a real tie: P3=1, P1=1.
		const tied: WerewolfState = { ...state, dayVotes: { [P1]: P3, [P3]: P1 } }
		const next = werewolf.applyAction(tied, { type: 'NEXT_PHASE', playerId: P1 })
		expect(next.alive).not.toContain(P2)
		expect(next.lastEliminated).toContain(P2)
	})

	it('revealed village idiot dies on a subsequent lynch', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'village-idiot', [P3]: 'villager', [P4]: 'villager' },
			{
				phase: 'day',
				daySubPhase: 'voting',
				idiotRevealed: true,
				dayVotes: { [P1]: P2, [P3]: P2, [P4]: P2 }
			}
		)
		const next = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(next.alive).not.toContain(P2)
	})

	it('mixed-team lovers win as the last two alive', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'villager', [P4]: 'villager' },
			{
				phase: 'day',
				daySubPhase: 'voting',
				alive: [P1, P2, P3],
				lovers: [P1, P2],
				dayVotes: { [P1]: P3, [P2]: P3, [P3]: P3 }
			}
		)
		const next = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(next.phase).toBe('gameover')
		expect(next.winTeam).toBe('lovers')
	})

	it('hunter shoot kills the target and clears the pending shot', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'hunter', [P3]: 'villager', [P4]: 'villager' },
			{ phase: 'day', pendingHunter: P2, pendingTransition: 'night', alive: [P1, P3, P4] }
		)
		const next = werewolf.applyAction(state, {
			type: 'HUNTER_SHOOT',
			playerId: P2,
			payload: { target: P1 }
		})
		expect(next.alive).not.toContain(P1)
		expect(next.pendingHunter).toBeNull()
	})

	it('hunter shot that wins the game ends it even when it chains to another hunter', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'hunter', [P3]: 'hunter', [P4]: 'villager' },
			{
				phase: 'day',
				pendingHunter: P2,
				pendingTransition: 'night',
				alive: [P1, P2, P3, P4],
				lovers: [P1, P3]
			}
		)
		// P2 shoots the last wolf P1; P1's lover P3 (also a hunter) dies in the
		// chain, but the village has already won — no second shot is queued.
		const next = werewolf.applyAction(state, {
			type: 'HUNTER_SHOOT',
			playerId: P2,
			payload: { target: P1 }
		})
		expect(next.phase).toBe('gameover')
		expect(next.winTeam).toBe('villagers')
		expect(next.pendingHunter).toBeNull()
	})

	it('two hunters dying in one resolution each get a shot', () => {
		const P5 = 'p5'
		const P6 = 'p6'
		const six = [P1, P2, P3, P4, P5, P6]
		const base = werewolf.setup(six)
		const state: WerewolfState = {
			...base,
			roles: {
				[P1]: 'werewolf',
				[P2]: 'hunter',
				[P3]: 'hunter',
				[P4]: 'villager',
				[P5]: 'villager',
				[P6]: 'villager'
			},
			readyPlayers: [...six],
			nightStep: 'wolves',
			lovers: [P2, P3],
			nightVotes: { [P1]: P2 }
		}
		// Wolves kill hunter P2; the lover-chain kills hunter P3. Both owe a shot.
		const afterNight = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(afterNight.alive).not.toContain(P2)
		expect(afterNight.alive).not.toContain(P3)
		expect(afterNight.pendingHunter).toBe(P2)
		expect(afterNight.hunterQueue).toEqual([P3])
		// First hunter shoots a villager; the queue promotes the second hunter.
		const afterFirst = werewolf.applyAction(afterNight, {
			type: 'HUNTER_SHOOT',
			playerId: P2,
			payload: { target: P4 }
		})
		expect(afterFirst.pendingHunter).toBe(P3)
		expect(afterFirst.hunterQueue).toEqual([])
		// Second hunter takes the last queued shot; no hunter remains afterwards.
		const afterSecond = werewolf.applyAction(afterFirst, {
			type: 'HUNTER_SHOOT',
			playerId: P3,
			payload: { target: P5 }
		})
		expect(afterSecond.pendingHunter).toBeNull()
	})
})

describe('werewolf mayor extras', () => {
	it('mayor option off: first day goes straight to talking', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'villager', [P4]: 'villager' },
			{ nightVotes: { [P1]: P2 } }
		)
		const next = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(next.daySubPhase).toBe('talking')
		expect(next.mayor).toBeNull()
	})

	it('pending mayor skipped when NEXT_PHASE is forced with no choice', () => {
		const state = startedMayor(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'villager', [P4]: 'villager' },
			{
				phase: 'day',
				daySubPhase: 'voting',
				mayor: P2,
				pendingMayor: P2,
				pendingMayorTransition: 'night',
				alive: [P1, P3, P4]
			}
		)
		const next = werewolf.applyAction(state, { type: 'NEXT_PHASE', playerId: P1 })
		expect(next.mayor).toBeNull()
		expect(next.pendingMayor).toBeNull()
		expect(next.phase).toBe('night')
	})
})

describe('werewolf.onPlayerDisconnect', () => {
	it('clears the lovers pair when one lover disconnects', () => {
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'villager', [P4]: 'villager' },
			{ lovers: [P2, P3] }
		)
		const next = werewolf.onPlayerDisconnect!(state, P2)
		expect(next.lovers).toBeNull()
		expect(next.players).not.toContain(P2)
	})

	it('clears the mayor when the mayor disconnects', () => {
		const state = startedMayor(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'villager', [P4]: 'villager' },
			{ mayor: P2 }
		)
		const next = werewolf.onPlayerDisconnect!(state, P2)
		expect(next.mayor).toBeNull()
	})

	it('ends the game when the remaining players satisfy a win condition', () => {
		// Wolf left alone with one villager → wolves win when villager dc.
		const state = started(
			{ [P1]: 'werewolf', [P2]: 'villager', [P3]: 'villager', [P4]: 'villager' },
			{ alive: [P1, P2] }
		)
		const next = werewolf.onPlayerDisconnect!(state, P2)
		expect(next.phase).toBe('gameover')
		expect(next.winTeam).toBe('werewolves')
	})
})
