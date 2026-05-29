import { ROLE_DEFS, SPECIAL_ROLES } from './roles'
import type { Role, RoleCountsOnly, WerewolfOptions } from './types'

/** Balance score window inside which a randomly drawn composition is accepted. */
const SCORE_MIN = -2
const SCORE_MAX = 2
const MAX_ATTEMPTS = 500

const SPECIAL_WEIGHTS = SPECIAL_ROLES.map((r) => [r.countKey, r.weight] as const)
const WEIGHT_VILLAGER = ROLE_DEFS.find((r) => r.key === 'villager')!.weight
const WEIGHT_WEREWOLF = ROLE_DEFS.find((r) => r.key === 'werewolf')!.weight

function emptyCounts(): RoleCountsOnly {
	const c = {} as RoleCountsOnly
	for (const def of ROLE_DEFS) (c as Record<string, number>)[def.countKey] = 0
	return c
}

function score(c: RoleCountsOnly): number {
	let total = c.werewolfCount * WEIGHT_WEREWOLF + c.villagerCount * WEIGHT_VILLAGER
	for (const [key, weight] of SPECIAL_WEIGHTS) total += c[key] * weight
	return total
}

function shuffleArr<T>(arr: readonly T[]): T[] {
	const a = [...arr]
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[a[i], a[j]] = [a[j], a[i]]
	}
	return a
}

/**
 * Procedurally generate a balanced composition. Picks a random subset of
 * special roles (one slot each), fills the rest with villagers, and accepts
 * the first composition whose score lands in [SCORE_MIN, SCORE_MAX]. Falls
 * back to a safe wolves + 1 seer + villagers split.
 */
export function autoComposition(n: number): RoleCountsOnly {
	const wolves = Math.max(1, Math.floor(n / 4))
	const nonWolfSlots = n - wolves
	const maxSpecials = Math.min(SPECIAL_WEIGHTS.length, Math.max(0, nonWolfSlots))

	for (let attempt = 0; attempt < MAX_ATTEMPTS && maxSpecials >= 1; attempt++) {
		const k = 1 + Math.floor(Math.random() * maxSpecials)
		const picked = shuffleArr(SPECIAL_WEIGHTS).slice(0, k)
		const composition = emptyCounts()
		composition.werewolfCount = wolves
		for (const [key] of picked) composition[key] = 1
		composition.villagerCount = nonWolfSlots - k
		const total = score(composition)
		if (total >= SCORE_MIN && total <= SCORE_MAX) return composition
	}

	const fallback = emptyCounts()
	fallback.werewolfCount = wolves
	fallback.seerCount = nonWolfSlots >= 1 ? 1 : 0
	fallback.villagerCount = Math.max(0, nonWolfSlots - fallback.seerCount)
	return fallback
}

export function assignRoles(players: string[], options: WerewolfOptions): Record<string, Role> {
	const specials: Role[] = SPECIAL_ROLES.flatMap((def) =>
		Array<Role>(Math.max(0, options[def.countKey] as number)).fill(def.key as Role)
	)
	const roles: Role[] = [
		...Array<Role>(Math.max(0, options.werewolfCount)).fill('werewolf'),
		...specials,
		...Array<Role>(Math.max(0, options.villagerCount)).fill('villager')
	]
	const shuffled = shuffleArr(roles)
	return Object.fromEntries(players.map((pid, i) => [pid, shuffled[i] ?? 'villager']))
}
