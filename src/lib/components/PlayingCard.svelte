<script lang="ts">
import type { Card } from '$lib/core/types'
import { t } from '$lib/i18n'
import { deckPacks, resolvePackFor } from '$lib/stores/deckPacks'

let {
	card = null,
	back = false,
	size = 'md',
	deckSlug = 'french-deck'
}: {
	card?: Card | null
	back?: boolean
	size?: 'sm' | 'md' | 'lg'
	deckSlug?: string
} = $props()

const sizes = {
	sm: 'w-[52px] h-[73px]',
	md: 'w-[72px] h-[101px]',
	lg: 'w-[96px] h-[134px]'
}

const src = $derived.by(() => {
	const pack = resolvePackFor($deckPacks, deckSlug)
	const ext = pack.ext ?? '.png'
	if (!card) return null
	if (back || card.isHidden) return `${pack.basePath}/card_back${ext}`
	if (card.face === 'Joker') return `${pack.basePath}/card_joker_${card.suit}${ext}`
	const faceKey = /^\d$/.test(card.face) ? `0${card.face}` : card.face
	return `${pack.basePath}/card_${card.suit}_${faceKey}${ext}`
})

const alt = $derived.by(() => {
	if (!card) return ''
	if (card.isHidden || back) return $t('card.hidden')
	if (card.face === 'Joker') return $t('card.joker')
	const suitKey = `card.suit.${card.suit}`
	const suitLabel = card.suit ? $t(suitKey) : ''
	return suitLabel && suitLabel !== suitKey
		? $t('card.label', { face: card.face, suit: suitLabel })
		: card.face
})
</script>

{#if !card}
	<div class="{sizes[size]} rounded-lg border-2 border-dashed border-border bg-secondary/30"></div>
{:else}
	<img
		{src}
		{alt}
		class="{sizes[size]} rounded-lg object-contain shadow-md"
		draggable="false"
	/>
{/if}
