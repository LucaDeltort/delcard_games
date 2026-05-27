<script lang="ts">
import { ArrowLeft } from 'lucide-svelte'
import Dice from '$lib/components/Dice.svelte'
import { diceRegistry } from '$lib/dice/registry'
import { t } from '$lib/i18n'
import { dicePacks, resolvePackFor } from '$lib/stores/dicePacks'
</script>

<div class="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
	<div class="mb-6 flex items-center gap-3">
		<a
			href="/"
			class="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<ArrowLeft size={14} />
			{$t('common.backHome')}
		</a>
	</div>

	<h1 class="mb-8 text-2xl tracking-tight">{$t('dice.title')}</h1>

	<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
		{#each diceRegistry as entry}
			{@const pack = resolvePackFor($dicePacks, entry.slug)}
			<a
				href="/dice/{entry.slug}"
				class="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-card/80"
			>
				<div class="transition-transform group-hover:scale-105">
					<Dice value={1} rolling={false} held={false} diceSlug={entry.slug} packId={pack.id} />
				</div>
				<div class="text-center">
					<p class="text-sm font-medium">{$t(entry.nameKey)}</p>
					<p class="text-xs text-muted-foreground">
						{$t('dice.packs', { n: entry.packs.length })}
					</p>
				</div>
			</a>
		{/each}
	</div>
</div>
