<script lang="ts">
import { Check, ChevronLeft, ChevronRight } from 'lucide-svelte'
import { fly } from 'svelte/transition'
import { Button } from '$lib/components/ui/button'
import { getDiceBySlug } from '$lib/dice/registry'
import { dicePacks, resolvePackFor } from '$lib/stores/dicePacks'
import Dice from './Dice.svelte'

let { diceSlug = 'd6' }: { diceSlug?: string } = $props()

const entry = $derived(getDiceBySlug(diceSlug))
const packs = $derived(entry?.packs ?? [])
const currentPack = $derived(resolvePackFor($dicePacks, diceSlug))
const currentIndex = $derived(packs.findIndex((p) => p.id === currentPack.id))

let previewIndex = $state(-1)
let direction = $state(1)

const displayIndex = $derived(previewIndex === -1 ? currentIndex : previewIndex)
const displayPack = $derived(packs[displayIndex])
const isPreviewing = $derived(previewIndex !== -1 && previewIndex !== currentIndex)

$effect(() => {
	diceSlug
	previewIndex = -1
})

function setPreview(idx: number) {
	previewIndex = idx === currentIndex ? -1 : idx
}

function prev() {
	direction = -1
	setPreview((displayIndex - 1 + packs.length) % packs.length)
}

function next() {
	direction = 1
	setPreview((displayIndex + 1) % packs.length)
}

function usePack() {
	if (!isPreviewing || !displayPack) return
	dicePacks.select(diceSlug, displayPack)
	previewIndex = -1
}
</script>

{#if packs.length > 1}
	<div class="w-full max-w-xs">
		<p class="mb-3 text-sm tracking-widest text-muted-foreground uppercase">Dice Style</p>
		<div class="flex items-center gap-4">
			<button
				onclick={prev}
				class="rounded-full p-2.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90"
				aria-label="Previous pack"
			>
				<ChevronLeft size={20} />
			</button>

			<div class="relative h-[120px] flex-1 overflow-hidden">
				{#key displayIndex}
					{@const pack = packs[displayIndex]}
					<div
						in:fly={{ x: direction * 60, duration: 200 }}
						out:fly={{ x: direction * -60, duration: 200 }}
						class="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
					>
						<Dice value={1} rolling={false} held={false} {diceSlug} packId={pack?.id} />
						<span class="text-sm text-foreground">{pack?.name}</span>
						{#if pack?.author}
							<span class="text-xs text-muted-foreground">{pack.author}</span>
						{/if}
					</div>
				{/key}
			</div>

			<button
				onclick={next}
				class="rounded-full p-2.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90"
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
					class="group p-2.5"
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

		<div class="mt-2 flex justify-center">
			<Button
				onclick={usePack}
				disabled={!isPreviewing}
				size="sm"
				variant="outline"
				class="h-7 px-3 text-xs"
			>
				<Check size={12} />
				Use Pack
			</Button>
		</div>
	</div>
{/if}
