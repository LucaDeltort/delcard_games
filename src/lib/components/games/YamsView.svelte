<script lang="ts">
import { Settings as SettingsIcon } from 'lucide-svelte'
import Dice from '$lib/components/Dice.svelte'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
import { Button } from '$lib/components/ui/button'
import type { GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'
import {
	type CategoryId,
	grandTotal,
	scoreCategory,
	upperBonus,
	type YamsScores,
	type YamsState
} from '$lib/games/yams/yams'
import { t } from '$lib/i18n'
import type { LobbyPlayer } from '$lib/network/messages'
import { settingsOpen } from '$lib/stores/settings'

let {
	state: gameState,
	myPlayerId,
	players,
	validActions,
	onAction
}: {
	state: GameStateGeneric
	myPlayerId: string
	players: LobbyPlayer[]
	validActions: Action[]
	onAction: (action: Action) => void
} = $props()

const s = $derived(gameState as YamsState)

function playerName(id: string): string {
	return players.find((p) => p.id === id)?.name ?? id
}

const isMyTurn = $derived(s.turnPlayerId === myPlayerId)
const hasRolled = $derived(s.rollsRemaining < 3)
const canRoll = $derived(validActions.some((a) => a.type === 'ROLL'))
const canScore = $derived(validActions.some((a) => a.type === 'SCORE'))

let rollingDice = $state([false, false, false, false, false])
let rollTimer: ReturnType<typeof setTimeout> | null = null

function canToggleHold(index: number): boolean {
	return validActions.some(
		(a) => a.type === 'TOGGLE_HOLD' && (a.payload as { index: number })?.index === index
	)
}

function canScoreCategory(cat: CategoryId): boolean {
	return validActions.some(
		(a) => a.type === 'SCORE' && (a.payload as { category: CategoryId })?.category === cat
	)
}

function roll() {
	rollingDice = s.held.map((h) => !h)
	if (rollTimer) clearTimeout(rollTimer)
	rollTimer = setTimeout(() => {
		rollingDice = [false, false, false, false, false]
	}, 1200)
	onAction({ type: 'ROLL', playerId: myPlayerId })
}

function toggleHold(index: number) {
	onAction({ type: 'TOGGLE_HOLD', playerId: myPlayerId, payload: { index } })
}

function scoreFor(cat: CategoryId) {
	onAction({ type: 'SCORE', playerId: myPlayerId, payload: { category: cat } })
}

const UPPER_CATS: CategoryId[] = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes']
const LOWER_CATS: CategoryId[] = [
	'threeOfAKind',
	'fourOfAKind',
	'fullHouse',
	'smallStraight',
	'largeStraight',
	'yams',
	'chance'
]

function upperTotal(scores: YamsScores): number {
	return UPPER_CATS.reduce((sum, c) => sum + (scores[c] ?? 0), 0)
}

function displayScore(playerId: string, cat: CategoryId): string {
	const filled = s.scores[playerId]?.[cat]
	if (filled !== null && filled !== undefined) return String(filled)
	if (playerId === myPlayerId && isMyTurn && hasRolled) {
		return String(scoreCategory(cat, s.dice))
	}
	return ''
}

function isFilled(playerId: string, cat: CategoryId): boolean {
	return s.scores[playerId]?.[cat] !== null && s.scores[playerId]?.[cat] !== undefined
}
</script>

<div class="flex min-h-dvh flex-col bg-background text-foreground">
	<!-- Header -->
	<header class="flex items-center justify-between border-b border-border bg-card px-4 py-3">
		<span class="text-sm font-semibold">{$t('yams.name')}</span>
		<div class="flex items-center gap-2">
			<RulesDrawer gameId="yams" />
			<button
				type="button"
				class="rounded p-1 text-muted-foreground hover:text-foreground"
				onclick={() => ($settingsOpen = true)}
				aria-label="Settings"
			>
				<SettingsIcon size={18} />
			</button>
		</div>
	</header>

	<!-- Turn indicator -->
	<div class="px-4 py-2 text-center text-sm">
		{#if s.phase === 'gameover'}
			<span class="font-medium">{$t('game.over')}</span>
		{:else if isMyTurn}
			<span class="font-semibold text-primary">{$t('yams.yourTurn')}</span>
		{:else}
			<span class="text-muted-foreground">{$t('game.waitingTurn', { name: playerName(s.turnPlayerId) })}</span>
		{/if}
	</div>

	<!-- Dice tray -->
	<section class="flex flex-col items-center gap-3 px-4 py-4">
		<div class="flex gap-5">
			{#each s.dice as die, i}
				{@const holdable = canToggleHold(i)}
				<button
					type="button"
					class="rounded-lg transition-opacity {!hasRolled ? 'opacity-30' : ''} {holdable ? 'cursor-pointer' : 'cursor-default'}"
					onclick={() => holdable && toggleHold(i)}
					disabled={!holdable}
					aria-label="{$t('yams.held')}: {s.held[i]}"
				>
					<Dice value={die as 1 | 2 | 3 | 4 | 5 | 6} held={s.held[i]} rolling={rollingDice[i]} />
				</button>
			{/each}
		</div>

		<div class="flex flex-col items-center gap-1">
			<Button onclick={roll} disabled={!canRoll}>
				{$t('yams.roll')}
			</Button>
			{#if hasRolled && s.rollsRemaining > 0}
				<span class="text-xs text-muted-foreground">{$t('yams.rollsLeft', { n: s.rollsRemaining })}</span>
			{:else if s.rollsRemaining === 0}
				<span class="text-xs text-muted-foreground">{$t('yams.rollsLeft', { n: 0 })}</span>
			{/if}
		</div>
	</section>

	<!-- Scorecard -->
	<section class="flex-1 overflow-x-auto px-2 pb-6">
		<table class="w-full min-w-max border-collapse text-sm">
			<thead>
				<tr class="border-b border-border">
					<th class="py-2 pr-3 text-left font-medium text-muted-foreground"></th>
					{#each s.players as pid}
						<th class="px-3 py-2 text-center font-medium {pid === s.turnPlayerId ? 'text-primary' : ''}">
							{playerName(pid)}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				<!-- Upper section -->
				<tr>
					<td colspan={s.players.length + 1} class="pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						{$t('yams.upperSection')}
					</td>
				</tr>
				{#each UPPER_CATS as cat}
					<tr
						class="border-b border-border/50 {canScoreCategory(cat) ? 'cursor-pointer hover:bg-accent' : ''}"
						onclick={() => canScoreCategory(cat) && scoreFor(cat)}
					>
						<td class="py-1.5 pr-3 text-muted-foreground">{$t(`yams.${cat}`)}</td>
						{#each s.players as pid}
							{@const filled = isFilled(pid, cat)}
							{@const display = displayScore(pid, cat)}
							<td class="px-3 py-1.5 text-center {filled ? 'font-medium' : 'text-muted-foreground/60'} {pid === myPlayerId && canScoreCategory(cat) ? 'text-primary font-semibold' : ''}">
								{display}
							</td>
						{/each}
					</tr>
				{/each}
				<!-- Upper totals -->
				<tr class="border-b border-border bg-muted/30">
					<td class="py-1.5 pr-3 text-xs text-muted-foreground">{$t('yams.upperTotal')}</td>
					{#each s.players as pid}
						{@const ut = upperTotal(s.scores[pid] ?? {})}
						<td class="px-3 py-1.5 text-center text-xs font-medium">{ut}</td>
					{/each}
				</tr>
				<tr class="border-b border-border bg-muted/30">
					<td class="py-1.5 pr-3 text-xs text-muted-foreground">{$t('yams.upperBonus')}</td>
					{#each s.players as pid}
						{@const bonus = upperBonus(s.scores[pid] ?? {})}
						<td class="px-3 py-1.5 text-center text-xs font-medium {bonus > 0 ? 'text-green-600 dark:text-green-400' : ''}">
							{bonus > 0 ? `+${bonus}` : ''}
						</td>
					{/each}
				</tr>

				<!-- Lower section -->
				<tr>
					<td colspan={s.players.length + 1} class="pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						{$t('yams.lowerSection')}
					</td>
				</tr>
				{#each LOWER_CATS as cat}
					<tr
						class="border-b border-border/50 {canScoreCategory(cat) ? 'cursor-pointer hover:bg-accent' : ''}"
						onclick={() => canScoreCategory(cat) && scoreFor(cat)}
					>
						<td class="py-1.5 pr-3 text-muted-foreground">{$t(`yams.${cat}`)}</td>
						{#each s.players as pid}
							{@const filled = isFilled(pid, cat)}
							{@const display = displayScore(pid, cat)}
							<td class="px-3 py-1.5 text-center {filled ? 'font-medium' : 'text-muted-foreground/60'} {pid === myPlayerId && canScoreCategory(cat) ? 'text-primary font-semibold' : ''}">
								{display}
							</td>
						{/each}
					</tr>
				{/each}

				<!-- Grand total -->
				<tr class="border-t-2 border-border">
					<td class="py-2 pr-3 font-semibold">{$t('yams.total')}</td>
					{#each s.players as pid}
						<td class="px-3 py-2 text-center font-bold text-lg">
							{grandTotal(s.scores[pid] ?? {})}
						</td>
					{/each}
				</tr>
			</tbody>
		</table>
	</section>
</div>
