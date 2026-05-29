import { enterDay, enterNight } from './phases'
import type { Role, WerewolfState } from './types'
import { majority } from './votes'

/** Day-vote tally where the mayor's ballot counts double. */
function dayTally(votes: Record<string, string>, mayor: string | null): Array<[string, number]> {
	const counts: Record<string, number> = {}
	for (const [voter, target] of Object.entries(votes)) {
		counts[target] = (counts[target] ?? 0) + (voter === mayor ? 2 : 1)
	}
	return Object.entries(counts).sort((a, b) => b[1] - a[1])
}
function dayMajority(votes: Record<string, string>, mayor: string | null): string | undefined {
	return dayTally(votes, mayor)[0]?.[0]
}
function dayIsTie(votes: Record<string, string>, mayor: string | null): boolean {
	const t = dayTally(votes, mayor)
	return t.length >= 2 && t[0][1] === t[1][1]
}

export function team(roles: Record<string, Role>, p: string): 'wolf' | 'village' {
	return roles[p] === 'werewolf' ? 'wolf' : 'village'
}

export function checkWin(state: WerewolfState): 'villagers' | 'werewolves' | 'lovers' | null {
	const { alive, roles, lovers } = state
	if (lovers && alive.includes(lovers[0]) && alive.includes(lovers[1])) {
		const mixed = team(roles, lovers[0]) !== team(roles, lovers[1])
		if (mixed && alive.length === 2) return 'lovers'
	}
	const wolves = alive.filter((p) => roles[p] === 'werewolf')
	const others = alive.filter((p) => roles[p] !== 'werewolf')
	if (wolves.length === 0) return 'villagers'
	if (wolves.length >= others.length) return 'werewolves'
	return null
}

export function applyDeaths(
	state: WerewolfState,
	victims: string[]
): { alive: string[]; deaths: string[]; hunter: string | null } {
	const dead = new Set<string>()
	const queue = victims.filter((v) => state.alive.includes(v))
	while (queue.length) {
		const v = queue.pop()!
		if (dead.has(v)) continue
		dead.add(v)
		if (state.lovers && state.lovers.includes(v)) {
			const partner = state.lovers[0] === v ? state.lovers[1] : state.lovers[0]
			if (state.alive.includes(partner) && !dead.has(partner)) queue.push(partner)
		}
	}
	const deaths = [...dead]
	const alive = state.alive.filter((p) => !dead.has(p))
	const hunter = deaths.find((p) => state.roles[p] === 'hunter' && !state.powersLost) ?? null
	return { alive, deaths, hunter }
}

/**
 * After deaths are applied and any hunter shot resolved, check for game end,
 * then pause for mayor succession if the mayor just died, else move on.
 */
export function finalizeTransition(s: WerewolfState, nextPhase: 'day' | 'night'): WerewolfState {
	const win = checkWin(s)
	if (win)
		return {
			...s,
			phase: 'gameover',
			winTeam: win,
			pendingHunter: null,
			pendingTransition: null,
			pendingMayor: null,
			pendingMayorTransition: null,
			phaseEndTime: null,
			phaseDurationMs: null
		}
	if (
		s.options.mayorEnabled &&
		s.mayor &&
		!s.alive.includes(s.mayor) &&
		!s.pendingMayor &&
		s.alive.length > 0
	) {
		const durationMs = s.options.roleTimerSeconds * 1000
		return {
			...s,
			pendingMayor: s.mayor,
			pendingMayorTransition: nextPhase,
			phaseEndTime: Date.now() + durationMs,
			phaseDurationMs: durationMs
		}
	}
	return nextPhase === 'day' ? enterDay(s) : enterNight({ ...s, round: s.round + 1 })
}

export function finishResolution(
	state: WerewolfState,
	victims: string[],
	nextPhase: 'day' | 'night'
): WerewolfState {
	const { alive, deaths, hunter } = applyDeaths(state, victims)
	const s: WerewolfState = { ...state, alive, lastEliminated: deaths }
	if (hunter) {
		const durationMs = state.options.roleTimerSeconds * 1000
		return {
			...s,
			pendingHunter: hunter,
			pendingTransition: nextPhase,
			phaseEndTime: Date.now() + durationMs,
			phaseDurationMs: durationMs
		}
	}
	return finalizeTransition(s, nextPhase)
}

export function resumeAfterHunter(state: WerewolfState): WerewolfState {
	const nextPhase = state.pendingTransition
	const s: WerewolfState = { ...state, pendingHunter: null, pendingTransition: null }
	if (!nextPhase) return s
	return finalizeTransition(s, nextPhase)
}

/** Dying mayor appoints a successor (or NEXT_PHASE skips it), then continue. */
export function resolveMayorSuccession(
	state: WerewolfState,
	successor: string | null
): WerewolfState {
	const nextPhase = state.pendingMayorTransition
	const mayor = successor && state.alive.includes(successor) ? successor : null
	const s: WerewolfState = { ...state, mayor, pendingMayor: null, pendingMayorTransition: null }
	if (!nextPhase) return s
	return finalizeTransition(s, nextPhase)
}

export function resolveNight(state: WerewolfState): WerewolfState {
	const wolfTarget = majority(state.nightVotes)
	let elderShieldUsed = state.elderShieldUsed
	const victims: string[] = []
	if (wolfTarget && state.alive.includes(wolfTarget)) {
		const saved = state.protectedId === wolfTarget || state.witchSavedVictim
		if (!saved) {
			if (state.roles[wolfTarget] === 'elder' && !elderShieldUsed && !state.powersLost) {
				elderShieldUsed = true
			} else {
				victims.push(wolfTarget)
			}
		}
	}
	if (
		state.witchKillTarget &&
		state.alive.includes(state.witchKillTarget) &&
		!victims.includes(state.witchKillTarget)
	) {
		victims.push(state.witchKillTarget)
	}
	const base: WerewolfState = {
		...state,
		elderShieldUsed,
		defenderLast: state.protectedId ?? state.defenderLast
	}
	return finishResolution(base, victims, 'day')
}

export function resolveDay(state: WerewolfState): WerewolfState {
	const victims: string[] = []
	let idiotRevealed = state.idiotRevealed
	let powersLost = state.powersLost
	if (dayIsTie(state.dayVotes, state.mayor)) {
		const scapegoat = state.alive.find((p) => state.roles[p] === 'scapegoat' && !state.powersLost)
		if (scapegoat) victims.push(scapegoat)
	} else {
		const target = dayMajority(state.dayVotes, state.mayor)
		if (target && state.alive.includes(target)) {
			if (state.roles[target] === 'village-idiot' && !idiotRevealed && !powersLost) {
				idiotRevealed = true
			} else {
				victims.push(target)
				if (state.roles[target] === 'elder') powersLost = true
			}
		}
	}
	const base: WerewolfState = { ...state, idiotRevealed, powersLost }
	return finishResolution(base, victims, 'night')
}
