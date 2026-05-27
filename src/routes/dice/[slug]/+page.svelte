<script lang="ts">
import { ArrowLeft, Check, Flag } from 'lucide-svelte'
import { page } from '$app/stores'
import Dice from '$lib/components/Dice.svelte'
import { getDiceBySlug } from '$lib/dice/registry'
import { t } from '$lib/i18n'
import { dicePacks, resolvePackFor } from '$lib/stores/dicePacks'

const slug = $derived($page.params.slug ?? '')
const entry = $derived(getDiceBySlug(slug))
const defaultPack = $derived(resolvePackFor($dicePacks, slug))

let previewPackId = $state<string | null>(null)
const previewPack = $derived(entry?.packs.find((p) => p.id === previewPackId) ?? defaultPack)

$effect(() => {
	slug
	previewPackId = null
})
</script>

<div class="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
	<div class="mb-6 flex items-center gap-3">
		<a
			href="/dice"
			class="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<ArrowLeft size={14} />
			{$t('dice.title')}
		</a>
	</div>

	{#if entry}
		<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
			<h1 class="text-2xl tracking-tight">{$t(entry.nameKey)}</h1>

			<div class="flex flex-wrap items-center gap-2">
				{#each entry.packs as pack}
					<button
						onclick={() => (previewPackId = pack.id === defaultPack.id ? null : pack.id)}
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
					onclick={() => dicePacks.select(slug, previewPack)}
					disabled={previewPack.id === defaultPack.id}
					class="flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors sm:py-1 {previewPack.id ===
					defaultPack.id
						? 'cursor-default border-border text-muted-foreground opacity-40'
						: 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}"
				>
					<Flag size={12} />
					{$t('dice.setDefault')}
				</button>
			</div>
		</div>

		{#if previewPack.author}
			<p class="mb-8 text-xs text-muted-foreground">
				{$t('dice.by', { name: previewPack.author })}
				{#if previewPack.license}· {previewPack.license}{/if}
			</p>
		{:else}
			<div class="mb-8"></div>
		{/if}

		<div class="flex flex-wrap gap-6">
			{#each Array.from({ length: entry.faceCount }, (_, i) => i + 1) as face}
				<div class="flex flex-col items-center gap-2">
					<Dice
						value={face as 1 | 2 | 3 | 4 | 5 | 6}
						rolling={false}
						held={false}
						diceSlug={entry.slug}
						packId={previewPack.id}
					/>
					<span class="font-mono text-xs text-muted-foreground">{face}</span>
				</div>
			{/each}
		</div>
	{:else}
		<div class="flex min-h-[40vh] flex-col items-center justify-center gap-4">
			<p class="text-muted-foreground">{$t('dice.errorUnknown')}</p>
		</div>
	{/if}
</div>
