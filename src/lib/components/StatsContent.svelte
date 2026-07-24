<script lang="ts">
import { fly } from 'svelte/transition'
import { gameList } from '$lib/games'
import { t } from '$lib/i18n'
import { statsSchema } from '$lib/stats/extractors'
import { aggregateStat, type GameStatsEntry, statsStore } from '$lib/stores/stats'

// ── DEBUG: Seed fake data to preview the design. Remove before merge. ──
statsStore.set({
	war: {
		played: 8,
		wins: 5,
		losses: 3,
		extra: {
			cardsWon: [26, 30, 22, 40, 15, 52, 28, 33],
			totalCards: [26, 30, 22, 40, 15, 52, 28, 33]
		}
	},
	fight: {
		played: 12,
		wins: 7,
		losses: 5,
		extra: {
			damageDealt: [45, 60, 30, 80, 55, 40, 70, 25, 90, 50, 35, 65],
			damageTaken: [20, 35, 40, 10, 50, 30, 25, 45, 15, 35, 40, 20],
			attacks: [5, 8, 4, 10, 6, 5, 9, 3, 11, 7, 4, 8],
			charges: [2, 1, 3, 0, 2, 1, 3, 0, 1, 2, 0, 1]
		}
	},
	color: { played: 6, wins: 2, losses: 4, extra: { cardsLeftInHand: [0, 3, 1, 7, 2, 5] } },
	presidents: {
		played: 10,
		wins: 4,
		losses: 6,
		extra: {
			wasPresident: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0],
			wasScum: [0, 0, 1, 0, 1, 0, 0, 1, 0, 1],
			finalRank: [1, 3, 4, 1, 4, 1, 3, 4, 1, 4]
		}
	},
	purple: { played: 7, wins: 4, losses: 3, extra: { finalScore: [12, 18, 8, 25, 15, 10, 20] } },
	werewolf: {
		played: 9,
		wins: 5,
		losses: 4,
		extra: {
			wasWerewolf: [1, 0, 1, 0, 0],
			wasVillager: [0, 1, 0, 1, 0],
			wasLover: [0, 0, 0, 0, 1],
			survived: [1, 0, 0, 1, 0]
		}
	},
	yams: {
		played: 11,
		wins: 6,
		losses: 5,
		extra: {
			scoreTotal: [245, 180, 310, 150, 275, 200, 340, 165, 290, 220, 260],
			upperSection: [70, 50, 85, 40, 75, 60, 90, 45, 80, 65, 72],
			lowerSection: [175, 130, 225, 110, 200, 140, 250, 120, 210, 155, 188],
			yamsRolled: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]
		}
	},
	blackjack: {
		played: 15,
		wins: 9,
		losses: 6,
		extra: {
			netGainLoss: [50, -100, 200, -50, 350, -200, 100, 0, 400, -300, 150, -100, 250, -50, 300],
			rebuys: [0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 1, 0, 0, 0],
			coinsFinal: [550, 400, 700, 450, 850, 300, 600, 500, 900, 200, 650, 400, 750, 450, 800]
		}
	}
})
// ── END DEBUG ──

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
