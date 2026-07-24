<script lang="ts">
import { fly } from 'svelte/transition'
import { gameList } from '$lib/games'
import { t } from '$lib/i18n'
import { type GameStats, statsStore } from '$lib/stores/stats'

let selectedPlayer = $state<string | null>(null)

const playerNames = $derived(Object.keys($statsStore).sort((a, b) => a.localeCompare(b)))

$effect(() => {
	if (playerNames.length > 0 && !selectedPlayer) {
		selectedPlayer = playerNames[0]
	}
})

const currentStats = $derived(selectedPlayer ? ($statsStore[selectedPlayer] ?? {}) : {})

const totalPlayed = $derived(
	Object.values(currentStats).reduce((sum, s: GameStats) => sum + s.played, 0)
)
const totalWins = $derived(
	Object.values(currentStats).reduce((sum, s: GameStats) => sum + s.wins, 0)
)
const totalLosses = $derived(
	Object.values(currentStats).reduce((sum, s: GameStats) => sum + s.losses, 0)
)
</script>

{#if playerNames.length === 0}
	<p class="py-20 text-center text-muted-foreground">{$t('stats.noData')}</p>
{:else}
	<!-- Player selector -->
	<div class="mb-6 flex flex-wrap gap-2">
		{#each playerNames as name}
			<button
				class="rounded-lg border px-3 py-1.5 text-sm transition-colors {selectedPlayer === name
					? 'border-primary bg-primary text-primary-foreground'
					: 'border-border bg-secondary/30 text-foreground hover:bg-secondary/50'}"
				onclick={() => (selectedPlayer = name)}
			>
				{name}
			</button>
		{/each}
	</div>

	<!-- Summary cards -->
	{#key selectedPlayer}
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
	{/key}

	<!-- Per-game breakdown with CSS bar charts -->
	<div class="space-y-4">
		{#each gameList as game (game.id)}
			{@const s = currentStats[game.id]}
			{#if s && s.played > 0}
				{@const winRate = Math.round((s.wins / s.played) * 100)}
				<div class="rounded-lg border border-border/60 bg-secondary/20 p-4">
					<div class="mb-2 flex items-center justify-between">
						<span class="font-medium text-foreground">{$t(`${game.id}.name`)}</span
						><span class="text-sm text-muted-foreground"
							>{s.wins}/{s.played} ({$t('stats.winRate')}: {winRate}%)</span
						>
					</div>
					<div class="h-2 overflow-hidden rounded-full bg-secondary">
						<div class="h-full bg-green-500 transition-all duration-500" style={`width: ${winRate}%`}></div>
					</div>
				</div>
			{/if}
		{/each}
	</div>
{/if}
