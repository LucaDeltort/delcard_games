<script lang="ts">
import type { Card } from '$lib/core/types'
import PlayingCard from './PlayingCard.svelte'

let {
	card = null,
	label,
	count,
	back = false,
	size = 'md',
	countVariant = 'default'
}: {
	card?: Card | null
	label: string
	count?: number
	back?: boolean
	size?: 'sm' | 'md' | 'lg'
	countVariant?: 'default' | 'accent'
} = $props()

const showBadge = $derived(count !== undefined && count > 0)
</script>

<div class="flex flex-col items-center gap-2">
	{#if showBadge}
		<div class="relative">
			<PlayingCard {card} {back} {size} />
			<span
				class="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full text-xs
				{countVariant === 'accent'
					? 'bg-accent text-accent-foreground'
					: 'bg-secondary text-muted-foreground'}"
			>
				{count}
			</span>
		</div>
	{:else}
		<PlayingCard {card} {back} {size} />
	{/if}
	<span class="text-xs text-muted-foreground">{label}</span>
</div>
