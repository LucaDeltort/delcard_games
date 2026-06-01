import type { GameStateGeneric } from '$lib/core/types'
import type { GameDefinition } from '$lib/engine'
import { color } from './color/color'
import colorRules from './color/rules.json'
import { fight } from './fight/fight'
import fightRules from './fight/rules.json'
import { presidents } from './presidents/presidents'
import presidentsRules from './presidents/rules.json'
import { purple } from './purple/purple'
import purpleRules from './purple/rules.json'
import warRules from './war/rules.json'
import { war } from './war/war'
import werewolfRules from './werewolf/rules.json'
import { werewolf } from './werewolf/werewolf'
import yamsRules from './yams/rules.json'
import { yams } from './yams/yams'

export const games = { war, fight, color, presidents, purple, werewolf, yams } as unknown as Record<
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
	purple: purpleRules,
	werewolf: werewolfRules,
	yams: yamsRules
}
