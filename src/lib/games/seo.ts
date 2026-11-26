import en from '$lib/i18n/en'
import fr from '$lib/i18n/fr'
import { gameList } from './index'

type GameInfo = (typeof gameList)[number]

function gameName(dict: typeof en | typeof fr, id: string): string {
	return (dict as unknown as Record<string, { name?: string }>)[id]?.name ?? id
}

/** "2" or "2–6" */
export function playerRange(g: GameInfo): string {
	return g.minPlayers === g.maxPlayers ? `${g.minPlayers}` : `${g.minPlayers}–${g.maxPlayers}`
}

/** Locale-independent names, so SEO tags stay correct whatever the active UI locale */
export function gameNames(id: string): { en: string; fr: string } {
	return { en: gameName(en, id), fr: gameName(fr, id) }
}
