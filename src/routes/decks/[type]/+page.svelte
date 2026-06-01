<script lang="ts">
import { ArrowLeft, Check, Flag } from 'lucide-svelte'
import { page } from '$app/stores'
import Seo from '$lib/components/Seo.svelte'
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
							<p class="mb-2 text-xs capitalize tracking-widest text-muted-foreground">{suit}</p>
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
						<div>
							<p class="mb-2 text-xs tracking-widest text-muted-foreground uppercase">Jokers</p>
							<div class="flex flex-wrap gap-1.5">
								{#each jokers as card (card.id)}
									<img
										src={cardSrc(card, renderedPack)}
										alt="{card.face}{card.suit ? ' ' + card.suit : ''}"
										class="h-16 w-11 rounded-lg object-contain shadow-md sm:h-18.25 sm:w-13"
										draggable="false"
									/>
								{/each}
							</div>
						</div>
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
