import type { Card } from '$lib/core/types'
import { getDeckBySlug } from '$lib/decks/registry'
import type { CardPack } from '$lib/decks/types'

export function cardSrc(card: Card, pack: CardPack, back = false): string {
	const ext = pack.ext ?? '.png'
	if (back || card.isHidden) return `${pack.basePath}/card_back${ext}`
	if (pack.cardSrc) return pack.cardSrc(card, pack.basePath, ext)
	if (card.face === 'Joker') return `${pack.basePath}/card_joker_${card.suit}${ext}`
	if (!card.suit) return `${pack.basePath}/card_${card.face.toLowerCase()}${ext}`
	const faceKey = /^\d$/.test(card.face) ? `0${card.face}` : card.face
	return `${pack.basePath}/card_${card.suit}_${faceKey}${ext}`
}

export type PreloadProgress = (loaded: number, total: number) => void

export type PreloadHandle = {
	promise: Promise<void>
	cancel: () => void
}

export function preloadPack(
	deckSlug: string,
	pack: CardPack,
	onProgress?: PreloadProgress
): PreloadHandle {
	const noop = () => {
		// no-op
	}
	const entry = getDeckBySlug(deckSlug)
	if (!entry) {
		return { promise: Promise.resolve(), cancel: noop }
	}

	const cards = entry.createCards()
	const urls = new Set<string>([`${pack.basePath}/card_back${pack.ext ?? '.png'}`])
	for (const card of cards) urls.add(cardSrc(card, pack))

	const total = urls.size
	let loaded = 0
	let cancelled = false

	onProgress?.(0, total)

	const promise = new Promise<void>((resolve) => {
		if (total === 0) {
			resolve()
			return
		}
		for (const url of urls) {
			const img = new Image()
			img.onload = img.onerror = () => {
				if (cancelled) return
				loaded += 1
				onProgress?.(loaded, total)
				if (loaded === total) resolve()
			}
			img.src = url
		}
	})

	return {
		promise,
		cancel: () => {
			cancelled = true
		}
	}
}
