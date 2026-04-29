<script lang="ts">
import type { Card } from '$lib/core/types'
import { defaultFrenchDeckPack } from '$lib/decks/FrenchDeck/packs'

let {
	card = null,
	back = false,
	size = 'md'
}: {
	card?: Card | null
	back?: boolean
	size?: 'sm' | 'md' | 'lg'
} = $props()

// Future: replace with a per-player store (localStorage-backed)
const pack = defaultFrenchDeckPack
const ext = pack.ext ?? '.png'

const sizes = {
	sm: 'w-[52px] h-[73px]',
	md: 'w-[72px] h-[101px]',
	lg: 'w-[96px] h-[134px]'
}

function cardUrl(face: string, suit?: string): string {
	if (!suit) return `${pack.basePath}/card_joker_black${ext}`
	const faceKey = /^\d$/.test(face) ? `0${face}` : face
	return `${pack.basePath}/card_${suit}_${faceKey}${ext}`
}

const src = $derived(
	!card
		? null
		: back || card.isHidden
			? `${pack.basePath}/card_back${ext}`
			: cardUrl(card.face, card.suit)
)
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
