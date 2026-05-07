<script lang="ts">
import { ArrowLeft } from 'lucide-svelte'
import { page } from '$app/stores'
import PlayingCard from '$lib/components/PlayingCard.svelte'
import { getDeckBySlug } from '$lib/decks/registry'
import { t } from '$lib/i18n'
import { deckPacks, resolvePackFor } from '$lib/stores/deckPacks'

const slug = $derived($page.params.type ?? '')
const entry = $derived(getDeckBySlug(slug))
const currentPack = $derived(resolvePackFor($deckPacks, slug))

const cardsBySuit = $derived.by(() => {
	if (!entry) return []
	const cards = entry.createCards()
	const suits = [...new Set(cards.filter((c) => c.suit).map((c) => c.suit!))]
	return suits.map((suit) => ({ suit, cards: cards.filter((c) => c.suit === suit) }))
})

const jokers = $derived(entry ? entry.createCards().filter((c) => c.face === 'Joker') : [])
</script>

{#if entry}
	<div class="mx-auto max-w-3xl px-4 py-8">
		<div class="mb-6 flex items-center gap-3">
			<a
				href="/decks"
				class="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowLeft size={14} />
				{$t('decks.title')}
			</a>
		</div>

		<div class="mb-6 flex flex-wrap items-end justify-between gap-4">
			<h1 class="text-2xl font-bold tracking-tight">{entry.name}</h1>

			<div class="flex gap-2">
				{#each entry.packs as pack}
					<button
						onclick={() => deckPacks.select(entry.slug, pack)}
						class="rounded-full border px-3 py-1 text-sm transition-colors {currentPack.id === pack.id
							? 'border-primary bg-primary text-primary-foreground'
							: 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}"
					>
						{pack.name}
					</button>
				{/each}
			</div>
		</div>

		<p class="mb-8 text-xs text-muted-foreground">
			{$t('decks.by', { name: currentPack.author })}
			{#if currentPack.license}· {currentPack.license}{/if}
		</p>

		<div class="flex flex-col gap-6">
			{#each cardsBySuit as { suit, cards }}
				<div>
					<p class="mb-2 text-xs capitalize tracking-widest text-muted-foreground uppercase">
						{suit}
					</p>
					<div class="flex flex-wrap gap-1.5">
						{#each cards as card (card.id)}
							<PlayingCard {card} size="sm" deckSlug={entry.slug} />
						{/each}
					</div>
				</div>
			{/each}

			{#if jokers.length > 0}
				<div>
					<p class="mb-2 text-xs tracking-widest text-muted-foreground uppercase">Jokers</p>
					<div class="flex flex-wrap gap-1.5">
						{#each jokers as card (card.id)}
							<PlayingCard {card} size="sm" deckSlug={entry.slug} />
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<div class="flex min-h-[40vh] flex-col items-center justify-center gap-4">
		<p class="text-muted-foreground">Unknown deck type.</p>
		<a href="/decks" class="text-sm text-primary hover:underline">{$t('decks.title')}</a>
	</div>
{/if}
