import type { GameStateGeneric } from '$lib/core/types'
import type { GameDefinition } from '$lib/engine'
import { color } from './color'
import { fight } from './fight'
import { presidents } from './presidents'
import { purple } from './purple'
import colorRules from './rules/color.json'
import fightRules from './rules/fight.json'
import presidentsRules from './rules/presidents.json'
import purpleRules from './rules/purple.json'
import warRules from './rules/war.json'
import { war } from './war'

export const games = { war, fight, color, presidents, purple } as unknown as Record<
	string,
	GameDefinition<GameStateGeneric>
>

export const gameList: { id: string; minPlayers: number; maxPlayers: number; isNew?: boolean }[] =
	Object.values(games as Record<string, GameDefinition<GameStateGeneric>>).map((g) => ({
		id: g.id,
		minPlayers: g.minPlayers,
		maxPlayers: g.maxPlayers,
		isNew: g.isNew
	}))

export const gameRules: Record<string, { en: string; fr: string }> = {
	color: colorRules,
	war: warRules,
	fight: fightRules,
	presidents: presidentsRules,
	purple: purpleRules
}
