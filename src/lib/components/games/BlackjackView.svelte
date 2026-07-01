<script lang="ts">
import { CircleX, Coins, Equal, RefreshCw, RotateCcw, Settings, Trophy } from 'lucide-svelte'
import { fly } from 'svelte/transition'
import GameTitle from '$lib/components/GameTitle.svelte'
import GameLayout from '$lib/components/games/GameLayout.svelte'
import PlayingCard from '$lib/components/PlayingCard.svelte'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
import type { Card, GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'
import {
	type BlackjackState,
	betNet,
	handValue,
	hasSplit,
	type RoundResult,
	roundOutcome,
	splitOutcome,
	splitZoneId
} from '$lib/games/blackjack/blackjack'
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

// --- Betting ---
const bettingOn = $derived(gs.options?.betting === true)
const isBetting = $derived(gs.phase === 'betting')
const coinsOf = (pid: string): number => gs.coins?.[pid] ?? 0
const betOf = (pid: string): number | undefined => gs.bets?.[pid]
// >1 means the player went broke and was rebought — surface which buy-in they're on
const buyInOf = (pid: string): number => gs.buyIns?.[pid] ?? 1
const myCoins = $derived(coinsOf(myPlayerId))
const placeBetAction = $derived(validActions.find((a) => a.type === 'PLACE_BET') ?? null)
const chipValues = $derived([5, 25, 100, 500].filter((v) => v <= myCoins))

let betDraft = $state(0)
// Reset the draft each time a fresh betting phase opens
$effect(() => {
	if (isBetting) betDraft = 0
})

function addChip(v: number) {
	betDraft = Math.min(myCoins, betDraft + v)
}
function confirmBet() {
	if (!placeBetAction || betDraft < 1 || betDraft > myCoins) return
	onAction({ ...placeBetAction, payload: { amount: betDraft } })
}

// --- Split: a player has 1 hand normally, 2 after splitting ---
type TileHand = {
	zoneId: string
	cards: Card[]
	status: string
	bet: number | undefined
	idx: 0 | 1
}

function tileHands(pid: string): TileHand[] {
	const primary: TileHand = {
		zoneId: `hand_${pid}`,
		cards: zone(`hand_${pid}`)?.cards ?? [],
		status: gs.playerStatus?.[pid] ?? 'playing',
		bet: betOf(pid),
		idx: 0
	}
	if (gs.splitStatus?.[pid] === undefined) return [primary]
	return [
		primary,
		{
			zoneId: splitZoneId(pid),
			cards: zone(splitZoneId(pid))?.cards ?? [],
			status: gs.splitStatus[pid],
			bet: gs.splitBets?.[pid],
			idx: 1
		}
	]
}

function handResult(pid: string, h: TileHand): RoundResult {
	return h.idx === 0 ? roundOutcome(gs, pid) : (splitOutcome(gs, pid) ?? 'push')
}

// Net coin change for a settled hand, for the scoring badge
function handDelta(pid: string, h: TileHand): number {
	const bet = h.bet ?? 0
	if (bet <= 0) return 0
	const natural =
		h.idx === 0 && !hasSplit(gs, pid) && h.cards.length === 2 && handValue(h.cards) === 21
	return betNet(bet, handResult(pid, h), natural)
}

// Engine credits payouts the instant scoring starts. Hold the displayed count at
// its pre-payout value until the dealer finishes revealing, so coins move in sync
// with the result badges instead of jumping ahead of the reveal.
function displayedCoins(pid: string): number {
	const real = coinsOf(pid)
	if (!bettingOn || !isScoring || dealerRevealDone) return real
	let payout = 0
	for (const h of tileHands(pid)) {
		const bet = h.bet ?? 0
		if (bet > 0) payout += bet + handDelta(pid, h)
	}
	return real - payout
}

// --- Dealing animation ---
// Cards appear in casino deal order: P1, P2, …, Dealer(up), P1, P2, …, Dealer(down)
let revealedCount = $state(0)
const firstCardId = $derived(gs.zones[`hand_${gs.players?.[0]}`]?.cards[0]?.id ?? '')
const totalInitialCards = $derived((gs.players.length + 1) * 2)
const dealDone = $derived(revealedCount >= totalInitialCards)
// Keep total deal time bounded (~1.8s) so big tables don't stall — faster per card with more players
const dealInterval = $derived(Math.min(260, Math.round(1800 / totalInitialCards)))

$effect(() => {
	void firstCardId // reactive dependency — reset animation on new deal
	revealedCount = 0
})

$effect(() => {
	if (!isBetting && revealedCount < totalInitialCards) {
		const timer = setTimeout(() => {
			revealedCount++
		}, dealInterval)
		return () => clearTimeout(timer)
	}
})

// --- BJ + dealer turn announcements + draw animation ---
const dealerNaturalBJ = $derived(
	isScoring && dealerCards.length === 2 && handValue(dealerCards) === 21
)
const dealerExtraCardId = $derived(dealerCards[2]?.id ?? '')
let dealerExtraRevealCount = $state(0)
let showDealerTitle = $state(false)
let dealerTurnReady = $state(false)

// Natural BJ announcement state
let bjList = $state<string[]>([])
let bjIndex = $state(0)
let currentBJName = $state('')
let showBJTitle = $state(false)
let bjDone = $state(false)
let bjAnnouncedForKey = $state('')
let announcementTitle = $state('')

// Reset BJ state on new deal
$effect(() => {
	void firstCardId
	bjDone = false
	bjList = []
	bjIndex = 0
	showBJTitle = false
})

// Queue natural BJs after deal animation completes
$effect(() => {
	if (revealedCount < totalInitialCards || firstCardId === bjAnnouncedForKey) return
	bjAnnouncedForKey = firstCardId
	const bjs: string[] = []
	for (const pid of gs.players) {
		const hand = gs.zones[`hand_${pid}`]?.cards ?? []
		if (hand.length === 2 && handValue(hand) === 21) bjs.push(playerName(pid))
	}
	if (dealerCards.length === 2 && handValue(dealerCards) === 21) bjs.push($t('blackjack.dealer'))
	if (bjs.length > 0) {
		bjList = bjs
		bjIndex = 0
	} else {
		bjDone = true
	}
})

// Walk the BJ list by index: show each name 1.6s, ~450ms exit gap, then advance.
// Driven by bjIndex only (currentBJName/showBJTitle are written, never read here),
// so writing them doesn't re-trigger this effect and cancel its own timers.
$effect(() => {
	if (bjList.length === 0) return
	if (bjIndex >= bjList.length) {
		if (!bjDone) {
			const t = setTimeout(() => {
				bjDone = true
			}, 450)
			return () => clearTimeout(t)
		}
		return
	}
	currentBJName = bjList[bjIndex]
	showBJTitle = true
	const idx = bjIndex
	const hideT = setTimeout(() => {
		showBJTitle = false
	}, 1600)
	const nextT = setTimeout(() => {
		bjIndex = idx + 1
	}, 2050)
	return () => {
		clearTimeout(hideT)
		clearTimeout(nextT)
	}
})

// Keep announcement title stable during exit animation
$effect(() => {
	if (showBJTitle) announcementTitle = currentBJName
	else if (showDealerTitle) announcementTitle = $t('blackjack.dealer')
})

$effect(() => {
	void dealerExtraCardId
	dealerExtraRevealCount = 0
})

$effect(() => {
	if (isScoring && bjDone && revealedCount >= totalInitialCards) {
		if (dealerNaturalBJ) {
			dealerTurnReady = true
		} else {
			showDealerTitle = true
			dealerTurnReady = false
			const timer = setTimeout(() => {
				showDealerTitle = false
				dealerTurnReady = true
			}, 1200)
			return () => clearTimeout(timer)
		}
	} else if (!isScoring) {
		showDealerTitle = false
		dealerTurnReady = false
	}
})

$effect(() => {
	const extra = dealerCards.length - 2
	if (extra > 0 && dealerExtraRevealCount < extra && dealerTurnReady) {
		const timer = setTimeout(() => {
			dealerExtraRevealCount++
		}, 400)
		return () => clearTimeout(timer)
	}
})

const dealerRevealDone = $derived(
	dealerTurnReady && dealerExtraRevealCount >= dealerCards.length - 2
)

// Before the hole card flips show only the up card; after, update as dealer cards animate in
const dealerVisibleValue = $derived(
	!dealerTurnReady && dealerCards.length > 0
		? handValue([dealerCards[0]])
		: handValue(dealerCards.slice(0, 2 + dealerExtraRevealCount))
)

function playerCardVisible(pid: string, cardIdx: number): boolean {
	if (cardIdx >= 2) return true // HIT cards always visible immediately
	const pIdx = gs.players.indexOf(pid)
	const n = gs.players.length
	const dealIdx = cardIdx === 0 ? pIdx : n + 1 + pIdx
	return revealedCount > dealIdx
}

function dealerCardVisible(cardIdx: number): boolean {
	if (cardIdx >= 2) return dealerExtraRevealCount > cardIdx - 2
	const n = gs.players.length
	const dealIdx = cardIdx === 0 ? n : 2 * n + 1
	return revealedCount > dealIdx
}

// --- Actions ---
const hitAction = $derived(validActions.find((a) => a.type === 'HIT') ?? null)
const standAction = $derived(validActions.find((a) => a.type === 'STAND') ?? null)
const doubleAction = $derived(validActions.find((a) => a.type === 'DOUBLE') ?? null)
const splitAction = $derived(validActions.find((a) => a.type === 'SPLIT') ?? null)
const newRoundAction = $derived(validActions.find((a) => a.type === 'NEW_ROUND') ?? null)
const endGameAction = $derived(validActions.find((a) => a.type === 'END_GAME') ?? null)
const hasPlayActions = $derived(!!(hitAction || standAction || doubleAction || splitAction))
const hasScoringActions = $derived(!!(newRoundAction || endGameAction))

const currentTurnName = $derived(
	gs.turnPlayerId && allPlayers.includes(gs.turnPlayerId) ? playerName(gs.turnPlayerId) : ''
)

// A single hand strictly loses (no push, no win) when busted or below the dealer
function handLoses(cards: Card[], busted: boolean): boolean {
	return busted || handValue(cards) < dealerValue
}

// dealerWins = true only when EVERY hand of every player strictly loses
const dealerWins = $derived(
	isScoring &&
		!dealerBust &&
		allPlayers.every((p) => {
			const lose0 = handLoses(zone(`hand_${p}`)?.cards ?? [], gs.playerStatus?.[p] === 'bust')
			if (gs.splitStatus?.[p] === undefined) return lose0
			const loseS = handLoses(zone(splitZoneId(p))?.cards ?? [], gs.splitStatus[p] === 'bust')
			return lose0 && loseS
		})
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
			{#if isScoring && dealerRevealDone}
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
					{#if i === 1}
						<div class="hole-flip" class:hole-flip--revealed={dealerTurnReady} in:fly={{ y: -28, duration: 220, opacity: 0 }}>
							<div class="hole-flip__inner">
								<div class="hole-flip__face hole-flip__back">
									<PlayingCard {card} size="sm" back={true} {deckSlug} />
								</div>
								<div class="hole-flip__face hole-flip__front">
									<PlayingCard {card} size="sm" {deckSlug} />
								</div>
							</div>
						</div>
					{:else}
						<div in:fly={{ y: -28, duration: 220, opacity: 0 }}>
							<PlayingCard {card} size="sm" {deckSlug} />
						</div>
					{/if}
				{/if}
			{/each}
			{#if !dealerCards.some((_, i) => dealerCardVisible(i))}
				<div class="card-ghost" aria-hidden="true"></div>
			{/if}
		</div>
		{#if dealerCards.length > 0}
			{@render valuePill(dealerVisibleValue, isScoring && dealerVisibleValue > 21 ? 'bust' : '')}
		{/if}
	</div>
{/snippet}

{#snippet playerTile(pid: string)}
	{@const isMe = pid === myPlayerId}
	{@const hands = tileHands(pid)}
	{@const split = hands.length > 1}
	{@const isActive = gs.turnPlayerId === pid && gs.phase === 'playing'}
	{@const activeSub = gs.activeHand?.[pid] ?? 0}
	<div class="player-tile" class:player-tile--me={isMe} class:player-tile--active={isActive}>
		<span class="seat-label" class:seat-label--me={isMe}>
			{isMe ? $t('common.you') : playerName(pid)}
		</span>
		{#if bettingOn}
			{@const pBet = betOf(pid)}
			<div class="bet-row">
				<span class="coin-badge"><Coins size={11} />{displayedCoins(pid)}</span>
				{#if buyInOf(pid) > 1}
					<span class="rebuy-badge" title={$t('blackjack.rebuyTitle')}>
						<RotateCcw size={10} />{$t('blackjack.buyIn', { n: buyInOf(pid) })}
					</span>
				{/if}
				{#if isBetting}
					{#if pBet !== undefined}
						<span class="bet-chip bet-chip--placed">{pBet}</span>
					{:else}
						<span class="bet-status">{$t('blackjack.placingBets')}</span>
					{/if}
				{:else if !split && pBet !== undefined && pBet > 0}
					<span class="bet-chip">{pBet}</span>
				{/if}
			</div>
		{/if}
		<div class="hands-row" class:hands-row--split={split}>
			{#each hands as h (h.zoneId)}
				{@const visible = h.idx === 0 ? h.cards.filter((_, i) => playerCardVisible(pid, i)) : h.cards}
				{@const hasVisibleCard = visible.length > 0}
				<div class="subhand" class:subhand--active={split && isActive && h.idx === activeSub}>
					{#if bettingOn && split && (h.bet ?? 0) > 0}
						<span class="bet-chip">{h.bet}</span>
					{/if}
					<div class="card-fan">
						{#each h.cards as card, i (card.id)}
							{#if h.idx === 1 || playerCardVisible(pid, i)}
								<div in:fly|global={{ y: -28, duration: 220, opacity: 0 }}>
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
							{@render valuePill(handValue(visible), h.status)}
						{/if}
						{#if isScoring && dealerRevealDone && iAmInGame}
							{@render resultBadge(handResult(pid, h))}
							{#if bettingOn && (h.bet ?? 0) > 0}
								{@const d = handDelta(pid, h)}
								<span class="bet-delta" class:bet-delta--up={d > 0} class:bet-delta--down={d < 0}>
									{d > 0 ? '+' : ''}{d}
								</span>
							{/if}
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/snippet}

{#snippet center()}
	{@render dealerSection()}
{/snippet}

<div class="felt flex min-h-screen flex-col pb-24">
	<!-- Header -->
	<header class="flex items-center justify-between px-4 py-2">
		<div class="flex items-center gap-3">
			<span class="font-heading text-xs uppercase tracking-[0.3em] text-emerald-500/50">
				{$t('blackjack.name')}
			</span>
			{#if bettingOn && iAmInGame}
				<span class="coin-badge coin-badge--header"><Coins size={13} />{displayedCoins(myPlayerId)}</span>
			{/if}
		</div>
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

<!-- Dealer turn / BJ announcement overlay -->
<div class="dealer-announcement" aria-live="polite">
	<div class="dealer-announcement__inner">
		{#if showBJTitle}
			<p class="bj-name-label" in:fly={{ y: -10, duration: 220 }}>{currentBJName}</p>
		{/if}
		<GameTitle
			title={announcementTitle}
			show={showBJTitle || showDealerTitle}
			entry="bigEntrance"
			exit="blur"
			color="gold"
			rotation="none"
			size="none"
		/>
	</div>
</div>

<!-- Sticky action footer -->
<div class="action-footer">
	{#if !isSpectator}
		{#if isBetting}
			{#if placeBetAction}
				<div class="bet-builder">
					<div class="bet-builder__top">
						<span class="bet-builder__label">{$t('blackjack.placeBet')}</span>
						<span class="bet-builder__amount">{betDraft}</span>
						<span class="coin-badge"><Coins size={12} />{myCoins}</span>
					</div>
					<div class="bet-builder__chips">
						{#each chipValues as v (v)}
							<button class="chip" onclick={() => addChip(v)}>+{v}</button>
						{/each}
						<button class="chip chip--clear" onclick={() => (betDraft = 0)}>
							{$t('blackjack.clearBet')}
						</button>
						<button class="chip chip--all" onclick={() => (betDraft = myCoins)}>
							{$t('blackjack.allIn')}
						</button>
					</div>
					<button
						class="bj-btn bj-btn--new-round bet-confirm"
						disabled={betDraft < 1 || betDraft > myCoins}
						onclick={confirmBet}
					>
						{$t('blackjack.confirmBet')} · {betDraft}
					</button>
				</div>
			{:else}
				<div class="footer-wait">
					<p class="wait-msg">{$t('blackjack.betPlaced')}</p>
				</div>
			{/if}
		{:else if !dealDone}
			<div class="footer-wait">
				<p class="wait-msg">{$t('blackjack.dealing')}</p>
			</div>
		{:else if hasPlayActions}
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
				{#if splitAction}
					<button class="bj-btn bj-btn--split" onclick={() => onAction(splitAction)}>
						{$t('blackjack.split')}
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
	/* Dealer turn / BJ announcement */
	.dealer-announcement {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		z-index: 20;
	}

	.dealer-announcement__inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.bj-name-label {
		font-family: var(--font-heading);
		font-size: 1rem;
		letter-spacing: 0.25em;
		text-transform: uppercase;
		color: oklch(0.82 0.18 80);
	}

	.felt {
		background:
			radial-gradient(ellipse 85% 55% at 50% 38%, oklch(0.2 0.07 145 / 0.45) 0%, transparent 65%),
			oklch(0.13 0.04 145);
	}

	/* Hole card flip */
	.hole-flip {
		perspective: 600px;
		width: 52px;
		height: 73px;
	}

	.hole-flip__inner {
		position: relative;
		width: 100%;
		height: 100%;
		transform-style: preserve-3d;
		transition: transform 0.5s ease;
	}

	.hole-flip--revealed .hole-flip__inner {
		transform: rotateY(180deg);
	}

	.hole-flip__face {
		position: absolute;
		inset: 0;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
	}

	.hole-flip__front {
		transform: rotateY(180deg);
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

	/* Split: side-by-side sub-hands */
	.hands-row {
		display: flex;
		gap: 6px;
		align-items: flex-start;
		justify-content: center;
	}

	.subhand {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}

	.hands-row--split .subhand {
		padding: 6px 8px;
		border-radius: 10px;
		border: 1px solid transparent;
	}

	.subhand--active {
		border-color: oklch(0.6 0.16 300 / 0.6);
		background: oklch(0.18 0.05 300 / 0.4);
		box-shadow: 0 0 10px oklch(0.4 0.14 300 / 0.3);
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

	.bj-btn--split {
		background: linear-gradient(
			135deg,
			oklch(0.22 0.1 300) 0%,
			oklch(0.34 0.14 300) 45%,
			oklch(0.22 0.1 300) 100%
		);
		color: oklch(0.85 0.12 300);
		box-shadow: 0 0 0 1px oklch(0.5 0.17 300 / 0.34);
	}

	.bj-btn--split:hover {
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

	/* --- Betting --- */
	.coin-badge {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 2px 8px;
		border-radius: 9999px;
		font-family: var(--font-heading);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: oklch(0.85 0.16 85);
		background: oklch(0.22 0.06 85 / 0.55);
		border: 1px solid oklch(0.72 0.15 85 / 0.35);
	}

	.coin-badge--header {
		font-size: 0.78rem;
	}

	.rebuy-badge {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 1px 7px;
		border-radius: 9999px;
		font-family: var(--font-heading);
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: oklch(0.72 0.18 25);
		background: oklch(0.24 0.07 25 / 0.55);
		border: 1px solid oklch(0.6 0.18 25 / 0.4);
	}

	.bet-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.bet-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 26px;
		padding: 1px 7px;
		border-radius: 9999px;
		font-family: var(--font-heading);
		font-size: 0.68rem;
		font-weight: 700;
		color: oklch(0.86 0.02 240);
		background: oklch(0.28 0.08 250 / 0.6);
		border: 1px solid oklch(0.6 0.16 250 / 0.4);
	}

	.bet-chip--placed {
		color: oklch(0.88 0.16 145);
		background: oklch(0.24 0.08 145 / 0.6);
		border-color: oklch(0.55 0.18 145 / 0.45);
	}

	.bet-status {
		font-size: 0.6rem;
		letter-spacing: 0.04em;
		color: oklch(0.5 0 0);
		font-style: italic;
	}

	.bet-delta {
		font-family: var(--font-heading);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		color: oklch(0.6 0 0);
	}

	.bet-delta--up {
		color: oklch(0.82 0.18 145);
	}

	.bet-delta--down {
		color: oklch(0.7 0.2 15);
	}

	/* Bet builder (footer) */
	.bet-builder {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 10px;
		width: 100%;
		max-width: 420px;
	}

	.bet-builder__top {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
	}

	.bet-builder__label {
		font-family: var(--font-heading);
		font-size: 0.62rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: oklch(0.55 0 0);
	}

	.bet-builder__amount {
		font-family: var(--font-heading);
		font-size: 1.5rem;
		font-weight: 700;
		color: oklch(0.85 0.16 85);
		min-width: 2ch;
		text-align: center;
	}

	.bet-builder__chips {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.chip {
		min-width: 44px;
		padding: 0.45rem 0.7rem;
		border-radius: 9999px;
		font-family: var(--font-heading);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		cursor: pointer;
		color: oklch(0.85 0.16 85);
		background: oklch(0.2 0.05 85 / 0.7);
		border: 1px solid oklch(0.6 0.14 85 / 0.4);
		transition:
			filter 0.12s ease,
			transform 0.08s ease;
	}

	.chip:hover {
		filter: brightness(1.2);
	}

	.chip:active {
		transform: scale(0.94);
	}

	.chip--clear {
		color: oklch(0.6 0 0);
		background: oklch(0.18 0 0);
		border-color: oklch(1 0 0 / 0.1);
	}

	.chip--all {
		color: oklch(0.85 0.05 145);
		background: oklch(0.22 0.08 145 / 0.7);
		border-color: oklch(0.55 0.16 145 / 0.45);
	}

	.bet-confirm {
		justify-content: center;
		width: 100%;
	}

	.bet-confirm:disabled {
		opacity: 0.4;
		cursor: default;
		filter: none;
	}
</style>
