import type { Action, GameDefinition, OptionSchema } from '$lib/engine'
import { assignRoles, autoComposition } from './composition'
import { enterNight, resolveMayorElection, startDayVoting } from './phases'
import {
	applyDeaths,
	checkWin,
	resolveDay,
	resolveMayorSuccession,
	resolveNight,
	resumeAfterHunter
} from './resolution'
import { ROLE_DEFS } from './roles'
import { nextActiveStep, startStep, turnByActionType, turnByKey } from './turns'
import type { RoleCountsOnly, WerewolfOptions, WerewolfState } from './types'

export type { NightStepKey, Role, WerewolfOptions, WerewolfState } from './types'

export const werewolf: GameDefinition<WerewolfState> = {
	id: 'werewolf',
	name: 'Loup-Garou',
	deckType: 'WerewolfDeck',
	minPlayers: 4,
	maxPlayers: 16,
	isNew: true,

	optionsSchema: [
		{
			key: 'autoCompose',
			label: 'werewolf.options.autoCompose',
			description: 'werewolf.options.autoComposeDesc',
			type: 'boolean',
			default: true
		},
		{
			key: 'mayorEnabled',
			label: 'werewolf.options.mayorEnabled',
			description: 'werewolf.options.mayorEnabledDesc',
			type: 'boolean',
			default: false
		},
		// Per-role count options are derived from ROLE_DEFS (roles.ts).
		...ROLE_DEFS.map(
			(def) =>
				({
					key: def.countKey,
					label: `werewolf.options.${def.countKey}`,
					type: 'number',
					default: def.defaultCount,
					min: def.min,
					max: def.max,
					disabledWhen: { key: 'autoCompose', value: true }
				}) as OptionSchema
		),
		{
			key: 'wolfTimerSeconds',
			label: 'werewolf.options.wolfTimerSeconds',
			type: 'number',
			default: 20,
			min: 5,
			max: 120,
			step: 5
		},
		{
			key: 'roleTimerSeconds',
			label: 'werewolf.options.roleTimerSeconds',
			type: 'number',
			default: 20,
			min: 5,
			max: 90,
			step: 5
		},
		{
			key: 'talkTimerSeconds',
			label: 'werewolf.options.talkTimerSeconds',
			type: 'number',
			default: 120,
			min: 30,
			max: 600,
			step: 30
		},
		{
			key: 'voteTimerSeconds',
			label: 'werewolf.options.voteTimerSeconds',
			type: 'number',
			default: 60,
			min: 15,
			max: 180,
			step: 15
		}
	],

	setup(players, options = {}) {
		const raw = options as Record<string, unknown>
		const bool = (key: string, def: boolean) =>
			typeof raw[key] === 'boolean' ? (raw[key] as boolean) : def
		const num = (key: string, def: number) => {
			const v = raw[key]
			return typeof v === 'number' ? Math.max(0, Math.round(v)) : def
		}
		const autoCompose = bool('autoCompose', true)
		// Per-role counts are pulled from ROLE_DEFS so adding a role only requires
		// editing roles.ts (plus declaring the matching field on WerewolfOptions).
		const roleCounts = Object.fromEntries(
			ROLE_DEFS.map((def) => [def.countKey, num(def.countKey, def.defaultCount)])
		) as RoleCountsOnly
		let opts: WerewolfOptions = {
			autoCompose,
			mayorEnabled: bool('mayorEnabled', false),
			...roleCounts,
			wolfTimerSeconds: num('wolfTimerSeconds', 15),
			roleTimerSeconds: num('roleTimerSeconds', 20),
			talkTimerSeconds: num('talkTimerSeconds', 120),
			voteTimerSeconds: num('voteTimerSeconds', 60)
		}
		if (autoCompose) opts = { ...opts, ...autoComposition(players.length) }
		return {
			players,
			zones: {},
			// turnPlayerId is required by GameStateGeneric but unused by Werewolf —
			// active player is derived from phase + nightStep + roles instead.
			turnPlayerId: players[0],
			phase: 'night',
			nightStep: null,
			daySubPhase: 'talking',
			phaseEndTime: null,
			phaseDurationMs: null,
			round: 1,
			readyPlayers: [],
			activeGameId: 'werewolf',
			roles: assignRoles(players, opts),
			alive: [...players],
			nightVotes: {},
			dayVotes: {},
			mayorVotes: {},
			protectedId: null,
			witchKillTarget: null,
			witchSavedVictim: false,
			witchActed: false,
			seerReveal: null,
			lovers: null,
			defenderLast: null,
			witchSaveUsed: false,
			witchKillUsed: false,
			elderShieldUsed: false,
			powersLost: false,
			idiotRevealed: false,
			mayor: null,
			mayorElectionDone: false,
			pendingHunter: null,
			pendingTransition: null,
			pendingMayor: null,
			pendingMayorTransition: null,
			lastEliminated: [],
			winTeam: null,
			options: opts
		}
	},

	onOptionsChange(options, playerCount) {
		if (options.autoCompose === true) return autoComposition(playerCount)
		return {}
	},

	canStart(options, playerCount) {
		if (options.autoCompose === true) return true
		const raw = options as Record<string, unknown>
		const n = (key: string) => (typeof raw[key] === 'number' ? (raw[key] as number) : 0)
		const total = ROLE_DEFS.reduce((sum, def) => sum + n(def.countKey), 0)
		return total === playerCount
	},

	getValidActions(state, playerId) {
		// Stale/spectator peers must not be able to push actions — would let
		// PLAYER_READY cross the all-ready threshold with unknown IDs.
		if (!state.players.includes(playerId)) return []
		if (state.phase === 'gameover') return []

		const role = state.roles[playerId]
		const isAlive = state.alive.includes(playerId)
		const isHost = playerId === state.players[0]
		const allReady = state.readyPlayers.length >= state.players.length
		const actions: Action[] = []

		if (!state.readyPlayers.includes(playerId)) actions.push({ type: 'PLAYER_READY', playerId })
		if (!allReady) return actions

		if (state.pendingHunter) {
			if (playerId === state.pendingHunter) actions.push({ type: 'HUNTER_SHOOT', playerId })
			if (isHost) actions.push({ type: 'NEXT_PHASE', playerId })
			return actions
		}

		if (state.pendingMayor) {
			if (playerId === state.pendingMayor) actions.push({ type: 'MAYOR_SUCCESSOR', playerId })
			if (isHost) actions.push({ type: 'NEXT_PHASE', playerId })
			return actions
		}

		if (state.phase === 'night') {
			if (state.nightStep) {
				const turn = turnByKey(state.nightStep)
				if (turn?.isActive(state)) actions.push(...turn.validActions(state, playerId))
			}
			if (isHost) actions.push({ type: 'NEXT_PHASE', playerId })
		}

		if (state.phase === 'day') {
			const isMutedIdiot = role === 'village-idiot' && state.idiotRevealed
			if (state.daySubPhase === 'electing' && isAlive && !state.mayorVotes[playerId]) {
				actions.push({ type: 'MAYOR_VOTE', playerId })
			}
			if (state.daySubPhase === 'voting' && isAlive && !state.dayVotes[playerId] && !isMutedIdiot) {
				actions.push({ type: 'DAY_VOTE', playerId })
			}
			if (isHost) actions.push({ type: 'NEXT_PHASE', playerId })
		}

		return actions
	},

	applyAction(state, action) {
		// Capture wall-clock time exactly once per action so every helper that
		// stamps phaseEndTime shares the same `now` — keeps applyAction pure
		// from the caller's perspective (one Date.now() per invocation).
		const now = Date.now()
		const payload = action.payload as { target?: string } | undefined

		if (action.type === 'PLAYER_READY') {
			if (!state.players.includes(action.playerId)) return state
			if (state.readyPlayers.includes(action.playerId)) return state
			const readyPlayers = [...state.readyPlayers, action.playerId]
			if (readyPlayers.length < state.players.length) return { ...state, readyPlayers }
			return enterNight({ ...state, readyPlayers }, now)
		}

		// Night-turn actions are owned by their role's Turn class.
		const turn = turnByActionType(action.type)
		if (turn) {
			if (state.phase !== 'night' || state.nightStep !== turn.key) return state
			const next = turn.apply(state, action)
			if (next === state) return state
			if (!turn.isComplete(next)) return next
			// Turn finished — advance immediately instead of waiting on the timer.
			const further = nextActiveStep(next, next.nightStep)
			return further ? startStep(next, further, now) : resolveNight(next, now)
		}

		if (action.type === 'DAY_VOTE') {
			const target = payload?.target
			if (!target || !state.alive.includes(target) || target === action.playerId) return state
			if (!state.alive.includes(action.playerId) || state.daySubPhase !== 'voting') return state
			if (state.roles[action.playerId] === 'village-idiot' && state.idiotRevealed) return state
			return { ...state, dayVotes: { ...state.dayVotes, [action.playerId]: target } }
		}

		if (action.type === 'MAYOR_VOTE') {
			const target = payload?.target
			if (state.phase !== 'day' || state.daySubPhase !== 'electing') return state
			if (!state.alive.includes(action.playerId) || !target || !state.alive.includes(target))
				return state
			return { ...state, mayorVotes: { ...state.mayorVotes, [action.playerId]: target } }
		}

		if (action.type === 'MAYOR_SUCCESSOR') {
			if (state.pendingMayor !== action.playerId) return state
			const target = payload?.target
			if (!target || !state.alive.includes(target)) return state
			return resolveMayorSuccession(state, target, now)
		}

		if (action.type === 'HUNTER_SHOOT') {
			if (state.pendingHunter !== action.playerId) return state
			const target = payload?.target
			if (!target || !state.alive.includes(target)) return state
			const { alive, deaths, hunter } = applyDeaths(state, [target])
			const s: WerewolfState = {
				...state,
				alive,
				lastEliminated: [...state.lastEliminated, ...deaths]
			}
			if (hunter) {
				const durationMs = state.options.roleTimerSeconds * 1000
				return {
					...s,
					pendingHunter: hunter,
					phaseEndTime: now + durationMs,
					phaseDurationMs: durationMs
				}
			}
			return resumeAfterHunter(s, now)
		}

		if (action.type === 'NEXT_PHASE') {
			if (action.playerId !== state.players[0]) return state
			if (state.pendingHunter) return resumeAfterHunter(state, now)
			if (state.pendingMayor) return resolveMayorSuccession(state, null, now)
			if (state.phase === 'night') {
				const next = nextActiveStep(state, state.nightStep)
				if (next) return startStep(state, next, now)
				return resolveNight(state, now)
			}
			if (state.phase === 'day') {
				if (state.daySubPhase === 'electing') return resolveMayorElection(state, now)
				if (state.daySubPhase === 'talking') return startDayVoting(state, now)
				return resolveDay(state, now)
			}
			return state
		}

		return state
	},

	isOver(state) {
		return state.phase === 'gameover'
	},

	getWinner(state) {
		if (state.phase !== 'gameover' || !state.winTeam) return null
		if (state.winTeam === 'lovers') return state.lovers?.[0] ?? null
		if (state.winTeam === 'werewolves')
			return state.players.find((p) => state.roles[p] === 'werewolf') ?? null
		return (
			state.alive.find((p) => state.roles[p] !== 'werewolf') ??
			state.players.find((p) => state.roles[p] !== 'werewolf') ??
			null
		)
	},

	scheduleAction(state) {
		if (!state.phaseEndTime || state.phase === 'gameover') return null
		return {
			action: { type: 'NEXT_PHASE', playerId: state.players[0] },
			delayMs: Math.max(0, state.phaseEndTime - Date.now())
		}
	},

	onPlayerDisconnect(state, playerId) {
		if (state.phase === 'gameover') return state
		const now = Date.now()
		const players = state.players.filter((p) => p !== playerId)
		const readyPlayers = state.readyPlayers.filter((p) => p !== playerId)
		// applyDeaths chains lovers and surfaces a hunter that needs to shoot —
		// drop these on the floor and we silently lose a forced death + a shot.
		const { alive, deaths, hunter } = applyDeaths(state, [playerId])
		const base: WerewolfState = {
			...state,
			alive,
			players,
			readyPlayers,
			turnPlayerId: players[0] ?? state.turnPlayerId,
			lastEliminated: deaths,
			lovers: state.lovers && state.lovers.includes(playerId) ? null : state.lovers,
			pendingHunter: state.pendingHunter === playerId ? null : state.pendingHunter,
			mayor: state.mayor === playerId ? null : state.mayor,
			pendingMayor: state.pendingMayor === playerId ? null : state.pendingMayor
		}
		const win = checkWin(base)
		if (win)
			return { ...base, phase: 'gameover', winTeam: win, phaseEndTime: null, phaseDurationMs: null }
		// A disconnecting player's lover-chained hunter still gets a final shot.
		if (hunter && players.includes(hunter)) {
			const durationMs = state.options.roleTimerSeconds * 1000
			return {
				...base,
				pendingHunter: hunter,
				pendingTransition: state.phase === 'night' ? 'night' : 'day',
				phaseEndTime: now + durationMs,
				phaseDurationMs: durationMs
			}
		}
		// disconnect may complete the all-ready gate before the game has started
		if (!state.phaseEndTime && players.length > 0 && readyPlayers.length >= players.length) {
			return enterNight(base, now)
		}
		return base
	}
}
