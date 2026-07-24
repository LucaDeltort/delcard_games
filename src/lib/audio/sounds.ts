// Sound catalog. Each sound is a self-describing descriptor; the namespace it
// lives in sets whether it's localized — no parallel "is localized" set to sync.
//
//   Sounds.sfx.CardFlip     -> static/sounds/card-flip.ogg              (one shared file)
//   Sounds.voice.NightFalls -> static/sounds/<locale>/night-falls.ogg   (one file per lang)
//
// sfx and voice may share a stem (sfx.Win + voice.Win) — they're distinct files.

import type { Locale } from '$lib/i18n'

export type SoundDef = {
	readonly id: string // filename stem
	readonly localized: boolean
	readonly gain: number // 0..1 baseline level relative to master volume
}

const sfx = (id: string, gain = 1): SoundDef => ({ id, localized: false, gain })
const voice = (id: string, gain = 1): SoundDef => ({ id, localized: true, gain })

export const Sounds = {
	sfx: {
		CardFlip: sfx('card-flip'),
		DiceRoll: sfx('dice-roll'),
		Boom: sfx('boom'),
		Win: sfx('win', 0.7),
		Lose: sfx('lose', 0.7)
	},
	voice: {
		// Werewolf narration. wake/sleep pairs per night role + phase + game over.
		NightFalls: voice('night-falls'),
		DayBreaks: voice('day-breaks'),
		CupidWake: voice('cupid-wake'),
		CupidSleep: voice('cupid-sleep'),
		LoversWake: voice('lovers-wake'),
		LoversSleep: voice('lovers-sleep'),
		DefenderWake: voice('defender-wake'),
		DefenderSleep: voice('defender-sleep'),
		WolvesWake: voice('wolves-wake'),
		WolvesSleep: voice('wolves-sleep'),
		WitchWake: voice('witch-wake'),
		WitchSleep: voice('witch-sleep'),
		SeerWake: voice('seer-wake'),
		SeerSleep: voice('seer-sleep'),
		VillageWins: voice('village-wins'),
		WolvesWin: voice('wolves-win'),
		LoversWin: voice('lovers-win')
	}
} as const

const EXT = 'ogg'

export function soundFile(s: SoundDef, locale: Locale): string {
	return s.localized ? `/sounds/${locale}/${s.id}.${EXT}` : `/sounds/${s.id}.${EXT}`
}

export const ALL_SOUNDS: SoundDef[] = [...Object.values(Sounds.sfx), ...Object.values(Sounds.voice)]
