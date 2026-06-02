<script lang="ts">
import { Dialog } from 'bits-ui'
import { ArrowLeft, Check, Flag, X } from 'lucide-svelte'
import { page } from '$app/stores'
import Seo from '$lib/components/Seo.svelte'
import type { Card } from '$lib/core/types'
import { cardSrc, preloadPack } from '$lib/decks/preload'
import { getDeckBySlug } from '$lib/decks/registry'
import { t } from '$lib/i18n'
import { deckPacks, resolvePackFor } from '$lib/stores/deckPacks'

const slug = $derived($page.params.type ?? '')
const entry = $derived(getDeckBySlug(slug))
const defaultPack = $derived(resolvePackFor($deckPacks, slug))

let previewPackId = $state<string | null>(null)
let renderedPackId = $state<string | null>(null)
let loading = $state(false)
let activeHandle: { cancel: () => void } | null = null
let selectedCard = $state<Card | null>(null)

$effect(() => {
	slug
	previewPackId = null
	renderedPackId = null
	loading = false
})

const previewPack = $derived(entry?.packs.find((p) => p.id === previewPackId) ?? defaultPack)
const renderedPack = $derived(entry?.packs.find((p) => p.id === renderedPackId) ?? defaultPack)

const allCards = $derived(entry ? entry.createCards() : [])
const cardsBySuit = $derived.by(() => {
	const cards = allCards.filter((c) => c.face !== 'Joker')
	const suits = [...new Set(cards.filter((c) => c.suit).map((c) => c.suit!))]
	return suits.map((suit) => ({ suit, cards: cards.filter((c) => c.suit === suit) }))
})
const jokers = $derived(
	allCards.filter((c) => c.face === 'Joker' || !c.suit).sort((a, b) => a.face.localeCompare(b.face))
)

const selectedDetails = $derived(
	selectedCard && entry?.getCardDetails ? entry.getCardDetails(selectedCard) : null
)

async function switchPack(packId: string) {
	previewPackId = packId === defaultPack.id ? null : packId
	const pack = entry?.packs.find((p) => p.id === packId) ?? defaultPack
	if (!entry || !pack) return

	activeHandle?.cancel()
	loading = true

	const handle = preloadPack(slug, pack)
	activeHandle = handle
	await handle.promise

	if (activeHandle !== handle) return
	renderedPackId = packId
	loading = false
}
</script>

<Seo
	title={entry ? `${entry.name} — Delcard` : 'Deck — Delcard'}
	description={entry ? `Browse ${entry.name} card packs and styles.` : ''}
	canonical="/decks/{slug}"
	noindex={!entry}
/>

<div class="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
	<div class="mb-6">
		<a
			href="/decks"
			class="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<ArrowLeft size={14} />
			{$t('decks.title')}
		</a>
	</div>

	{#if entry}
		<h1 class="mb-8 text-2xl tracking-tight">{$t(entry.nameKey)}</h1>

		<div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
			<aside class="w-full shrink-0 lg:sticky lg:top-8 lg:w-56">
				<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
					{#each entry.packs as pack}
						{@const ext = pack.ext ?? '.png'}
						<button
							onclick={() => switchPack(pack.id)}
							disabled={loading}
							class="flex flex-col items-center gap-3 rounded-xl border p-4 transition-colors disabled:opacity-60 {previewPack.id ===
							pack.id
								? 'border-primary bg-primary/10'
								: 'border-border hover:border-primary/40 hover:bg-card'}"
						>
							<img
								src="{pack.basePath}/card_back{ext}"
								alt={pack.name}
								class="h-16 w-11 rounded object-contain shadow-md"
								draggable="false"
							/>
							<div class="flex items-center gap-1 text-sm">
								<span>{pack.name}</span>
								{#if pack.id === defaultPack.id}
									<Check size={11} class="text-primary" />
								{/if}
							</div>
						</button>
					{/each}
				</div>

				{#if previewPack.author || previewPack.license}
					<p class="mt-4 text-xs text-muted-foreground">
						{#if previewPack.author}{$t('decks.by', { name: previewPack.author })}{/if}
						{#if previewPack.license}· {previewPack.license}{/if}
					</p>
				{/if}

				<button
					onclick={() => deckPacks.select(slug, previewPack)}
					disabled={previewPack.id === defaultPack.id || loading}
					class="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors {previewPack.id ===
					defaultPack.id
						? 'cursor-default border-border text-muted-foreground opacity-40'
						: 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}"
				>
					<Flag size={13} />
					{$t('decks.setDefault')}
				</button>
			</aside>

			<div
				class="min-w-0 flex-1 transition-opacity duration-200 {loading
					? 'pointer-events-none opacity-40'
					: ''}"
			>
				<div class="flex flex-col gap-6">
					{#each cardsBySuit as { suit, cards }}
						<div>
							<p class="mb-2 text-xs uppercase tracking-widest text-muted-foreground">{$t('card.suit.' + suit)}</p>
							<div class="flex flex-wrap gap-1.5">
								{#each cards as card (card.id)}
									<img
										src={cardSrc(card, renderedPack)}
										alt="{card.face}{card.suit ? ' ' + card.suit : ''}"
										class="h-16 w-11 rounded-lg object-contain shadow-md sm:h-18.25 sm:w-13"
										draggable="false"
									/>
								{/each}
							</div>
						</div>
					{/each}

					{#if jokers.length > 0}
						{#each (entry.groupUnsuitedCards ? entry.groupUnsuitedCards(jokers) : [{ labelKey: entry.unsuitedLabelKey ?? 'decks.groupJokers', cards: jokers }]) as group}
							{#if group.cards.length > 0}
								<div>
									<p class="mb-2 text-xs tracking-widest text-muted-foreground uppercase">{$t(group.labelKey)}</p>
									<div class="flex flex-wrap gap-x-1.5 gap-y-7">
										{#each group.cards as card (card.id)}
											{@const details = entry.getCardDetails?.(card)}
											{#if details}
												<button
													onclick={() => (selectedCard = card)}
													class="group relative flex flex-col items-center rounded-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
												>
													<img
														src={cardSrc(card, renderedPack)}
														alt={$t(details.nameKey)}
														class="h-16 w-11 rounded-lg object-contain shadow-md sm:h-18.25 sm:w-13"
														draggable="false"
													/>
													<span class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-1.5 py-0.5 text-xs text-popover-foreground opacity-0 shadow transition-opacity group-hover:opacity-100">
														{$t(details.nameKey)}
													</span>
												</button>
											{:else}
												<img
													src={cardSrc(card, renderedPack)}
													alt="{card.face}{card.suit ? ' ' + card.suit : ''}"
													class="h-16 w-11 rounded-lg object-contain shadow-md sm:h-18.25 sm:w-13"
													draggable="false"
												/>
											{/if}
										{/each}
									</div>
								</div>
							{/if}
						{/each}
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<div class="flex min-h-[40vh] flex-col items-center justify-center gap-4">
			<p class="text-muted-foreground">{$t('decks.errorUnknownType')}</p>
		</div>
	{/if}
</div>

{#if entry?.getCardDetails}
	<Dialog.Root open={selectedCard !== null} onOpenChange={(v) => { if (!v) selectedCard = null }}>
		<Dialog.Portal>
			<Dialog.Overlay class="fixed inset-0 z-50 bg-black/50" />
			<Dialog.Content
				class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-xl focus:outline-none"
			>
				{#if selectedCard && selectedDetails}
					<div class="flex flex-col items-center gap-4 pt-2">
						<img
							src={cardSrc(selectedCard, renderedPack)}
							alt={$t(selectedDetails.nameKey)}
							class="h-36 w-24 rounded-xl object-contain shadow-lg"
							draggable="false"
						/>
						<div class="flex flex-col items-center gap-2 text-center">
							<Dialog.Title class="text-lg font-medium">{$t(selectedDetails.nameKey)}</Dialog.Title>
							<Dialog.Description class="text-sm text-muted-foreground leading-relaxed">
								{$t(selectedDetails.descKey)}
							</Dialog.Description>
						</div>
					</div>
				{/if}
				<Dialog.Close
					class="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
				>
					<X size={16} />
				</Dialog.Close>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
{/if}
