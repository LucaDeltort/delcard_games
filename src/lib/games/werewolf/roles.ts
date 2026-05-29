/**
 * Single source of truth for the implemented roles.
 *
 * To add a role: append an entry here, add the matching `<key>Count` field to
 * `WerewolfOptions` (types.ts), add i18n strings, and — if the role has a night
 * action — add a `Turn` class in turns.ts. Composition, options schema and
 * setup defaults are all derived from this list.
 */
export const ROLE_DEFS = [
	{
		key: 'werewolf',
		countKey: 'werewolfCount',
		special: false,
		weight: -6,
		defaultCount: 1,
		min: 1,
		max: 8
	},
	{
		key: 'villager',
		countKey: 'villagerCount',
		special: false,
		weight: 1,
		defaultCount: 1,
		min: 0,
		max: 12
	},
	{ key: 'seer', countKey: 'seerCount', special: true, weight: 7, defaultCount: 1, min: 0, max: 2 },
	{
		key: 'witch',
		countKey: 'witchCount',
		special: true,
		weight: 4,
		defaultCount: 0,
		min: 0,
		max: 2
	},
	{
		key: 'hunter',
		countKey: 'hunterCount',
		special: true,
		weight: 3,
		defaultCount: 0,
		min: 0,
		max: 2
	},
	{
		key: 'defender',
		countKey: 'defenderCount',
		special: true,
		weight: 3,
		defaultCount: 0,
		min: 0,
		max: 2
	},
	{
		key: 'elder',
		countKey: 'elderCount',
		special: true,
		weight: 2,
		defaultCount: 0,
		min: 0,
		max: 1
	},
	{
		key: 'village-idiot',
		countKey: 'villageIdiotCount',
		special: true,
		weight: 1,
		defaultCount: 0,
		min: 0,
		max: 1
	},
	{
		key: 'scapegoat',
		countKey: 'scapegoatCount',
		special: true,
		weight: -1,
		defaultCount: 0,
		min: 0,
		max: 1
	},
	{
		key: 'cupid',
		countKey: 'cupidCount',
		special: true,
		weight: -2,
		defaultCount: 0,
		min: 0,
		max: 1
	}
] as const

export type Role = (typeof ROLE_DEFS)[number]['key']
export type RoleCountKey = (typeof ROLE_DEFS)[number]['countKey']

export const SPECIAL_ROLES = ROLE_DEFS.filter((r) => r.special)
