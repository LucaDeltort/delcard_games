<script lang="ts">
import { ArrowLeft, ChevronRight } from 'lucide-svelte'
import Dice from '$lib/components/Dice.svelte'
import Seo from '$lib/components/Seo.svelte'
import { diceRegistry } from '$lib/dice/registry'
import { localHref, t } from '$lib/i18n'
import { dicePacks, resolvePackFor } from '$lib/stores/dicePacks'
</script>

<Seo
	title="Dice Styles for Online Dice Games | Delcard"
	description="Browse Delcard's dice styles: classic and illustrated D6 packs for Yams and other online dice games with friends. Pick your look, free, no sign-up."
	canonical="/dice"
	titleFr="Styles de dés pour jouer aux dés en ligne | Delcard"
	descriptionFr="Parcourez les styles de dés Delcard : packs D6 classiques et illustrés pour le Yams et vos parties de dés en ligne entre amis. Gratuit, sans inscription."
/>

<div class="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
	<div class="mb-6">
		<a
			href={$localHref('/')}
			class="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<ArrowLeft size={14} />
			{$t('common.backHome')}
		</a>
	</div>

	<h1 class="mb-8 text-2xl tracking-tight">{$t('dice.title')}</h1>

	<div class="flex flex-col gap-3">
		{#each diceRegistry as entry}
			{@const pack = resolvePackFor($dicePacks, entry.slug)}
			<a
				href={$localHref(`/dice/${entry.slug}`)}
				class="group flex items-center gap-5 rounded-2xl border border-border bg-card px-5 py-4 transition-all hover:border-primary/40 hover:bg-card/80"
			>
				<div class="shrink-0 transition-transform group-hover:scale-105">
					<Dice value={1} rolling={false} held={false} diceSlug={entry.slug} packId={pack.id} />
				</div>
				<div class="min-w-0 flex-1">
					<p class="font-medium">{$t(entry.nameKey)}</p>
					<p class="mt-1 text-xs text-muted-foreground">
						{pack.name} · {$t('dice.packs', { n: entry.packs.length })}
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
