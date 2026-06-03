<script lang="ts">
import { CircleX, Equal, RefreshCw, Settings, Trophy } from 'lucide-svelte'
import { fly } from 'svelte/transition'
import GameLayout from '$lib/components/games/GameLayout.svelte'
import PlayingCard from '$lib/components/PlayingCard.svelte'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
import type { GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'
import { type BlackjackState, handValue } from '$lib/games/blackjack/blackjack'
import { t } from '$lib/i18n'
import type { LobbyPlayer } from '$lib/network/messages'
import { settingsOpen } from '$lib/stores/settings'

let {
	state: gameState,
	myPlayerId,
	players,
	validActions,
	onAction,
	isSpectator = false,
	deckSlug
}: {
	state: GameStateGeneric
	myPlayerId: string
	players: LobbyPlayer[]
	validActions: Action[]
	onAction: (action: Action) => void
	isSpectator?: boolean
	deckSlug?: string
} = $props()

const gs = $derived(gameState as unknown as BlackjackState)

function zone(id: string) {
	return gs.zones[id]
}

function playerName(id: string): string {
	return players.find((p) => p.id === id)?.name ?? id
}

const dealerCards = $derived(zone('hand_dealer')?.cards ?? [])
const dealerValue = $derived(handValue(dealerCards))
const dealerBust = $derived(dealerValue > 21)
const allPlayers = $derived(gs.players ?? [])
const iAmInGame = $derived(allPlayers.includes(myPlayerId))
const isScoring = $derived(gs.phase === 'scoring' || gs.phase === 'gameover')

// During playing phase show only visible dealer card value (hole card is hidden)
const dealerVisibleValue = $derived(
	gs.phase === 'playing' && dealerCards.length > 0 ? handValue([dealerCards[0]]) : dealerValue
)

// --- Dealing animation ---
// Cards appear in casino deal order: P1, P2, …, Dealer(up), P1, P2, …, Dealer(down)
let revealedCount = $state(0)
const firstCardId = $derived(gs.zones[`hand_${gs.players?.[0]}`]?.cards[0]?.id ?? '')
const totalInitialCards = $derived((gs.players.length + 1) * 2)

$effect(() => {
	void firstCardId // reactive dependency — reset animation on new deal
	revealedCount = 0
})

$effect(() => {
	if (revealedCount < totalInitialCards) {
		const timer = setTimeout(() => {
			revealedCount++
		}, 300)
		return () => clearTimeout(timer)
	}
})

function playerCardVisible(pid: string, cardIdx: number): boolean {
	if (cardIdx >= 2) return true // HIT cards always visible immediately
	const pIdx = gs.players.indexOf(pid)
	const n = gs.players.length
	const dealIdx = cardIdx === 0 ? pIdx : n + 1 + pIdx
	return revealedCount > dealIdx
}

function dealerCardVisible(cardIdx: number): boolean {
	if (cardIdx >= 2) return true // dealer draws always show immediately
	const n = gs.players.length
	const dealIdx = cardIdx === 0 ? n : 2 * n + 1
	return revealedCount > dealIdx
}

// --- Actions ---
const hitAction = $derived(validActions.find((a) => a.type === 'HIT') ?? null)
const standAction = $derived(validActions.find((a) => a.type === 'STAND') ?? null)
const doubleAction = $derived(validActions.find((a) => a.type === 'DOUBLE') ?? null)
const newRoundAction = $derived(validActions.find((a) => a.type === 'NEW_ROUND') ?? null)
const endGameAction = $derived(validActions.find((a) => a.type === 'END_GAME') ?? null)
const hasPlayActions = $derived(!!(hitAction || standAction || doubleAction))
const hasScoringActions = $derived(!!(newRoundAction || endGameAction))

function playerResult(pid: string): 'win' | 'lose' | 'push' {
	const status = gs.playerStatus?.[pid]
	if (status === 'bust') return 'lose'
	const val = handValue(zone(`hand_${pid}`)?.cards ?? [])
	if (dealerBust) return 'win'
	if (val > dealerValue) return 'win'
	if (val === dealerValue) return 'push'
	return 'lose'
}

const currentTurnName = $derived(
	gs.turnPlayerId && allPlayers.includes(gs.turnPlayerId) ? playerName(gs.turnPlayerId) : ''
)

// dealerWins = true only when ALL players strictly lose (no pushes, no wins)
const dealerWins = $derived(
	isScoring &&
		!dealerBust &&
		(allPlayers.every((p) => {
			const s = gs.playerStatus?.[p]
			if (s === 'bust') return true
			return handValue(zone(`hand_${p}`)?.cards ?? []) < dealerValue
		}) ??
			false)
)
</script>

{#snippet valuePill(value: number, status: string)}
	<span
		class="vpill"
		class:vpill--bust={status === 'bust' || value > 21}
		class:vpill--twenty-one={value === 21 && status !== 'bust'}
	>
		{value}{#if status === 'bust'}&thinsp;<span class="vpill-bust-label">{$t('blackjack.bust')}</span>{/if}
	</span>
{/snippet}

{#snippet resultBadge(result: 'win' | 'lose' | 'push')}
	<span class="rbadge rbadge--{result}">
		{#if result === 'win'}<Trophy size={11} />{:else if result === 'lose'}<CircleX size={11} />{:else}<Equal size={11} />{/if}
		{$t(`blackjack.${result}`)}
	</span>
{/snippet}

{#snippet dealerSection()}
	<div class="dealer-zone">
		<div class="dealer-header">
			<span class="dealer-label">{$t('blackjack.dealer')}</span>
			{#if isScoring}
				{#if dealerWins}
					<span class="rbadge rbadge--win"><Trophy size={11} />{$t('blackjack.dealerWins')}</span>
				{:else}
					<span class="dealer-score" class:dealer-score--bust={dealerBust}>
						{dealerBust ? $t('blackjack.bust') : dealerValue}
					</span>
				{/if}
			{/if}
		</div>
		<div class="card-fan">
			{#each dealerCards as card, i (card.id)}
				{#if dealerCardVisible(i)}
					<div in:fly={{ y: -28, duration: 220, opacity: 0 }}>
						<PlayingCard {card} size="sm" back={i === 1 && gs.phase === 'playing'} {deckSlug} />
					</div>
				{/if}
			{/each}
			{#if !dealerCards.some((_, i) => dealerCardVisible(i))}
				<div class="card-ghost" aria-hidden="true"></div>
			{/if}
		</div>
		{@render valuePill(dealerVisibleValue, isScoring && dealerBust ? 'bust' : '')}
	</div>
{/snippet}

{#snippet playerTile(pid: string)}
	{@const isMe = pid === myPlayerId}
	{@const cards = zone(`hand_${pid}`)?.cards ?? []}
	{@const val = handValue(cards)}
	{@const status = gs.playerStatus?.[pid] ?? 'playing'}
	{@const isActive = gs.turnPlayerId === pid && gs.phase === 'playing'}
	{@const hasVisibleCard = cards.some((_, i) => playerCardVisible(pid, i))}
	<div class="player-tile" class:player-tile--me={isMe} class:player-tile--active={isActive}>
		<span class="seat-label" class:seat-label--me={isMe}>
			{isMe ? $t('common.you') : playerName(pid)}
		</span>
		<div class="card-fan">
			{#each cards as card, i (card.id)}
				{#if playerCardVisible(pid, i)}
					<div in:fly={{ y: -28, duration: 220, opacity: 0 }}>
						<PlayingCard {card} size="sm" {deckSlug} />
					</div>
				{/if}
			{/each}
			{#if !hasVisibleCard}
				<div class="card-ghost" aria-hidden="true"></div>
			{/if}
		</div>
		<div class="tile-bottom">
			{#if hasVisibleCard}
				{@render valuePill(val, status)}
			{/if}
			{#if isScoring && iAmInGame}{@render resultBadge(playerResult(pid))}{/if}
		</div>
	</div>
{/snippet}

{#snippet center()}
	{@render dealerSection()}
{/snippet}

<div class="felt flex min-h-screen flex-col pb-24">
	<!-- Header -->
	<header class="flex items-center justify-between px-4 py-2">
		<span class="font-heading text-xs uppercase tracking-[0.3em] text-emerald-500/50">
			{$t('blackjack.name')}
		</span>
		<div class="flex items-center gap-1">
			<button
				onclick={() => ($settingsOpen = true)}
				class="rounded p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
				aria-label="Settings"
			>
				<Settings size={16} />
			</button>
			<RulesDrawer gameId="blackjack" size={16} />
		</div>
	</header>

	<!-- Table body -->
	<div class="flex flex-1 flex-col items-center gap-4 px-4 pt-2">
		{#if allPlayers.length === 1}
			<!-- Solo: dealer on top, player below -->
			<div class="flex flex-col items-center gap-4 w-full">
				{@render dealerSection()}
				{@render playerTile(allPlayers[0])}
			</div>
		{:else}
			<div class="w-full">
				<GameLayout opponents={allPlayers} opponentTile={playerTile} {center} />
			</div>
		{/if}
	</div>
</div>

<!-- Sticky action footer -->
<div class="action-footer">
	{#if !isSpectator}
		{#if hasPlayActions}
			<div class="footer-inner">
				{#if hitAction}
					<button class="bj-btn bj-btn--hit" onclick={() => onAction(hitAction)}>
						{$t('blackjack.hit')}
					</button>
				{/if}
				{#if standAction}
					<button class="bj-btn bj-btn--stand" onclick={() => onAction(standAction)}>
						{$t('blackjack.stand')}
					</button>
				{/if}
				{#if doubleAction}
					<button class="bj-btn bj-btn--double" onclick={() => onAction(doubleAction)}>
						2× {$t('blackjack.double')}
					</button>
				{/if}
			</div>
		{:else if hasScoringActions}
			<div class="footer-inner">
				{#if newRoundAction}
					<button class="bj-btn bj-btn--new-round" onclick={() => onAction(newRoundAction)}>
						<RefreshCw size={14} />
						{$t('blackjack.newRound')}
					</button>
				{/if}
				{#if endGameAction}
					<button class="bj-btn bj-btn--end" onclick={() => onAction(endGameAction)}>
						{$t('blackjack.endGame')}
					</button>
				{/if}
			</div>
		{:else if gs.phase === 'playing'}
			<div class="footer-wait">
				<p class="wait-msg">{$t('common.waitingFor', { name: currentTurnName })}</p>
			</div>
		{:else if isScoring}
			<div class="footer-wait">
				<p class="wait-msg">{$t('common.waitingFor', { name: playerName(allPlayers[0]) })}</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	.felt {
		background:
			radial-gradient(ellipse 85% 55% at 50% 38%, oklch(0.2 0.07 145 / 0.45) 0%, transparent 65%),
			oklch(0.13 0.04 145);
	}

	/* Dealer zone */
	.dealer-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 14px 28px 16px;
		border: 1px solid oklch(0.72 0.15 80 / 0.18);
		border-radius: 18px;
		background: oklch(0.16 0.05 145 / 0.55);
	}

	.dealer-header {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.dealer-label {
		font-family: var(--font-heading);
		font-size: 0.6rem;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: oklch(0.72 0.15 80 / 0.75);
	}

	.dealer-score {
		font-family: var(--font-heading);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: oklch(0.55 0 0);
	}

	.dealer-score--bust {
		color: oklch(0.65 0.22 15);
	}

	/* Card fan — positive gap instead of overlap */
	.card-fan {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		flex-wrap: wrap;
	}

	/* Ghost placeholder */
	.card-ghost {
		width: 52px;
		height: 74px;
		border-radius: 6px;
		border: 1px dashed oklch(1 0 0 / 0.08);
	}

	/* Value pill */
	.vpill {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 2px 10px;
		border-radius: 9999px;
		font-family: var(--font-heading);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		background: oklch(0.22 0.03 145);
		color: oklch(0.72 0 0);
		border: 1px solid oklch(1 0 0 / 0.09);
		transition: all 0.2s ease;
	}

	.vpill--bust {
		background: oklch(0.26 0.07 15);
		color: oklch(0.75 0.2 15);
		border-color: oklch(0.55 0.22 15 / 0.3);
	}

	.vpill--twenty-one {
		background: oklch(0.22 0.06 80);
		color: oklch(0.85 0.18 80);
		border-color: oklch(0.72 0.15 80 / 0.45);
		box-shadow: 0 0 10px oklch(0.72 0.15 80 / 0.28);
	}

	.vpill-bust-label {
		font-size: 0.56rem;
		letter-spacing: 0.04em;
		opacity: 0.75;
		text-transform: uppercase;
	}

	/* Result badge */
	.rbadge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 9px;
		border-radius: 9999px;
		font-family: var(--font-heading);
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.rbadge--win {
		background: oklch(0.22 0.07 80);
		color: oklch(0.82 0.18 80);
		border: 1px solid oklch(0.72 0.15 80 / 0.38);
	}

	.rbadge--lose {
		background: oklch(0.2 0.05 15);
		color: oklch(0.7 0.2 15);
		border: 1px solid oklch(0.55 0.22 15 / 0.3);
	}

	.rbadge--push {
		background: oklch(0.2 0 0);
		color: oklch(0.5 0 0);
		border: 1px solid oklch(1 0 0 / 0.1);
	}

	/* Player tile */
	.player-tile {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 8px 10px;
		border-radius: 12px;
		border: 1px solid transparent;
		transition: border-color 0.2s ease;
	}

	.player-tile--me {
		border-color: oklch(0.72 0.15 80 / 0.25);
		background: oklch(0.17 0.05 145 / 0.4);
	}

	.player-tile--active {
		border-color: oklch(0.55 0.18 145 / 0.6);
		box-shadow: 0 0 12px oklch(0.38 0.15 145 / 0.3);
	}

	/* Seat label */
	.seat-label {
		font-family: var(--font-heading);
		font-size: 0.62rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: oklch(0.45 0 0);
	}

	.seat-label--me {
		color: oklch(0.72 0.15 80 / 0.8);
	}

	.tile-bottom {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
		justify-content: center;
	}

	/* Sticky action footer */
	.action-footer {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: linear-gradient(to top, oklch(0.11 0.04 145) 60%, oklch(0.11 0.04 145 / 0) 100%);
		padding: 12px 16px 20px;
		display: flex;
		justify-content: center;
	}

	.footer-inner {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.footer-wait {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 44px;
	}

	.wait-msg {
		font-size: 0.78rem;
		color: oklch(0.42 0 0);
		text-align: center;
	}

	/* Action buttons */
	.bj-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.6rem 1.5rem;
		border: none;
		border-radius: 4px;
		font-family: var(--font-heading);
		font-size: 0.9rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		cursor: pointer;
		transition:
			filter 0.15s ease,
			transform 0.1s ease;
	}

	.bj-btn:focus-visible {
		outline: 2px solid oklch(0.6 0.15 145);
		outline-offset: 3px;
	}

	.bj-btn:active {
		transform: scale(0.96);
	}

	.bj-btn--hit {
		background: linear-gradient(
			135deg,
			oklch(0.22 0.1 145) 0%,
			oklch(0.38 0.15 145) 45%,
			oklch(0.22 0.1 145) 100%
		);
		color: oklch(0.9 0.05 145);
		box-shadow:
			0 0 0 1px oklch(0.52 0.18 145 / 0.38),
			0 4px 14px oklch(0.22 0.1 145 / 0.5);
		animation: hit-pulse 2.5s ease-in-out infinite;
	}

	.bj-btn--hit:hover {
		filter: brightness(1.22);
	}

	@keyframes hit-pulse {
		0%,
		100% {
			box-shadow:
				0 0 0 1px oklch(0.52 0.18 145 / 0.38),
				0 4px 14px oklch(0.22 0.1 145 / 0.5);
		}
		50% {
			box-shadow:
				0 0 0 1px oklch(0.58 0.2 145 / 0.55),
				0 4px 22px oklch(0.28 0.12 145 / 0.7);
		}
	}

	.bj-btn--stand {
		background: oklch(0.19 0 0);
		color: oklch(0.5 0 0);
		border: 1px solid oklch(1 0 0 / 0.11);
	}

	.bj-btn--stand:hover {
		filter: brightness(1.3);
	}

	.bj-btn--double {
		background: linear-gradient(
			135deg,
			oklch(0.2 0.09 220) 0%,
			oklch(0.32 0.13 220) 45%,
			oklch(0.2 0.09 220) 100%
		);
		color: oklch(0.82 0.11 220);
		box-shadow: 0 0 0 1px oklch(0.48 0.16 220 / 0.32);
	}

	.bj-btn--double:hover {
		filter: brightness(1.2);
	}

	.bj-btn--new-round {
		background: linear-gradient(
			135deg,
			oklch(0.22 0.1 145) 0%,
			oklch(0.36 0.14 145) 45%,
			oklch(0.22 0.1 145) 100%
		);
		color: oklch(0.88 0.06 145);
		box-shadow: 0 0 0 1px oklch(0.5 0.18 145 / 0.35);
		padding: 0.6rem 2rem;
	}

	.bj-btn--new-round:hover {
		filter: brightness(1.2);
	}

	.bj-btn--end {
		background: oklch(0.18 0 0);
		color: oklch(0.4 0 0);
		border: 1px solid oklch(1 0 0 / 0.08);
		font-size: 0.75rem;
		padding: 0.4rem 1rem;
	}

	.bj-btn--end:hover {
		filter: brightness(1.3);
	}
</style>
