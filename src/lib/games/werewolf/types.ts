import type { GameStateGeneric } from '$lib/core/types'
import type { Role } from './roles'

export type { Role } from './roles'

export type WerewolfOptions = {
	autoCompose: boolean
	werewolfCount: number
	villagerCount: number
	seerCount: number
	witchCount: number
	hunterCount: number
	cupidCount: number
	defenderCount: number
	elderCount: number
	scapegoatCount: number
	villageIdiotCount: number
	mayorEnabled: boolean
	wolfTimerSeconds: number
	roleTimerSeconds: number
	talkTimerSeconds: number
	voteTimerSeconds: number
}

export type RoleCountsOnly = Omit<
	WerewolfOptions,
	| 'autoCompose'
	| 'mayorEnabled'
	| 'wolfTimerSeconds'
	| 'roleTimerSeconds'
	| 'talkTimerSeconds'
	| 'voteTimerSeconds'
>

export type NightStepKey = 'cupid' | 'defender' | 'wolves' | 'witch' | 'seer'

export type WerewolfState = GameStateGeneric & {
	phase: 'night' | 'day' | 'gameover'
	nightStep: NightStepKey | null
	daySubPhase: 'electing' | 'talking' | 'voting'
	phaseEndTime: number | null
	phaseDurationMs: number | null
	round: number
	readyPlayers: string[]
	roles: Record<string, Role>
	alive: string[]

	// per-night intents (reset each night)
	nightVotes: Record<string, string>
	dayVotes: Record<string, string>
	mayorVotes: Record<string, string>
	protectedId: string | null
	witchKillTarget: string | null
	witchSavedVictim: boolean
	witchActed: boolean
	seerReveal: { target: string; role: Role } | null

	// persistent across the game
	lovers: [string, string] | null
	defenderLast: string | null
	witchSaveUsed: boolean
	witchKillUsed: boolean
	elderShieldUsed: boolean
	powersLost: boolean
	idiotRevealed: boolean

	// mayor
	mayor: string | null
	mayorElectionDone: boolean

	// reactive death follow-up
	pendingHunter: string | null
	// hunters that died in the same resolution and still owe a shot, behind the
	// one currently shooting (pendingHunter). Drained one at a time.
	hunterQueue: string[]
	pendingTransition: 'day' | 'night' | null
	pendingMayor: string | null
	pendingMayorTransition: 'day' | 'night' | null

	lastEliminated: string[]
	winTeam: 'villagers' | 'werewolves' | 'lovers' | null
	options: WerewolfOptions
}
