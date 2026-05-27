<script lang="ts">
import Dice from '$lib/components/Dice.svelte'
import DicePackPicker from '$lib/components/DicePackPicker.svelte'
import { diceRegistry } from '$lib/dice/registry'
</script>

<main class="min-h-dvh bg-background p-8 text-foreground">
	<h1 class="font-heading mb-2 text-4xl">Dice Viewer</h1>
	<p class="mb-12 text-sm text-muted-foreground">
		<a href="/lab" class="underline">← lab</a>
	</p>

	<!-- Pack picker (user-facing component) -->
	{#each diceRegistry as entry}
		<section class="mb-14">
			<h2 class="mb-6 text-lg font-semibold">{entry.name} — Pack Picker</h2>
			<DicePackPicker diceSlug={entry.slug} />
		</section>
	{/each}

	<!-- All faces per pack (dev reference) -->
	{#each diceRegistry as entry}
		{#each entry.packs as pack}
			<section class="mb-14">
				<h2 class="mb-1 text-lg font-semibold">{entry.name} / {pack.name}</h2>
				{#if pack.author}
					<p class="mb-4 text-xs text-muted-foreground">by {pack.author}</p>
				{:else}
					<div class="mb-4"></div>
				{/if}
				<div class="flex flex-wrap items-end gap-6">
					{#each Array.from({ length: entry.faceCount }, (_, i) => i + 1) as face}
						<div class="flex flex-col items-center gap-2">
							<Dice
								value={face as 1 | 2 | 3 | 4 | 5 | 6}
								rolling={false}
								held={false}
								diceSlug={entry.slug}
								packId={pack.id}
							/>
							<span class="font-mono text-xs text-muted-foreground">{face}</span>
						</div>
					{/each}
				</div>
				<p class="mt-4 font-mono text-xs text-muted-foreground">{pack.basePath}</p>
			</section>
		{/each}
	{/each}
</main>
