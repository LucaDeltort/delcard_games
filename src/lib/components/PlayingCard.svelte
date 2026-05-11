<script lang="ts">
import type { Card } from '$lib/core/types'
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
</script>

{#if !card}
	<div class="{sizes[size]} rounded-lg border-2 border-dashed border-border bg-secondary/30"></div>
{:else}
	<img
		{src}
		alt={card.isHidden || back
			? 'Carte cachée'
			: `${card.face}${card.suit ? ' de ' + card.suit : ''}`}
		class="{sizes[size]} rounded-lg object-contain shadow-md"
		draggable="false"
	/>
{/if}
