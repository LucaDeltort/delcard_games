<script lang="ts">
import { ArrowLeft, Check, Flag } from 'lucide-svelte'
import { page } from '$app/stores'
import Dice from '$lib/components/Dice.svelte'
import Seo from '$lib/components/Seo.svelte'
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

<Seo
	title={entry ? `${entry.name} | Delcard` : 'Dice | Delcard'}
	description={entry ? `Browse ${entry.name} dice packs and styles. Free, no sign-up.` : ''}
	canonical="/dice/{slug}"
	noindex={!entry}
	titleFr={entry ? `${entry.name} | Delcard` : 'Dés | Delcard'}
	descriptionFr={entry ? `Parcourez les packs et styles de dés ${entry.name}. Gratuit, sans inscription.` : ''}
/>

<div class="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
	<div class="mb-6">
		<a
			href="/dice"
			class="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<ArrowLeft size={14} />
			{$t('dice.title')}
		</a>
	</div>

	{#if entry}
		<h1 class="mb-8 text-2xl tracking-tight">{$t(entry.nameKey)}</h1>

		<div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
			<aside class="w-full shrink-0 lg:w-56">
				<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
					{#each entry.packs as pack}
						<button
							onclick={() => (previewPackId = pack.id === defaultPack.id ? null : pack.id)}
							class="flex flex-col items-center gap-3 rounded-xl border p-4 transition-colors {previewPack.id ===
							pack.id
								? 'border-primary bg-primary/10'
								: 'border-border hover:border-primary/40 hover:bg-card'}"
						>
							<div class="pointer-events-none">
								<Dice value={1} rolling={false} held={false} diceSlug={entry.slug} packId={pack.id} />
							</div>
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
						{#if previewPack.author}{$t('dice.by', { name: previewPack.author })}{/if}
						{#if previewPack.license}· {previewPack.license}{/if}
					</p>
				{/if}

				<button
					onclick={() => dicePacks.select(slug, previewPack)}
					disabled={previewPack.id === defaultPack.id}
					class="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors {previewPack.id ===
					defaultPack.id
						? 'cursor-default border-border text-muted-foreground opacity-40'
						: 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}"
				>
					<Flag size={13} />
					{$t('dice.setDefault')}
				</button>
			</aside>

			<div class="flex-1">
				<div class="grid grid-cols-3 gap-4 sm:gap-6 lg:max-w-xs">
					{#each Array.from({ length: entry.faceCount }, (_, i) => i + 1) as face}
						<div class="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4">
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
			</div>
		</div>
	{:else}
		<div class="flex min-h-[40vh] flex-col items-center justify-center gap-4">
			<p class="text-muted-foreground">{$t('dice.errorUnknown')}</p>
		</div>
	{/if}
</div>
