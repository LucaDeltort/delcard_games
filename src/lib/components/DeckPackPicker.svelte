<script lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-svelte'
import { fly } from 'svelte/transition'
import { getDeckBySlug } from '$lib/decks/registry'
import { t } from '$lib/i18n'
import { deckPacks, resolvePackFor } from '$lib/stores/deckPacks'

let { deckSlug = 'french-deck' }: { deckSlug?: string } = $props()

const entry = $derived(getDeckBySlug(deckSlug))
const packs = $derived(entry?.packs ?? [])
const currentPack = $derived(resolvePackFor($deckPacks, deckSlug))
const currentIndex = $derived(packs.findIndex((p) => p.id === currentPack.id))
let direction = $state(1)

function prev() {
	if (!entry) return
	direction = -1
	const idx = (currentIndex - 1 + packs.length) % packs.length
	deckPacks.select(deckSlug, packs[idx])
}

function next() {
	if (!entry) return
	direction = 1
	const idx = (currentIndex + 1) % packs.length
	deckPacks.select(deckSlug, packs[idx])
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
				class="rounded-full p-1.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90"
				aria-label="Previous pack"
			>
				<ChevronLeft size={20} />
			</button>

			<div class="relative h-[120px] flex-1 overflow-hidden">
				{#key currentIndex}
					{@const pack = packs[currentIndex]}
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
				class="rounded-full p-1.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90"
				aria-label="Next pack"
			>
				<ChevronRight size={20} />
			</button>
		</div>

		<div class="mt-3 flex justify-center gap-1.5">
			{#each packs as p, i}
				<button
					onclick={() => {
						direction = i > currentIndex ? 1 : -1
						deckPacks.select(deckSlug, p)
					}}
					class="h-1.5 w-1.5 rounded-full transition-colors {i === currentIndex
						? 'bg-primary'
						: 'bg-border hover:bg-muted-foreground'}"
					aria-label={p.name}
				></button>
			{/each}
		</div>
	</div>
{/if}
