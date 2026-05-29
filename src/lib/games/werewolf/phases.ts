import { firstActiveStep, startStep } from './turns'
import type { WerewolfState } from './types'
import { majority } from './votes'

export function enterNight(state: WerewolfState): WerewolfState {
	const fresh: WerewolfState = {
		...state,
		phase: 'night',
		nightVotes: {},
		protectedId: null,
		witchKillTarget: null,
		witchSavedVictim: false,
		witchActed: false,
		seerReveal: undefined
	}
	const first = firstActiveStep(fresh)
	if (!first) return enterDay(fresh)
	return startStep(fresh, first)
}

export function enterDay(state: WerewolfState): WerewolfState {
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
			phaseEndTime: Date.now() + durationMs,
			phaseDurationMs: durationMs
		}
	}
	return startDayTalking(state)
}

export function startDayTalking(state: WerewolfState): WerewolfState {
	const durationMs = state.options.talkTimerSeconds * 1000
	return {
		...state,
		phase: 'day',
		nightStep: null,
		daySubPhase: 'talking',
		dayVotes: {},
		phaseEndTime: Date.now() + durationMs,
		phaseDurationMs: durationMs
	}
}

export function resolveMayorElection(state: WerewolfState): WerewolfState {
	const elected = majority(state.mayorVotes)
	const mayor = elected && state.alive.includes(elected) ? elected : null
	return startDayTalking({ ...state, mayor, mayorElectionDone: true })
}

export function startDayVoting(state: WerewolfState): WerewolfState {
	const durationMs = state.options.voteTimerSeconds * 1000
	return {
		...state,
		daySubPhase: 'voting',
		phaseEndTime: Date.now() + durationMs,
		phaseDurationMs: durationMs
	}
}
