import { type SoundDef, Sounds } from '$lib/audio/sounds'
import type { Action } from '$lib/engine'
import type { NightStepKey, Role, WerewolfState } from './types'
import { majority } from './votes'

type Payload = { target?: string; lovers?: string[]; save?: boolean; kill?: string } | undefined

function livingHolders(state: WerewolfState, role: Role): number {
	return state.alive.filter((p) => state.roles[p] === role).length
}

/** A single ordered night phase, owned by one role. */
export interface Turn {
	readonly key: NightStepKey
	readonly role: Role
	/** The action type this turn accepts (host NEXT_PHASE excluded). */
	readonly actionType: string
	/** Narration cues played by the view when this step opens / closes. */
	readonly wakeVoice: SoundDef
	readonly sleepVoice: SoundDef
	/** Whether this turn runs this night given current state. */
	isActive(state: WerewolfState): boolean
	/** Whether this turn's required input is in — host advances immediately. */
	isComplete(state: WerewolfState): boolean
	/** Countdown length in ms when this turn starts. */
	timerMs(state: WerewolfState): number
	/** Legal actions for `playerId` during this turn. */
	validActions(state: WerewolfState, playerId: string): Action[]
	/** Apply this turn's action. Must guard and return state unchanged if illegal. */
	apply(state: WerewolfState, action: Action): WerewolfState
}

/**
 * Shared night-turn behaviour. Subclasses set key/role/actionType and override
 * the role-specific hooks. Common gating (powers lost, no living holder,
 * first-night-only) lives here so each role only declares what is unique to it.
 */
abstract class NightTurn implements Turn {
	abstract readonly key: NightStepKey
	abstract readonly role: Role
	abstract readonly actionType: string
	abstract readonly wakeVoice: SoundDef
	abstract readonly sleepVoice: SoundDef
	protected readonly firstNightOnly: boolean = false

	isActive(state: WerewolfState): boolean {
		if (this.role !== 'werewolf' && state.powersLost) return false
		if (livingHolders(state, this.role) === 0) return false
		if (this.firstNightOnly && state.round !== 1) return false
		return this.extraActive(state)
	}

	/** Extra per-role activation condition. Default: always active. */
	protected extraActive(_state: WerewolfState): boolean {
		return true
	}

	timerMs(state: WerewolfState): number {
		return state.options.roleTimerSeconds * 1000
	}

	abstract isComplete(state: WerewolfState): boolean
	abstract validActions(state: WerewolfState, playerId: string): Action[]
	abstract apply(state: WerewolfState, action: Action): WerewolfState
}

class CupidTurn extends NightTurn {
	readonly key = 'cupid' as const
	readonly role = 'cupid' as const
	readonly actionType = 'CUPID_LINK'
	readonly wakeVoice = Sounds.voice.CupidWake
	readonly sleepVoice = Sounds.voice.CupidSleep
	protected readonly firstNightOnly = true

	protected extraActive(state: WerewolfState): boolean {
		return state.lovers === null
	}

	isComplete(state: WerewolfState): boolean {
		return state.lovers !== null
	}

	validActions(state: WerewolfState, playerId: string): Action[] {
		if (state.roles[playerId] !== 'cupid' || state.lovers !== null) return []
		if (!state.alive.includes(playerId) || state.powersLost) return []
		return [{ type: this.actionType, playerId }]
	}

	apply(state: WerewolfState, action: Action): WerewolfState {
		if (
			state.roles[action.playerId] !== 'cupid' ||
			state.nightStep !== 'cupid' ||
			state.lovers !== null ||
			state.powersLost
		)
			return state
		const l = (action.payload as Payload)?.lovers
		if (!l || l.length !== 2 || l[0] === l[1]) return state
		if (!state.alive.includes(l[0]) || !state.alive.includes(l[1])) return state
		return { ...state, lovers: [l[0], l[1]] }
	}
}

class DefenderTurn extends NightTurn {
	readonly key = 'defender' as const
	readonly role = 'defender' as const
	readonly actionType = 'PROTECT'
	readonly wakeVoice = Sounds.voice.DefenderWake
	readonly sleepVoice = Sounds.voice.DefenderSleep

	isComplete(state: WerewolfState): boolean {
		return state.protectedId !== null
	}

	validActions(state: WerewolfState, playerId: string): Action[] {
		if (state.roles[playerId] !== 'defender') return []
		if (!state.alive.includes(playerId) || state.powersLost) return []
		return [{ type: this.actionType, playerId }]
	}

	apply(state: WerewolfState, action: Action): WerewolfState {
		if (
			state.roles[action.playerId] !== 'defender' ||
			state.nightStep !== 'defender' ||
			state.powersLost
		)
			return state
		const target = (action.payload as Payload)?.target
		if (!target || !state.alive.includes(target) || target === state.defenderLast) return state
		return { ...state, protectedId: target }
	}
}

class WolvesTurn extends NightTurn {
	readonly key = 'wolves' as const
	readonly role = 'werewolf' as const
	readonly actionType = 'NIGHT_VOTE'
	readonly wakeVoice = Sounds.voice.WolvesWake
	readonly sleepVoice = Sounds.voice.WolvesSleep

	timerMs(state: WerewolfState): number {
		const wolfCount = livingHolders(state, 'werewolf')
		return state.options.wolfTimerSeconds * 1000 * Math.max(1, wolfCount)
	}

	isComplete(state: WerewolfState): boolean {
		const wolves = state.alive.filter((p) => state.roles[p] === 'werewolf')
		return wolves.length > 0 && wolves.every((w) => state.nightVotes[w])
	}

	validActions(state: WerewolfState, playerId: string): Action[] {
		if (state.roles[playerId] !== 'werewolf' || !state.alive.includes(playerId)) return []
		if (state.nightVotes[playerId]) return []
		return [{ type: this.actionType, playerId }]
	}

	apply(state: WerewolfState, action: Action): WerewolfState {
		const target = (action.payload as Payload)?.target
		if (!target || !state.alive.includes(target) || target === action.playerId) return state
		if (state.roles[action.playerId] !== 'werewolf' || state.nightStep !== 'wolves') return state
		return { ...state, nightVotes: { ...state.nightVotes, [action.playerId]: target } }
	}
}

class WitchTurn extends NightTurn {
	readonly key = 'witch' as const
	readonly role = 'witch' as const
	readonly actionType = 'WITCH_ACT'
	readonly wakeVoice = Sounds.voice.WitchWake
	readonly sleepVoice = Sounds.voice.WitchSleep

	protected extraActive(state: WerewolfState): boolean {
		return !(state.witchSaveUsed && state.witchKillUsed)
	}

	isComplete(state: WerewolfState): boolean {
		return state.witchActed
	}

	validActions(state: WerewolfState, playerId: string): Action[] {
		if (state.roles[playerId] !== 'witch' || !state.alive.includes(playerId) || state.powersLost)
			return []
		if (state.witchSaveUsed && state.witchKillUsed) return []
		return [{ type: this.actionType, playerId }]
	}

	apply(state: WerewolfState, action: Action): WerewolfState {
		if (state.roles[action.playerId] !== 'witch' || state.nightStep !== 'witch' || state.powersLost)
			return state
		const payload = action.payload as Payload
		let { witchSaveUsed, witchKillUsed, witchSavedVictim, witchKillTarget } = state
		const victim = majority(state.nightVotes)
		if (payload?.save && !witchSaveUsed && victim && state.alive.includes(victim)) {
			witchSavedVictim = true
			witchSaveUsed = true
		}
		const kill = payload?.kill
		if (kill && !witchKillUsed && state.alive.includes(kill) && kill !== action.playerId) {
			witchKillTarget = kill
			witchKillUsed = true
		}
		return {
			...state,
			witchSaveUsed,
			witchKillUsed,
			witchSavedVictim,
			witchKillTarget,
			witchActed: true
		}
	}
}

class SeerTurn extends NightTurn {
	readonly key = 'seer' as const
	readonly role = 'seer' as const
	readonly actionType = 'SEER_PEEK'
	readonly wakeVoice = Sounds.voice.SeerWake
	readonly sleepVoice = Sounds.voice.SeerSleep

	protected extraActive(state: WerewolfState): boolean {
		return !state.seerReveal
	}

	isComplete(state: WerewolfState): boolean {
		return state.seerReveal !== null
	}

	validActions(state: WerewolfState, playerId: string): Action[] {
		if (state.roles[playerId] !== 'seer' || !state.alive.includes(playerId) || state.powersLost)
			return []
		if (state.seerReveal) return []
		return [{ type: this.actionType, playerId }]
	}

	apply(state: WerewolfState, action: Action): WerewolfState {
		const target = (action.payload as Payload)?.target
		if (!target || !state.alive.includes(target) || target === action.playerId) return state
		if (state.roles[action.playerId] !== 'seer' || state.nightStep !== 'seer' || state.powersLost)
			return state
		return { ...state, seerReveal: { target, role: state.roles[target] } }
	}
}

/** Fixed night order. Each entry owns one role's turn. */
export const TURNS: readonly Turn[] = [
	new CupidTurn(),
	new DefenderTurn(),
	new WolvesTurn(),
	new WitchTurn(),
	new SeerTurn()
]

export function turnByKey(key: NightStepKey): Turn | undefined {
	return TURNS.find((t) => t.key === key)
}

export function turnByActionType(type: string): Turn | undefined {
	return TURNS.find((t) => t.actionType === type)
}

export function firstActiveStep(state: WerewolfState): NightStepKey | null {
	return TURNS.find((t) => t.isActive(state))?.key ?? null
}

export function nextActiveStep(
	state: WerewolfState,
	current: NightStepKey | null
): NightStepKey | null {
	const start = current ? TURNS.findIndex((t) => t.key === current) + 1 : 0
	for (let i = start; i < TURNS.length; i++) {
		if (TURNS[i].isActive(state)) return TURNS[i].key
	}
	return null
}

export function startStep(state: WerewolfState, key: NightStepKey, now: number): WerewolfState {
	const turn = turnByKey(key)
	const durationMs = turn ? turn.timerMs(state) : state.options.roleTimerSeconds * 1000
	return {
		...state,
		phase: 'night',
		nightStep: key,
		phaseEndTime: now + durationMs,
		phaseDurationMs: durationMs
	}
}
