<script lang="ts">
import { Check, ChevronLeft, ChevronRight } from 'lucide-svelte'
import { fly } from 'svelte/transition'
import { Button } from '$lib/components/ui/button'
import { preloadPack } from '$lib/decks/preload'
import { getDeckBySlug } from '$lib/decks/registry'
import { t } from '$lib/i18n'
import { deckPacks, resolvePackFor } from '$lib/stores/deckPacks'

let { deckSlug = 'french-deck' }: { deckSlug?: string } = $props()

const entry = $derived(getDeckBySlug(deckSlug))
const packs = $derived(entry?.packs ?? [])
const currentPack = $derived(resolvePackFor($deckPacks, deckSlug))
const currentIndex = $derived(packs.findIndex((p) => p.id === currentPack.id))

let previewIndex = $state(-1)
let direction = $state(1)
let loading = $state(false)
let loaded = $state(0)
let total = $state(0)
let activeHandle: { cancel: () => void } | null = null

const displayIndex = $derived(previewIndex === -1 ? currentIndex : previewIndex)
const displayPack = $derived(packs[displayIndex])
const isPreviewing = $derived(previewIndex !== -1 && previewIndex !== currentIndex)

$effect(() => {
	deckSlug
	previewIndex = -1
	loading = false
	activeHandle?.cancel()
	activeHandle = null
})

function setPreview(idx: number) {
	if (idx === currentIndex) {
		previewIndex = -1
	} else {
		previewIndex = idx
	}
}

function prev() {
	if (!entry) return
	direction = -1
	setPreview((displayIndex - 1 + packs.length) % packs.length)
}

function next() {
	if (!entry) return
	direction = 1
	setPreview((displayIndex + 1) % packs.length)
}

function usePack() {
	if (!isPreviewing || !displayPack) return
	const pack = displayPack
	activeHandle?.cancel()
	loading = true
	loaded = 0
	total = 0
	const handle = preloadPack(deckSlug, pack, (l, t) => {
		loaded = l
		total = t
	})
	activeHandle = handle
	handle.promise.then(() => {
		if (activeHandle !== handle) return
		deckPacks.select(deckSlug, pack)
		loading = false
		previewIndex = -1
		activeHandle = null
	})
}
</script>

{#if packs.length > 1}
	<div class="w-full max-w-xs">
		<p class="mb-3 text-sm tracking-widest text-muted-foreground uppercase">
			{$t('game.cardStyle')}
		</p>
		<div class="flex items-center gap-4">
			<button
				onclick={prev}
				disabled={loading}
				class="rounded-full p-2.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90 disabled:opacity-40"
				aria-label="Previous pack"
			>
				<ChevronLeft size={20} />
			</button>

			<div class="relative h-[120px] flex-1 overflow-hidden">
				{#key displayIndex}
					{@const pack = packs[displayIndex]}
					{@const ext = pack?.ext ?? '.png'}
					<div
						in:fly={{ x: direction * 60, duration: 200 }}
						out:fly={{ x: direction * -60, duration: 200 }}
						class="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
					>
						<img
							src="{pack?.basePath}/card_back{ext}"
							alt={pack?.name}
							class="h-[73px] w-[52px] rounded object-contain"
							draggable="false"
						/>
						<span class="text-sm text-foreground">{pack?.name}</span>
						<span class="text-xs text-muted-foreground">{pack?.author}</span>
					</div>
				{/key}
			</div>

			<button
				onclick={next}
				disabled={loading}
				class="rounded-full p-2.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90 disabled:opacity-40"
				aria-label="Next pack"
			>
				<ChevronRight size={20} />
			</button>
		</div>

		<div class="mt-1 flex justify-center">
			{#each packs as p, i}
				<button
					onclick={() => {
						direction = i > displayIndex ? 1 : -1
						setPreview(i)
					}}
					disabled={loading}
					class="group p-2.5 disabled:opacity-40"
					aria-label={p.name}
				>
					<span
						class="block h-1.5 w-1.5 rounded-full transition-colors {i === displayIndex
							? 'bg-primary'
							: 'bg-border group-hover:bg-muted-foreground'}"
					></span>
				</button>
			{/each}
		</div>

		<div class="mt-2 flex flex-col items-center gap-2">
			{#if loading}
				<div class="h-1 w-full overflow-hidden rounded-full bg-secondary">
					<div
						class="h-full bg-primary transition-[width] duration-200"
						style="width: {total > 0 ? Math.round((loaded / total) * 100) : 0}%"
					></div>
				</div>
				<p class="text-xs text-muted-foreground">
					{$t('game.preloadingCards', { loaded, total })}
				</p>
			{:else}
				<Button
					onclick={usePack}
					disabled={!isPreviewing}
					size="sm"
					variant="outline"
					class="h-7 px-3 text-xs"
				>
					<Check size={12} />
					{$t('game.usePack')}
				</Button>
			{/if}
		</div>
	</div>
{/if}
