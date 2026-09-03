<script lang="ts">
import {
	ChevronDown,
	ChevronUp,
	Crown,
	Minus,
	Settings as SettingsIcon,
	Skull
} from 'lucide-svelte'
import { untrack } from 'svelte'
import { fade } from 'svelte/transition'
import GameTitle from '$lib/components/GameTitle.svelte'
import GameLayout from '$lib/components/games/GameLayout.svelte'
import PlayingCard from '$lib/components/PlayingCard.svelte'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
import type { Card, GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'
import type { PresidentsState } from '$lib/games/presidents/presidents'
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

const gs = $derived(gameState as PresidentsState)

const me = $derived(myPlayerId)
const opponents = $derived(gs.players.filter((p) => p !== me))

function playerName(id: string): string {
	return players.find((p) => p.id === id)?.name ?? id
}

function handCount(pid: string): number {
	return gs.zones[`hand_${pid}`]?.cards.length ?? 0
}

function isFinished(pid: string): boolean {
	return !gs.activePlayers.includes(pid)
}

const myHand = $derived(gs.zones[`hand_${me}`]?.cards ?? [])
const FACE_ORDER = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']
const myHandSorted = $derived(
	[...myHand].sort((a, b) => FACE_ORDER.indexOf(a.face) - FACE_ORDER.indexOf(b.face))
)
const pileCards = $derived(gs.zones.pile?.cards ?? [])
const isMyTurn = $derived(gs.turnPlayerId === me && gs.activePlayers.includes(me))
const isExchanging = $derived(gs.phase === 'exchanging')
const isExchangeGiver = $derived(gs.pendingExchange?.president === me)
const isVpExchange = $derived(gs.pendingExchange?.isVp ?? false)
const canSelectCard = $derived(isMyTurn || (isExchanging && isExchangeGiver))

let selectedIds = $state<Set<string>>(new Set())

function toggleCard(id: string) {
	if (!canSelectCard) return
	const next = new Set(selectedIds)
	if (next.has(id)) {
		next.delete(id)
	} else {
		next.add(id)
	}
	selectedIds = next
}

const playAction = $derived(
	validActions.find((a) => {
		if (a.type !== 'PLAY') return false
		const ids = (a.payload as { cardIds: string[] }).cardIds
		if (ids.length !== selectedIds.size) return false
		return ids.every((id) => selectedIds.has(id))
	}) ?? null
)

const passAction = $derived(validActions.find((a) => a.type === 'PASS') ?? null)

function handlePlay() {
	if (!playAction) return
	onAction(playAction)
	selectedIds = new Set()
}

function handlePass() {
	if (!passAction) return
	onAction(passAction)
	selectedIds = new Set()
}

const comboLabel = $derived.by(() => {
	if (!gs.lastPlay) return null
	const key = `presidents.${gs.lastPlay.comboType}` as const
	return $t(key)
})

function getRoleLabel(index: number, total: number): string {
	if (index === 0) return $t('presidents.rankPresident')
	if (index === total - 1) return $t('presidents.rankScum')
	if (total >= 4 && index === 1) return $t('presidents.rankVicePresident')
	if (total >= 4 && index === total - 2) return $t('presidents.rankViceScum')
	return $t('presidents.rankNeutral')
}

const VALUE_TO_FACE: Record<number, string> = {
	3: '3',
	4: '4',
	5: '5',
	6: '6',
	7: '7',
	8: '8',
	9: '9',
	10: '10',
	11: 'J',
	12: 'Q',
	13: 'K',
	14: 'A',
	15: '2'
}
const lockedFace = $derived(
	gs.sameValueLock && gs.lastPlay ? VALUE_TO_FACE[gs.lastPlay.value] : null
)

const giveAction = $derived(
	validActions.find((a) => {
		if (a.type !== 'GIVE_CARDS') return false
		const ids = (a.payload as { cardIds: string[] }).cardIds
		return ids.length === selectedIds.size && ids.every((id) => selectedIds.has(id))
	}) ?? null
)

function handleGive() {
	if (!giveAction) return
	onAction(giveAction)
	selectedIds = new Set()
}

let exchangeFlash = $state<Card[] | null>(null)
let exchangeFlashTitle = $state<string>('')
let _exchangeTimer: ReturnType<typeof setTimeout> | null = null
let _prevPhase = untrack(() => gs.phase)

$effect(() => {
	const phase = gs.phase
	if (_prevPhase === 'exchanging' && phase === 'playing') {
		const le = gs.lastExchange
		let cards: Card[] | null = null
		if (le?.scum === me) {
			cards = le.givenToScum
			exchangeFlashTitle = $t('presidents.exchangeReceivedTitle')
		} else if (le?.president === me) {
			cards = le.givenToPresident
			exchangeFlashTitle = $t('presidents.exchangeReceivedFromScum')
		} else if (le?.vs === me && le.givenToVs) {
			cards = le.givenToVs
			exchangeFlashTitle = $t('presidents.exchangeReceivedFromVp')
		} else if (le?.vp === me && le.givenToVp) {
			cards = le.givenToVp
			exchangeFlashTitle = $t('presidents.exchangeReceivedFromVs')
		}
		if (cards && cards.length > 0) {
			if (_exchangeTimer) clearTimeout(_exchangeTimer)
			exchangeFlash = cards
			_exchangeTimer = setTimeout(() => {
				exchangeFlash = null
			}, 3500)
		}
	}
	_prevPhase = phase
})

let showTurnFlash = $state(false)
let _prevTurnId = untrack(() => gs.turnPlayerId)

$effect(() => {
	const tid = gs.turnPlayerId
	if (tid !== _prevTurnId) {
		if (tid === me) {
			showTurnFlash = true
			setTimeout(() => (showTurnFlash = false), 1600)
		}
		_prevTurnId = tid
	}
})
</script>

<div class="pres-root">
	<!-- Header -->
	<header class="pres-hdr">
		<span class="pres-hdr-title">{$t('presidents.name')}</span>
		<span class="pres-hdr-turn">
			{#if gs.phase !== 'gameover'}
				{#if isExchanging}
					<em>{$t('presidents.exchangeTitle')}</em>
				{:else if isMyTurn}
					{$t('presidents.yourTurn')}
				{:else}
					{$t('common.waitingFor', { name: playerName(gs.turnPlayerId) })}
				{/if}
			{/if}
		</span>
		<div class="pres-hdr-icons">
			<button onclick={() => ($settingsOpen = true)} class="hdr-btn" aria-label="Settings">
				<SettingsIcon size={15} />
			</button>
			<RulesDrawer gameId="presidents" size={15} />
		</div>
	</header>

	{#if gs.phase === 'gameover'}
		<!-- Results screen -->
		<div class="gameover-screen">
			<h2 class="gameover-heading">{$t('presidents.results')}</h2>
			<ol class="rank-list">
				{#each gs.finishOrder as pid, i}
					{@const isMe = pid === me}
					{@const total = gs.finishOrder.length}
					<li class="rank-item {isMe ? 'rank-item--me' : ''}">
						<span class="rank-num">#{i + 1}</span>
						<span class="rank-icon">
							{#if i === 0}
								<Crown size={15} />
							{:else if total >= 4 && i === 1}
								<ChevronUp size={15} />
							{:else if total >= 4 && i === total - 2}
								<ChevronDown size={15} />
							{:else if i === total - 1}
								<Skull size={15} />
							{:else}
								<Minus size={15} />
							{/if}
						</span>
						<span class="rank-name">
							{playerName(pid)}{isMe ? ` (${$t('common.you')})` : ''}
						</span>
						<span class="rank-role">{getRoleLabel(i, total)}</span>
					</li>
				{/each}
			</ol>
		</div>
	{:else}
		<div class="pres-body">
				{#snippet opponentTile(pid: string)}
				{@const active = gs.turnPlayerId === pid}
				{@const done = isFinished(pid)}
				<div class="opp-tile {active ? 'opp-tile--active' : ''} {done ? 'opp-tile--done' : ''}">
					<span class="opp-name">{playerName(pid)}{#if active}&thinsp;▶{/if}</span>
					<div class="opp-cards">
						{#each { length: Math.min(handCount(pid), 5) } as _}
							<PlayingCard card={null} back size="sm" />
						{/each}
						{#if handCount(pid) > 5}
							<span class="opp-more">+{handCount(pid) - 5}</span>
						{/if}
						{#if handCount(pid) === 0}
							<span class="opp-empty">{$t('game.empty')}</span>
						{/if}
					</div>
					{#if done}
						<span class="opp-done">{$t('presidents.finished')}</span>
					{/if}
				</div>
			{/snippet}

			{#snippet center()}
				<div class="table-area">
					<div class="pile-area">
						<span class="pile-label">{$t('presidents.pile')}</span>
						{#if pileCards.length > 0}
							<div class="pile-cards">
								{#each pileCards as card}
									<PlayingCard {card} size="md" />
								{/each}
							</div>
							<div class="pile-meta">
								{#if comboLabel}<span class="combo-label">{comboLabel}</span>{/if}
								{#if lockedFace}<span class="lock-badge">= {lockedFace}</span>{/if}
							</div>
						{:else}
							<div class="pile-empty">
								<span class="pile-empty-text">{$t('game.empty')}</span>
							</div>
						{/if}
					</div>
					{#if !isExchanging}
						<div class="status-line">
							{#if isMyTurn && lockedFace}
								<span class="status--active">{$t('presidents.lockedPlay', { face: lockedFace })}</span>
							{:else if isMyTurn}
								<span class="status--active">{gs.lastPlay === null ? $t('presidents.newTrick') : $t('presidents.yourTurn')}</span>
							{:else}
								<span class="status--wait">{$t('common.waitingFor', { name: playerName(gs.turnPlayerId) })}</span>
							{/if}
						</div>
					{/if}
				</div>
			{/snippet}

			<!-- Exchange context banner -->
			{#if isExchanging}
				<div class="exchange-banner {isExchangeGiver ? 'exchange-banner--giver' : ''}">
					<span class="exchange-banner-msg">
						{#if isExchangeGiver}
							{isVpExchange ? $t('presidents.chooseToGiveVp') : $t('presidents.chooseToGive')}
						{:else}
							{isVpExchange
								? $t('presidents.waitingExchangeVp')
								: $t('presidents.waitingExchange')}
						{/if}
					</span>
				</div>
			{/if}

			<GameLayout {opponents} {opponentTile} {center} />

			<!-- Hand dock -->
			<div class="hand-dock">
				<div class="hand-header">
					<span class="my-name">
						{playerName(me)}<span class="you-tag">&thinsp;({$t('common.you')})</span>
					</span>
					<span class="hand-count">{$t('presidents.cards', { n: myHand.length })}</span>
				</div>

				<div class="hand-scroll">
					{#each myHandSorted as card}
						{@const selected = selectedIds.has(card.id)}
						<button
							onclick={() => toggleCard(card.id)}
							class="card-btn {selected
								? 'card-btn--selected'
								: ''} {canSelectCard ? 'card-btn--selectable' : 'card-btn--inert'}"
							aria-pressed={selected}
							aria-label={$t('card.label', { face: card.face, suit: card.suit ?? '' })}
							disabled={!canSelectCard}
						>
							<PlayingCard {card} size="md" />
						</button>
					{/each}
				</div>

				<!-- Actions -->
				{#if isExchanging && isExchangeGiver}
					<div class="actions-row">
						<button onclick={handleGive} disabled={!giveAction} class="pres-btn pres-btn--play">
							{$t('presidents.giveCards')}
						</button>
					</div>
				{:else if isMyTurn}
					<div class="actions-row">
						<button onclick={handlePlay} disabled={!playAction} class="pres-btn pres-btn--play">
							{$t('presidents.play')}
						</button>
						{#if passAction}
							<button onclick={handlePass} class="pres-btn pres-btn--pass">
								{gs.leaderCanPlay ? $t('presidents.endTrick') : $t('presidents.pass')}
							</button>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Your turn flash -->
<div class="pointer-events-none">
	<GameTitle
		title={$t('presidents.yourTurn')}
		show={showTurnFlash}
		entry="bigEntrance"
		exit="shrink"
		rotation="wobble"
		size="pulse"
		color="gold"
	/>
</div>

<!-- Exchange received flash -->
{#if exchangeFlash !== null}
	<div
		class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
		transition:fade={{ duration: 150 }}
	>
		<div class="flash-box">
			<p class="flash-title">{exchangeFlashTitle}</p>
			<div class="flash-cards">
				{#each exchangeFlash as card}
					<PlayingCard {card} size="md" />
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	/* ── ROOT ─────────────────────────────────────── */
	.pres-root {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		background:
			radial-gradient(ellipse 90% 50% at 50% 15%, oklch(0.18 0.07 35 / 0.45) 0%, transparent 65%),
			oklch(0.10 0.030 20);
		--gold: oklch(0.72 0.14 76);
		--gold-dim: oklch(0.28 0.08 76 / 0.35);
		--gold-warm: oklch(0.56 0.10 76);
		--cream: oklch(0.88 0.015 85);
		--muted: oklch(0.44 0.025 40);
		--felt: oklch(0.17 0.055 160);
		--felt-border: oklch(0.24 0.07 160 / 0.55);
	}

	/* ── HEADER ───────────────────────────────────── */
	.pres-hdr {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: calc(0.5rem + env(safe-area-inset-top)) 0.875rem 0.5rem;
		border-bottom: 1px solid oklch(1 0 0 / 7%);
		background: oklch(0.11 0.025 20 / 0.92);
		backdrop-filter: blur(10px);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.pres-hdr-title {
		font-family: var(--font-display);
		font-size: 1.2rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		color: var(--gold);
		flex-shrink: 0;
	}

	.pres-hdr-turn {
		font-family: var(--font-display);
		font-size: 0.92rem;
		font-style: italic;
		color: var(--muted);
		text-align: center;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.pres-hdr-icons {
		display: flex;
		align-items: center;
		gap: 0.125rem;
		flex-shrink: 0;
	}

	.hdr-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.375rem;
		background: none;
		border: none;
		border-radius: 2px;
		color: oklch(0.38 0.02 40);
		cursor: pointer;
		transition: color 0.15s;
	}
	.hdr-btn:hover {
		color: var(--gold);
	}

	/* ── GAMEOVER ─────────────────────────────────── */
	.gameover-screen {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.75rem;
		padding: 2rem 1.5rem;
	}

	.gameover-heading {
		font-family: var(--font-display);
		font-size: 2.8rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--gold);
		line-height: 1;
	}

	.rank-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
		max-width: 22rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.rank-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.7rem 0.875rem;
		border-radius: 4px;
		border: 1px solid oklch(1 0 0 / 8%);
		background: oklch(0.13 0.025 20);
		transition: border-color 0.2s;
	}

	.rank-item--me {
		border-color: var(--gold-warm);
		background: oklch(0.14 0.045 40);
	}

	.rank-num {
		font-family: var(--font-heading);
		font-size: 0.78rem;
		letter-spacing: 0.04em;
		color: oklch(0.34 0.02 40);
		width: 1.5rem;
		text-align: center;
		flex-shrink: 0;
	}

	.rank-icon {
		display: flex;
		align-items: center;
		color: var(--gold-warm);
		flex-shrink: 0;
	}

	.rank-item:last-child .rank-icon {
		color: oklch(0.40 0 0);
	}

	.rank-name {
		font-family: var(--font-display);
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--cream);
		flex: 1;
	}

	.rank-item--me .rank-name {
		color: var(--gold);
	}

	.rank-role {
		font-family: var(--font-heading);
		font-size: 0.68rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: oklch(0.38 0.03 40);
		flex-shrink: 0;
	}

	/* ── BODY ─────────────────────────────────────── */
	.pres-body {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	/* ── OPPONENTS ───────────────────────────────── */
	.opp-tile {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.5rem 0.625rem;
		border-radius: 4px;
		border: 1px solid oklch(1 0 0 / 7%);
		border-top: 2px solid transparent;
		background: oklch(0.13 0.020 20);
		transition:
			border-top-color 0.3s,
			background 0.3s,
			opacity 0.3s;
	}

	.opp-tile--active {
		border-top-color: var(--gold);
		background: oklch(0.15 0.04 35);
	}

	.opp-tile--done {
		opacity: 0.35;
		filter: grayscale(0.55);
	}

	.opp-name {
		font-family: var(--font-display);
		font-size: 0.97rem;
		font-weight: 600;
		color: var(--cream);
		white-space: nowrap;
	}

	.opp-tile--active .opp-name {
		color: var(--gold);
	}

	.opp-cards {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.opp-more {
		font-family: var(--font-heading);
		font-size: 0.68rem;
		color: oklch(0.40 0 0);
		margin-left: 2px;
	}

	.opp-empty {
		font-size: 0.68rem;
		color: oklch(0.30 0 0);
	}

	.opp-done {
		font-family: var(--font-heading);
		font-size: 0.62rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--gold-warm);
	}

	/* ── EXCHANGE BANNER ──────────────────────────── */
	.exchange-banner {
		padding: 0.625rem 1rem;
		border-bottom: 1px solid oklch(1 0 0 / 7%);
		background: oklch(0.12 0.020 20);
		text-align: center;
	}

	.exchange-banner-msg {
		font-family: var(--font-display);
		font-size: 1rem;
		font-style: italic;
		color: var(--muted);
	}

	.exchange-banner--giver .exchange-banner-msg {
		color: var(--gold);
		font-style: normal;
		font-weight: 600;
	}

	/* ── TABLE AREA ───────────────────────────────── */
	.table-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.875rem;
		padding: 1.5rem 1rem;
		position: relative;
	}

	.table-area::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse 70% 65% at 50% 45%,
			oklch(0.18 0.06 160 / 0.22) 0%,
			transparent 72%
		);
		pointer-events: none;
	}

	.pile-area {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		position: relative;
		z-index: 1;
	}

	.pile-label {
		font-family: var(--font-heading);
		font-size: 0.68rem;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: oklch(0.32 0.04 40);
	}

	.pile-cards {
		display: flex;
		gap: 0.375rem;
		align-items: center;
	}

	/* subtle gold glow on cards in pile */
	.pile-cards :global(img) {
		box-shadow: 0 4px 18px oklch(0 0 0 / 0.55), 0 0 20px var(--gold-dim);
	}

	.pile-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.combo-label {
		font-family: var(--font-heading);
		font-size: 0.70rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: oklch(0.55 0.04 85);
	}

	.lock-badge {
		font-family: var(--font-heading);
		font-size: 0.70rem;
		letter-spacing: 0.10em;
		color: var(--gold);
		background: oklch(0.20 0.06 76 / 0.35);
		border: 1px solid var(--gold-dim);
		padding: 0.1rem 0.4rem;
		border-radius: 2px;
	}

	.pile-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 88px;
		height: 122px;
		border-radius: 8px;
		border: 2px dashed var(--felt-border);
		background: oklch(0.14 0.04 160 / 0.3);
	}

	.pile-empty-text {
		font-family: var(--font-heading);
		font-size: 0.66rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: oklch(0.30 0.04 160);
	}

	/* ── STATUS LINE ──────────────────────────────── */
	.status-line {
		text-align: center;
		min-height: 1.6rem;
		position: relative;
		z-index: 1;
	}

	.status--active {
		font-family: var(--font-display);
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--gold);
	}

	.status--wait {
		font-family: var(--font-display);
		font-size: 1rem;
		font-style: italic;
		color: var(--muted);
	}

	/* ── HAND DOCK ────────────────────────────────── */
	.hand-dock {
		border-top: 1px solid oklch(1 0 0 / 8%);
		background: oklch(0.11 0.022 20 / 0.92);
		padding: 0.875rem 0.75rem;
		padding-bottom: calc(0.875rem + env(safe-area-inset-bottom));
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.hand-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.my-name {
		font-family: var(--font-display);
		font-size: 1.08rem;
		font-weight: 600;
		color: var(--cream);
	}

	.you-tag {
		font-family: var(--font-sans);
		font-size: 0.72rem;
		font-weight: 400;
		font-style: normal;
		color: oklch(0.38 0 0);
	}

	.hand-count {
		font-family: var(--font-heading);
		font-size: 0.70rem;
		letter-spacing: 0.10em;
		color: oklch(0.38 0.025 40);
	}

	.hand-scroll {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.375rem;
	}

	.card-btn {
		background: none;
		border: none;
		padding: 0;
		border-radius: 8px;
		transition:
			transform 0.15s ease,
			box-shadow 0.15s ease;
	}

	.card-btn--selectable:hover {
		transform: translateY(-4px);
	}

	.card-btn--selected {
		transform: translateY(-10px);
		box-shadow:
			0 0 0 2px var(--gold),
			0 6px 18px oklch(0 0 0 / 0.5);
	}

	.card-btn--inert {
		cursor: default;
		opacity: 0.35;
	}

	/* ── ACTIONS ──────────────────────────────────── */
	.actions-row {
		display: flex;
		justify-content: center;
		gap: 0.625rem;
	}

	.pres-btn {
		font-family: var(--font-heading);
		font-size: 1rem;
		letter-spacing: 0.20em;
		text-transform: uppercase;
		padding: 0.7rem 2rem;
		border-radius: 3px;
		cursor: pointer;
		transition:
			filter 0.15s,
			transform 0.1s;
	}

	.pres-btn:active {
		transform: scale(0.97);
	}

	.pres-btn:disabled {
		opacity: 0.28;
		cursor: default;
	}

	.pres-btn--play {
		background: linear-gradient(135deg, oklch(0.58 0.13 70), oklch(0.68 0.16 78));
		color: oklch(0.10 0 0);
		border: 1px solid oklch(0.75 0.16 80 / 0.45);
		box-shadow: 0 2px 14px oklch(0.65 0.14 76 / 0.25);
	}

	.pres-btn--play:not(:disabled):hover {
		filter: brightness(1.14);
	}

	.pres-btn--pass {
		background: transparent;
		color: oklch(0.50 0.025 40);
		border: 1px solid oklch(1 0 0 / 11%);
	}

	.pres-btn--pass:hover {
		color: oklch(0.72 0.02 40);
		border-color: oklch(1 0 0 / 20%);
	}

	/* ── EXCHANGE FLASH ───────────────────────────── */
	.flash-box {
		border-radius: 6px;
		border: 1px solid var(--gold-dim);
		background: oklch(0.13 0.03 30);
		padding: 1.5rem 2rem;
		text-align: center;
		box-shadow:
			0 10px 52px oklch(0 0 0 / 0.88),
			0 0 48px var(--gold-dim);
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: center;
	}

	.flash-title {
		font-family: var(--font-display);
		font-size: 1.1rem;
		font-style: italic;
		color: var(--gold);
		letter-spacing: 0.04em;
	}

	.flash-cards {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
