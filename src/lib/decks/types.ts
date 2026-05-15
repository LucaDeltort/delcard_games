import type { Card } from '$lib/core/types'

export type CardPack = {
	id: string
	name: string
	author?: string
	authorUrl?: string
	license?: string
	basePath: string
	ext?: string // file extension, default '.png'
	cardSrc?: (card: Card, basePath: string, ext: string) => string
}
