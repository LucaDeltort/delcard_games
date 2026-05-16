import type { GameStateGeneric } from '$lib/core/types'
import type { GameDefinition } from '$lib/engine'
import { fight } from './fight'
import fightRules from './rules/fight.json'
import unoRules from './rules/uno.json'
import warRules from './rules/war.json'
import { uno } from './uno'
import { war } from './war'

export const games = { war, fight, uno } as unknown as Record<
	string,
	GameDefinition<GameStateGeneric>
>

export const gameList: { id: string; minPlayers: number; maxPlayers: number }[] = Object.values(
	games as Record<string, GameDefinition<GameStateGeneric>>
).map((g) => ({
	id: g.id,
	minPlayers: g.minPlayers,
	maxPlayers: g.maxPlayers
}))

export const gameRules: Record<string, { en: string; fr: string }> = {
	uno: unoRules,
	war: warRules,
	fight: fightRules
}
