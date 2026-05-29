import { ROLE_DEFS, SPECIAL_ROLES } from './roles'
import type { Role, RoleCountsOnly, WerewolfOptions } from './types'

/**
 * Balance score window inside which a composition is accepted. Tuned so the
 * greedy fallback can always land in window for the supported player range
 * (4–16) — the wolf weight (-6) cannot be offset within ±2 at higher counts.
 */
const SCORE_MIN = -3
const SCORE_MAX = 3
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

	return fallbackComposition(wolves, nonWolfSlots)
}

/**
 * Deterministic balancer: greedily adds the lightest positive-weight special
 * that doesn't push score past SCORE_MAX until score sits in window. Ensures
 * the fallback itself satisfies the same balance contract as random picks.
 */
function fallbackComposition(wolves: number, nonWolfSlots: number): RoleCountsOnly {
	const composition = emptyCounts()
	composition.werewolfCount = wolves
	let remaining = nonWolfSlots
	const positives = [...SPECIAL_WEIGHTS].filter(([, w]) => w > 0).sort((a, b) => a[1] - b[1])
	while (remaining > 0) {
		const trial = { ...composition, villagerCount: remaining } as RoleCountsOnly
		const s = score(trial)
		if (s >= SCORE_MIN && s <= SCORE_MAX) break
		const next = positives.find(([key, weight]) => {
			if (composition[key] > 0) return false
			return (
				score({ ...composition, [key]: 1, villagerCount: remaining - 1 } as RoleCountsOnly) <=
				SCORE_MAX
			)
		})
		if (!next) break
		composition[next[0]] = 1
		remaining--
	}
	composition.villagerCount = remaining
	return composition
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
