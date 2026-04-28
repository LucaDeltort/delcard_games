import { derived, writable } from 'svelte/store'
import { browser } from '$app/environment'
import en from './en'
import fr from './fr'

export type Locale = 'fr' | 'en'
type Params = Record<string, string | number>

const translations: Record<Locale, typeof fr> = { fr, en }

function getStored(): Locale {
	if (!browser) return 'fr'
	const v = localStorage.getItem('locale')
	return v === 'en' ? 'en' : 'fr'
}

export const locale = writable<Locale>(getStored())

locale.subscribe((v) => {
	if (browser) localStorage.setItem('locale', v)
})

function resolve(dict: object, key: string): string | undefined {
	return key.split('.').reduce((obj: unknown, k) => {
		if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[k]
		return undefined
	}, dict) as string | undefined
}

export const t = derived(locale, ($locale) => {
	const dict = translations[$locale]
	return (key: string, params?: Params): string => {
		const raw = resolve(dict, key)
		if (typeof raw !== 'string') return key
		if (!params) return raw
		return raw.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
	}
})
