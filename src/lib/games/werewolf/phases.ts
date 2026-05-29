import { firstActiveStep, startStep } from './turns'
import type { WerewolfState } from './types'
import { majority } from './votes'

export function enterNight(state: WerewolfState, now: number): WerewolfState {
	const fresh: WerewolfState = {
		...state,
		phase: 'night',
		nightVotes: {},
		protectedId: null,
		witchKillTarget: null,
		witchSavedVictim: false,
		witchActed: false,
		seerReveal: null
	}
	const first = firstActiveStep(fresh)
	if (!first) return enterDay(fresh, now)
	return startStep(fresh, first, now)
}

export function enterDay(state: WerewolfState, now: number): WerewolfState {
	// First day with the mayor option on: elect a mayor before discussion.
	if (state.options.mayorEnabled && state.mayor === null && !state.mayorElectionDone) {
		const durationMs = state.options.voteTimerSeconds * 1000
		return {
			...state,
			phase: 'day',
			nightStep: null,
			daySubPhase: 'electing',
			dayVotes: {},
			mayorVotes: {},
			phaseEndTime: now + durationMs,
			phaseDurationMs: durationMs
		}
	}
	return startDayTalking(state, now)
}

export function startDayTalking(state: WerewolfState, now: number): WerewolfState {
	const durationMs = state.options.talkTimerSeconds * 1000
	return {
		...state,
		phase: 'day',
		nightStep: null,
		daySubPhase: 'talking',
		dayVotes: {},
		phaseEndTime: now + durationMs,
		phaseDurationMs: durationMs
	}
}

export function resolveMayorElection(state: WerewolfState, now: number): WerewolfState {
	const elected = majority(state.mayorVotes)
	const mayor = elected && state.alive.includes(elected) ? elected : null
	return startDayTalking({ ...state, mayor, mayorElectionDone: true }, now)
}

export function startDayVoting(state: WerewolfState, now: number): WerewolfState {
	const durationMs = state.options.voteTimerSeconds * 1000
	return {
		...state,
		daySubPhase: 'voting',
		phaseEndTime: now + durationMs,
		phaseDurationMs: durationMs
	}
}
