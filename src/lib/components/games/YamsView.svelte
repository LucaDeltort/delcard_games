<script lang="ts">
import { Settings as SettingsIcon } from 'lucide-svelte'
import { onDestroy, untrack } from 'svelte'
import Dice from '$lib/components/Dice.svelte'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
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
let rollingDice = $state([false, false, false, false, false])
let rollTimer: ReturnType<typeof setTimeout> | null = null
let prevRollsRemaining = untrack(() => s.rollsRemaining)

$effect(() => {
	const curr = s.rollsRemaining
	if (curr < prevRollsRemaining) {
		rollingDice = s.held.map((h) => !h)
		clearTimeout(rollTimer ?? undefined)
		rollTimer = setTimeout(() => {
			rollingDice = [false, false, false, false, false]
		}, 1200)
	}
	prevRollsRemaining = curr
})

onDestroy(() => clearTimeout(rollTimer ?? undefined))

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

<div class="yams-root">
	<!-- Header -->
	<header class="yams-header">
		<span class="yams-title">YAMS</span>
		<div class="yams-actions">
			<RulesDrawer gameId="yams" />
			<button
				type="button"
				class="settings-btn"
				onclick={() => ($settingsOpen = true)}
				aria-label="Settings"
			>
				<SettingsIcon size={18} />
			</button>
		</div>
	</header>

	<!-- Turn banner -->
	<div class="turn-banner" class:mine={isMyTurn} class:over={s.phase === 'gameover'}>
		{#if s.phase === 'gameover'}
			GAME OVER
		{:else if isMyTurn}
			YOUR TURN
		{:else}
			{playerName(s.turnPlayerId)}'s TURN
		{/if}
	</div>

	<!-- Dice tray -->
	<section class="dice-tray">
		<div class="dice-shelf">
			{#each s.dice as die, i}
				{@const holdable = canToggleHold(i)}
				<button
					type="button"
					class="die-btn"
					class:unrolled={!hasRolled}
					class:holdable
					onclick={() => holdable && toggleHold(i)}
					disabled={!holdable}
					aria-label="{$t('yams.held')}: {s.held[i]}"
				>
					<Dice value={die as 1 | 2 | 3 | 4 | 5 | 6} held={s.held[i]} rolling={rollingDice[i]} />
				</button>
			{/each}
		</div>

		<div class="roll-zone">
			{#if hasRolled && s.rollsRemaining > 0}
				<div class="rolls-left">
					<span class="rolls-n">{s.rollsRemaining}</span>
					<span class="rolls-txt">{s.rollsRemaining === 1 ? 'ROLL LEFT' : 'ROLLS LEFT'}</span>
				</div>
			{:else if hasRolled && s.rollsRemaining === 0}
				<span class="score-prompt">SCORE NOW</span>
			{/if}
			<button class="roll-btn" onclick={roll} disabled={!canRoll}>ROLL</button>
		</div>
	</section>

	<!-- Scorecard -->
	<section class="scorecard">
		<table class="score-table">
			<thead>
				<tr>
					<th class="th-cat"></th>
					{#each s.players as pid}
						<th class="th-player" class:active={pid === s.turnPlayerId}>
							{playerName(pid)}
							{#if pid === s.turnPlayerId && s.phase !== 'gameover'}
								<span class="active-dot"></span>
							{/if}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				<!-- Upper section -->
				<tr class="section-row">
					<td colspan={s.players.length + 1}>
						<div class="section-divider">
							<span class="section-rule"></span>
							<span class="section-label">{$t('yams.upperSection')}</span>
							<span class="section-rule"></span>
						</div>
					</td>
				</tr>
				{#each UPPER_CATS as cat}
					{@const clickable = canScoreCategory(cat)}
					<tr class="score-row" class:clickable onclick={() => clickable && scoreFor(cat)}>
						<td class="td-cat">{$t(`yams.${cat}`)}</td>
						{#each s.players as pid}
							{@const filled = isFilled(pid, cat)}
							{@const display = displayScore(pid, cat)}
							{@const isPreview = !filled && pid === myPlayerId && isMyTurn && hasRolled}
							<td
								class="td-score"
								class:filled
								class:preview={isPreview}
								class:myclick={pid === myPlayerId && clickable}
								class:activecol={pid === s.turnPlayerId}
							>{display}</td>
						{/each}
					</tr>
				{/each}

				<!-- Upper subtotals -->
				<tr class="sub-row">
					<td class="td-cat sub">{$t('yams.upperTotal')}</td>
					{#each s.players as pid}
						<td class="td-score sub" class:activecol={pid === s.turnPlayerId}>
							{upperTotal(s.scores[pid] ?? {})}/63
						</td>
					{/each}
				</tr>
				<tr class="sub-row">
					<td class="td-cat sub">{$t('yams.upperBonus')}</td>
					{#each s.players as pid}
						{@const bonus = upperBonus(s.scores[pid] ?? {})}
						<td
							class="td-score sub"
							class:activecol={pid === s.turnPlayerId}
							class:earned={bonus > 0}
						>{bonus > 0 ? `+${bonus}` : '—'}</td>
					{/each}
				</tr>

				<!-- Lower section -->
				<tr class="section-row">
					<td colspan={s.players.length + 1}>
						<div class="section-divider">
							<span class="section-rule"></span>
							<span class="section-label">{$t('yams.lowerSection')}</span>
							<span class="section-rule"></span>
						</div>
					</td>
				</tr>
				{#each LOWER_CATS as cat}
					{@const clickable = canScoreCategory(cat)}
					<tr class="score-row" class:clickable onclick={() => clickable && scoreFor(cat)}>
						<td class="td-cat">{$t(`yams.${cat}`)}</td>
						{#each s.players as pid}
							{@const filled = isFilled(pid, cat)}
							{@const display = displayScore(pid, cat)}
							{@const isPreview = !filled && pid === myPlayerId && isMyTurn && hasRolled}
							<td
								class="td-score"
								class:filled
								class:preview={isPreview}
								class:myclick={pid === myPlayerId && clickable}
								class:activecol={pid === s.turnPlayerId}
							>{display}</td>
						{/each}
					</tr>
				{/each}

				<!-- Grand total -->
				<tr class="total-row">
					<td class="td-total-label">{$t('yams.total')}</td>
					{#each s.players as pid}
						<td class="td-total" class:activecol={pid === s.turnPlayerId}>
							{grandTotal(s.scores[pid] ?? {})}
						</td>
					{/each}
				</tr>
			</tbody>
		</table>
	</section>
</div>

<style>
	.yams-root {
		--ya: #e8a038;
		--ya-dim: rgba(232, 160, 56, 0.11);
		--ya-glow: rgba(232, 160, 56, 0.28);
		--ya-felt: #0a1510;
		/* override accent for held-dice glow in this subtree */
		--accent: var(--ya);

		display: flex;
		flex-direction: column;
		min-height: 100dvh;
		background: var(--background);
		color: var(--foreground);
	}

	/* ── Header ──────────────────────────────────── */

	.yams-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.6rem 1rem;
		border-bottom: 1px solid rgba(232, 160, 56, 0.16);
	}

	.yams-title {
		font-family: var(--font-heading);
		font-size: 1.85rem;
		letter-spacing: 0.12em;
		color: var(--ya);
		line-height: 1;
	}

	.yams-actions {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.settings-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 0.375rem;
		color: var(--muted-foreground);
		transition: color 150ms;
	}
	.settings-btn:hover {
		color: var(--foreground);
	}

	/* ── Turn banner ─────────────────────────────── */

	.turn-banner {
		padding: 0.4rem 1rem;
		text-align: center;
		font-family: var(--font-heading);
		font-size: 0.95rem;
		letter-spacing: 0.18em;
		color: var(--muted-foreground);
		transition: background 200ms, color 200ms;
	}
	.turn-banner.mine {
		color: var(--ya);
		background: var(--ya-dim);
	}
	.turn-banner.over {
		color: var(--foreground);
	}

	/* ── Dice tray ───────────────────────────────── */

	.dice-tray {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.125rem;
		padding: 1.375rem 1rem 1.5rem;
		background:
			radial-gradient(circle, rgba(255, 255, 255, 0.032) 1px, transparent 1px),
			var(--ya-felt);
		background-size:
			18px 18px,
			100% 100%;
		border-bottom: 1px solid rgba(232, 160, 56, 0.1);
		overflow: hidden;
	}

	.dice-tray::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse 90% 80% at 50% 50%,
			transparent 25%,
			rgba(0, 0, 0, 0.52) 100%
		);
		pointer-events: none;
		z-index: 0;
	}

	.dice-shelf {
		display: flex;
		gap: 0.75rem;
		position: relative;
		z-index: 1;
	}

	.die-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: default;
		border-radius: 0.5rem;
		transition:
			transform 150ms,
			opacity 150ms;
	}
	.die-btn.holdable {
		cursor: pointer;
	}
	.die-btn.unrolled {
		opacity: 0.28;
	}
	.die-btn.holdable:active {
		transform: scale(0.9);
	}

	/* ── Roll zone ───────────────────────────────── */

	.roll-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.45rem;
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 210px;
	}

	.rolls-left {
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
	}

	.rolls-n {
		font-family: var(--font-heading);
		font-size: 2.25rem;
		line-height: 1;
		color: var(--ya);
	}

	.rolls-txt {
		font-family: var(--font-heading);
		font-size: 0.78rem;
		letter-spacing: 0.12em;
		color: rgba(232, 160, 56, 0.65);
	}

	.score-prompt {
		font-family: var(--font-heading);
		font-size: 0.75rem;
		letter-spacing: 0.16em;
		color: rgba(232, 160, 56, 0.5);
	}

	.roll-btn {
		width: 100%;
		padding: 0.8rem 0;
		font-family: var(--font-heading);
		font-size: 1.5rem;
		letter-spacing: 0.32em;
		color: #160c00;
		background: var(--ya);
		border: none;
		border-radius: 999px;
		cursor: pointer;
		transition:
			transform 100ms,
			background 120ms,
			box-shadow 120ms;
		box-shadow:
			0 4px 0 rgba(0, 0, 0, 0.5),
			0 0 22px var(--ya-glow);
	}
	.roll-btn:hover:not(:disabled) {
		background: #f0b448;
		box-shadow:
			0 4px 0 rgba(0, 0, 0, 0.5),
			0 0 34px var(--ya-glow);
	}
	.roll-btn:active:not(:disabled) {
		transform: translateY(4px);
		box-shadow:
			0 0 0 rgba(0, 0, 0, 0),
			0 0 14px var(--ya-glow);
	}
	.roll-btn:disabled {
		background: rgba(232, 160, 56, 0.16);
		color: rgba(255, 255, 255, 0.1);
		cursor: not-allowed;
		box-shadow: none;
	}

	/* ── Scorecard ───────────────────────────────── */

	.scorecard {
		flex: 1;
		overflow-x: auto;
		padding-bottom: 2rem;
	}

	.score-table {
		width: 100%;
		min-width: max-content;
		border-collapse: collapse;
		font-size: 0.8rem;
	}

	.score-table thead tr {
		border-bottom: 1px solid rgba(232, 160, 56, 0.2);
	}

	.th-cat {
		min-width: 126px;
		padding: 0.6rem 0.75rem 0.5rem;
		text-align: left;
	}

	.th-player {
		min-width: 62px;
		padding: 0.6rem 0.75rem 0.5rem;
		text-align: center;
		font-family: var(--font-heading);
		font-size: 0.85rem;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
		white-space: nowrap;
	}

	.th-player.active {
		color: var(--ya);
	}

	.active-dot {
		display: inline-block;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--ya);
		margin-left: 4px;
		vertical-align: middle;
		animation: blink 1.4s ease-in-out infinite;
	}

	@keyframes blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.2;
		}
	}

	/* Section divider row */

	.section-row td {
		padding: 0.5rem 0;
	}

	.section-divider {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0 0.75rem;
	}

	.section-rule {
		flex: 1;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			rgba(232, 160, 56, 0.3),
			transparent
		);
	}

	.section-label {
		font-family: var(--font-heading);
		font-size: 0.62rem;
		letter-spacing: 0.2em;
		color: rgba(232, 160, 56, 0.5);
		white-space: nowrap;
	}

	/* Score rows */

	.score-row {
		border-bottom: 1px solid var(--border);
		transition: background 100ms;
	}

	.score-row.clickable {
		cursor: pointer;
	}

	.score-row.clickable:hover {
		background: rgba(232, 160, 56, 0.07);
	}

	.td-cat {
		padding: 0.4rem 0.75rem;
		color: var(--muted-foreground);
		font-size: 0.78rem;
		text-align: left;
		white-space: nowrap;
	}

	.td-cat.sub {
		font-size: 0.7rem;
		opacity: 0.6;
	}

	.td-score {
		padding: 0.4rem 0.75rem;
		text-align: center;
		font-family: var(--font-display);
		font-size: 0.95rem;
		color: var(--muted-foreground);
	}

	.td-score.activecol {
		background: rgba(232, 160, 56, 0.04);
	}

	.td-score.filled {
		color: var(--foreground);
		font-weight: 600;
	}

	.td-score.preview {
		color: rgba(232, 160, 56, 0.58);
		font-style: italic;
	}

	.td-score.myclick {
		color: var(--ya);
	}

	.td-score.sub {
		font-family: var(--font-sans);
		font-size: 0.7rem;
		opacity: 0.6;
	}

	.td-score.earned {
		font-family: var(--font-sans);
		font-size: 0.75rem;
		font-style: normal;
		color: #4ade80;
		opacity: 1;
	}

	/* Sub rows */

	.sub-row {
		border-bottom: 1px solid var(--border);
		background: rgba(255, 255, 255, 0.015);
	}

	/* Total row */

	.total-row {
		border-top: 1px solid rgba(232, 160, 56, 0.28);
	}

	.td-total-label {
		padding: 0.7rem 0.75rem;
		font-family: var(--font-heading);
		font-size: 0.88rem;
		letter-spacing: 0.12em;
		color: var(--ya);
		text-align: left;
	}

	.td-total {
		padding: 0.7rem 0.75rem;
		text-align: center;
		font-family: var(--font-display);
		font-size: 1.6rem;
		font-weight: 600;
		color: var(--foreground);
	}

	.td-total.activecol {
		color: var(--ya);
		background: rgba(232, 160, 56, 0.04);
	}
</style>
