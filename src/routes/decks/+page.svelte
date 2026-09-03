<script lang="ts">
import { ArrowLeft, ChevronRight } from 'lucide-svelte'
import Seo from '$lib/components/Seo.svelte'
import { deckRegistry } from '$lib/decks/registry'
import { t } from '$lib/i18n'
import { deckPacks, resolvePackFor } from '$lib/stores/deckPacks'
</script>

<Seo
	title="Card Decks | Delcard"
	description="Browse card deck styles for your games. Pick your look, all free."
	canonical="/decks"
	titleFr="Jeux de cartes | Delcard"
	descriptionFr="Parcourez les styles de jeux de cartes pour vos parties. Choisissez votre style, tout gratuitement."
/>

<div class="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
	<div class="mb-6">
		<a
			href="/"
			class="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<ArrowLeft size={14} />
			{$t('common.backHome')}
		</a>
	</div>

	<h1 class="mb-8 text-2xl tracking-tight">{$t('decks.title')}</h1>

	<div class="flex flex-col gap-3">
		{#each deckRegistry as deck}
			{@const pack = resolvePackFor($deckPacks, deck.slug)}
			{@const ext = pack.ext ?? '.png'}
			<a
				href="/decks/{deck.slug}"
				class="group flex items-center gap-5 rounded-2xl border border-border bg-card px-5 py-4 transition-all hover:border-primary/40 hover:bg-card/80"
			>
				<img
					src="{pack.basePath}/card_back{ext}"
					alt={deck.name}
					class="h-20 w-14 shrink-0 rounded object-contain shadow-lg transition-transform group-hover:scale-105"
					draggable="false"
				/>
				<div class="min-w-0 flex-1">
					<p class="font-medium">{$t(deck.nameKey)}</p>
					<p class="mt-1 text-xs text-muted-foreground">
						{pack.name} · {$t('decks.packs', { n: deck.packs.length })}
					</p>
				</div>
				<ChevronRight
					size={16}
					class="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
				/>
			</a>
		{/each}
	</div>
</div>
