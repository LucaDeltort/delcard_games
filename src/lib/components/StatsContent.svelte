<script lang="ts">
import { fly } from 'svelte/transition'
import { gameList } from '$lib/games'
import { t } from '$lib/i18n'
import { statsSchema } from '$lib/stats/extractors'
import { aggregateStat, type GameStatsEntry, statsStore } from '$lib/stores/stats'

function entryFor(gameId: string): GameStatsEntry | undefined {
	return $statsStore[gameId]
}

const totalPlayed = $derived(
	Object.values($statsStore).reduce((sum, e) => sum + (e?.played ?? 0), 0)
)
const totalWins = $derived(Object.values($statsStore).reduce((sum, e) => sum + (e?.wins ?? 0), 0))
const totalLosses = $derived(
	Object.values($statsStore).reduce((sum, e) => sum + (e?.losses ?? 0), 0)
)

function winRate(entry: GameStatsEntry | undefined): number {
	if (!entry || entry.played === 0) return 0
	return Math.round((entry.wins / entry.played) * 100)
}
</script>

{#if totalPlayed === 0}
	<p class="py-20 text-center text-muted-foreground">{$t('stats.noData')}</p>
{:else}
	<!-- Global summary -->
	<div in:fly={{ y: 10, duration: 300 }} class="mb-8 grid grid-cols-3 gap-3">
		<div class="rounded-xl border border-border bg-card p-4 text-center">
			<p class="text-2xl font-bold text-foreground">{totalPlayed}</p>
			<p class="mt-1 text-xs tracking-wide text-muted-foreground uppercase">{$t('stats.played')}</p>
		</div>
		<div class="rounded-xl border border-border bg-card p-4 text-center">
			<p class="text-2xl font-bold text-green-500">{totalWins}</p>
			<p class="mt-1 text-xs tracking-wide text-muted-foreground uppercase">{$t('stats.wins')}</p>
		</div>
		<div class="rounded-xl border border-border bg-card p-4 text-center">
			<p class="text-2xl font-bold text-red-400">{totalLosses}</p>
			<p class="mt-1 text-xs tracking-wide text-muted-foreground uppercase">{$t('stats.losses')}</p>
		</div>
	</div>

	<!-- Per-game breakdown with rich stats -->
	<div class="space-y-4">
		{#each gameList as game (game.id)}
			{@const entry = entryFor(game.id)}
			{#if entry && entry.played > 0}
				{@const schema = statsSchema[game.id] ?? []}
				{@const wr = winRate(entry)}
				<div class="rounded-xl border border-border/60 bg-card p-4">
					<!-- Header row -->
					<div class="mb-3 flex items-center justify-between">
						<span class="font-medium text-foreground">{$t(`${game.id}.name`)}</span>
						<span class="text-sm text-muted-foreground">{entry.wins}/{entry.played} ({wr}%)</span>
					</div>

					<!-- Win rate bar -->
					<div class="mb-4 h-2 overflow-hidden rounded-full bg-secondary">
						<div class="h-full bg-green-500 transition-all duration-500" style={`width: ${wr}%`}></div>
					</div>

					<!-- Rich extra stats grid -->
					{#if schema.length > 0}
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
							{#each schema as field}
								{@const values = entry.extra[field.key]}
								{@const val = aggregateStat(values, field.aggregation)}
								<div class="rounded-lg border border-border/40 bg-secondary/20 px-3 py-2">
									<p class="text-xs tracking-wide text-muted-foreground uppercase">{$t(`stats.${field.labelKey}`)}</p>
									<p class="mt-0.5 font-bold text-foreground {val < 0 ? 'text-red-400' : ''}">
										{field.format === 'percent' ? `${val}%` : val}
									</p>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{/each}
	</div>
{/if}
