<script lang="ts">
import { ArrowLeft, Check, Flag } from 'lucide-svelte'
import { page } from '$app/stores'
import { cardSrc, preloadPack } from '$lib/decks/preload'
import { getDeckBySlug } from '$lib/decks/registry'
import { t } from '$lib/i18n'
import { deckPacks, resolvePackFor } from '$lib/stores/deckPacks'

const slug = $derived($page.params.type ?? '')
const entry = $derived(getDeckBySlug(slug))
const defaultPack = $derived(resolvePackFor($deckPacks, slug))

let previewPackId = $state<string | null>(null) // button highlight (instant)
let renderedPackId = $state<string | null>(null) // grid (post-preload)
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
	previewPackId = packId
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

<div class="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
    <div class="mb-6 flex items-center gap-3">
        <a
            href="/decks"
            class="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
            <ArrowLeft size={14} />
            {$t("decks.title")}
        </a>
    </div>

{#if entry}

        <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <h1 class="text-2xl tracking-tight">{$t(entry.nameKey)}</h1>

            <div class="flex flex-wrap items-center gap-2">
                {#each entry.packs as pack}
                    <button
                        onclick={() => switchPack(pack.id)}
                        class="flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors sm:py-1 {previewPack.id ===
                        pack.id
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}"
                    >
                        {pack.name}
                        {#if pack.id === defaultPack.id}
                            <Check size={12} />
                        {/if}
                    </button>
                {/each}
                <button
                    onclick={() => deckPacks.select(slug, previewPack)}
                    disabled={previewPack.id === defaultPack.id}
                    class="flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors sm:py-1 {previewPack.id ===
                    defaultPack.id
                        ? 'cursor-default border-border text-muted-foreground opacity-40'
                        : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}"
                >
                    <Flag size={12} />
                    {$t("decks.setDefault")}
                </button>
            </div>
        </div>

        {#if previewPack.author || previewPack.license}
        <p class="mb-8 text-xs text-muted-foreground">
            {#if previewPack.author}{$t("decks.by", { name: previewPack.author })}{/if}
            {#if previewPack.license}· {previewPack.license}{/if}
        </p>
        {/if}

        <div class="relative transition-opacity duration-200 {loading ? 'opacity-40 pointer-events-none' : ''}">
            <div class="flex flex-col gap-6">
                    {#each cardsBySuit as { suit, cards }}
                        <div>
                            <p class="mb-2 text-xs capitalize tracking-widest text-muted-foreground">
                                {suit}
                            </p>
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
{:else}
    <div class="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <p class="text-muted-foreground">{$t("decks.errorUnknownType")}</p>
    </div>
{/if}
</div>
