<script lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-svelte'
import { fly } from 'svelte/transition'
import { frenchDeckPacks } from '$lib/decks/FrenchDeck/packs'
import { t } from '$lib/i18n'
import { deckPack } from '$lib/stores/deckPack'

let currentIndex = $derived(frenchDeckPacks.findIndex((p) => p.id === $deckPack.id))
let direction = $state(1)

function prev() {
	direction = -1
	const idx = (currentIndex - 1 + frenchDeckPacks.length) % frenchDeckPacks.length
	deckPack.select(frenchDeckPacks[idx])
}

function next() {
	direction = 1
	const idx = (currentIndex + 1) % frenchDeckPacks.length
	deckPack.select(frenchDeckPacks[idx])
}
</script>

{#if frenchDeckPacks.length > 1}
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
					{@const pack = frenchDeckPacks[currentIndex]}
					{@const ext = pack.ext ?? '.png'}
					<div
						in:fly={{ x: direction * 60, duration: 200 }}
						out:fly={{ x: direction * -60, duration: 200 }}
						class="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
					>
						<img
							src="{pack.basePath}/card_back{ext}"
							alt={pack.name}
							class="h-[73px] w-[52px] rounded object-contain"
							draggable="false"
						/>
						<span class="text-sm text-foreground">{pack.name}</span>
						<span class="text-xs text-muted-foreground">{pack.author}</span>
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
			{#each frenchDeckPacks as p, i}
				<button
					onclick={() => { direction = i > currentIndex ? 1 : -1; deckPack.select(p) }}
					class="h-1.5 w-1.5 rounded-full transition-colors {i === currentIndex
						? 'bg-primary'
						: 'bg-border hover:bg-muted-foreground'}"
					aria-label={p.name}
				></button>
			{/each}
		</div>
	</div>
{/if}
