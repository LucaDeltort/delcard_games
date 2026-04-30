<script lang="ts">
import { frenchDeckPacks } from '$lib/decks/FrenchDeck/packs'
import { t } from '$lib/i18n'
import { deckPack } from '$lib/stores/deckPack'
</script>

{#if frenchDeckPacks.length > 1}
<div class="w-full max-w-xs">
	<p class="mb-3 text-xs tracking-widest text-muted-foreground uppercase">
		{$t('game.cardStyle')}
	</p>
	<div class="flex flex-wrap gap-3">
		{#each frenchDeckPacks as pack}
			{@const ext = pack.ext ?? '.png'}
			{@const selected = $deckPack.id === pack.id}
			<button
				onclick={() => deckPack.select(pack)}
				class="flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-colors {selected
					? 'border-primary'
					: 'border-border hover:border-muted-foreground'}"
				title={pack.name}
			>
				<img
					src="{pack.basePath}/card_back{ext}"
					alt={pack.name}
					class="h-[73px] w-[52px] rounded object-contain"
					draggable="false"
				/>
				<span class="text-xs text-foreground">{pack.name}</span>
				<span class="text-[10px] text-muted-foreground">{pack.author}</span>
			</button>
		{/each}
	</div>
</div>
{/if}
