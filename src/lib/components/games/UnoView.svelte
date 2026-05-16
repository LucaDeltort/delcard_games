<script lang="ts">
import { Settings as SettingsIcon } from 'lucide-svelte'
import { fade, fly, scale } from 'svelte/transition'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
import { Button } from '$lib/components/ui/button'
import type { Card, GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'
import type { UnoColor } from '$lib/games/uno'
import { t } from '$lib/i18n'
import type { LobbyPlayer } from '$lib/network/messages'
import { deckPacks, resolvePackFor } from '$lib/stores/deckPacks'
import { settingsOpen } from '$lib/stores/settings'

const DRAW_STAGGER_MS = 250
const DRAW_DURATION_MS = 350

type UnoState = GameStateGeneric & {
	direction: 1 | -1
	currentColor: UnoColor
	drewCardId: string | null
	pendingDraw: number
	pendingChallenge: { by: string; hadBluff: boolean } | null
}

let {
	state: rawState,
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

const gs = $derived(rawState as UnoState)
const pack = $derived(resolvePackFor($deckPacks, 'uno-deck'))

function cardSrc(card: Card, showBack = false): string {
	const ext = pack.ext ?? '.png'
	if (showBack || card.isHidden) return `${pack.basePath}/card_back${ext}`
	if (!card.suit) return `${pack.basePath}/card_${card.face.toLowerCase()}${ext}`
	return `${pack.basePath}/card_${card.suit}_${card.face.toLowerCase()}${ext}`
}

function playerName(id: string): string {
	return players.find((p) => p.id === id)?.name ?? id
}

const myHand = $derived(gs.zones[`hand_${myPlayerId}`]?.cards ?? [])
const discard = $derived(gs.zones['discard']?.cards ?? [])
const discardTop = $derived(discard[discard.length - 1] ?? null)
const drawCount = $derived(gs.zones['draw']?.cards.length ?? 0)

const playableCardIds = $derived(
	new Set(
		validActions
			.filter((a) => a.type === 'PLAY_CARD')
			.map((a) => (a.payload as { cardId: string }).cardId)
	)
)
const canDraw = $derived(validActions.some((a) => a.type === 'DRAW_CARD'))
const isMyTurn = $derived(validActions.length > 0)
const drawAction = $derived(validActions.find((a) => a.type === 'DRAW_CARD') ?? null)
const canEndTurn = $derived(validActions.some((a) => a.type === 'END_TURN'))
const acceptAction = $derived(validActions.find((a) => a.type === 'ACCEPT_PENALTY') ?? null)
const challengeAction = $derived(validActions.find((a) => a.type === 'CHALLENGE_DRAW_FOUR') ?? null)
const showChallengeOverlay = $derived(acceptAction !== null || challengeAction !== null)

const opponents = $derived(gs.players.filter((p) => p !== myPlayerId))
const mustDraw = $derived(isMyTurn && canDraw && playableCardIds.size === 0 && gs.pendingDraw === 0)

const COLOR_CLASSES: Record<UnoColor, string> = {
	red: 'bg-red-500',
	yellow: 'bg-yellow-400',
	green: 'bg-green-500',
	blue: 'bg-blue-500'
}

const COLOR_LABELS: Record<UnoColor, string> = {
	red: 'Red',
	yellow: 'Yellow',
	green: 'Green',
	blue: 'Blue'
}

const UNO_COLORS: UnoColor[] = ['red', 'yellow', 'green', 'blue']

let pendingCardId = $state<string | null>(null)

const drawDelays = new Map<string, number>()
const prevHandIds = new Set<string>()

$effect.pre(() => {
	const currentIds = myHand.map((c) => c.id)
	if (prevHandIds.size > 0) {
		const newIds = currentIds.filter((id) => !prevHandIds.has(id))
		newIds.forEach((id, i) => drawDelays.set(id, i * DRAW_STAGGER_MS))
	}
	prevHandIds.clear()
	currentIds.forEach((id) => prevHandIds.add(id))
})

// Animation 2 — your turn flash
let showTurnFlash = $state(false)
// Animation 4 — action banner
let actionBanner = $state<string | null>(null)
// Animation 6 — opponent draw bounce
let bouncingOpponents = $state<Set<string>>(new Set())

// Plain (non-reactive) prev-state trackers — same pattern as drawDelays/prevHandIds
let _prevTurnPlayerId = gs.turnPlayerId
let _prevDiscardTopId: string | null = discardTop?.id ?? null
const _prevOpponentHandSizes = new Map<string, number>()

const ACTION_KEYS: Partial<Record<string, string>> = {
	Skip: 'uno.actionSkip',
	Reverse: 'uno.actionReverse',
	DrawTwo: 'uno.actionDrawTwo',
	Wild: 'uno.actionWild',
	WildDrawFour: 'uno.actionWildDrawFour'
}

const ACTION_KEYS_OTHER: Partial<Record<string, string>> = {
	Skip: 'uno.actionSkipOther',
	Reverse: 'uno.actionReverseOther',
	DrawTwo: 'uno.actionDrawTwoOther',
	Wild: 'uno.actionWildOther',
	WildDrawFour: 'uno.actionWildDrawFourOther'
}

$effect(() => {
	// Capture before any updates — identifies who just played
	const whoJustPlayed = _prevTurnPlayerId

	// Animation 2: your turn flash
	if (gs.turnPlayerId !== _prevTurnPlayerId) {
		if (gs.turnPlayerId === myPlayerId) {
			showTurnFlash = true
			setTimeout(() => (showTurnFlash = false), 1500)
		}
		_prevTurnPlayerId = gs.turnPlayerId
	}

	// Animation 4: action banner
	const topId = discardTop?.id ?? null
	if (topId !== _prevDiscardTopId && discardTop) {
		const keys = whoJustPlayed === myPlayerId ? ACTION_KEYS : ACTION_KEYS_OTHER
		const label = keys[discardTop.face] ?? null
		if (label) {
			actionBanner = label
			setTimeout(() => (actionBanner = null), 1800)
		}
		_prevDiscardTopId = topId
	}

	// Animation 6: opponent draw bounce
	for (const pid of opponents) {
		const size = gs.zones[`hand_${pid}`]?.cards.length ?? 0
		const prev = _prevOpponentHandSizes.get(pid)
		if (prev !== undefined && size > prev) {
			bouncingOpponents = new Set([...bouncingOpponents, pid])
			setTimeout(() => {
				bouncingOpponents = new Set([...bouncingOpponents].filter((p) => p !== pid))
			}, 700)
		}
		_prevOpponentHandSizes.set(pid, size)
	}
})

function handleCardClick(card: Card) {
	if (!playableCardIds.has(card.id)) return
	if (card.face === 'Wild' || card.face === 'WildDrawFour') {
		pendingCardId = card.id
	} else {
		onAction({ type: 'PLAY_CARD', playerId: myPlayerId, payload: { cardId: card.id } })
	}
}

function handleColorPick(color: UnoColor) {
	if (!pendingCardId) return
	onAction({
		type: 'PLAY_CARD',
		playerId: myPlayerId,
		payload: { cardId: pendingCardId, chosenColor: color }
	})
	pendingCardId = null
}
</script>

<div class="flex min-h-dvh flex-col bg-background">

	<!-- Header -->
	<header class="flex items-center justify-between border-b border-border bg-card px-4 py-2 text-sm">
		<div class="flex items-center gap-2">
			<div class="h-3 w-3 rounded-full {COLOR_CLASSES[gs.currentColor]} ring-2 ring-border"></div>
			{#key gs.direction}
			<span in:scale={{ duration: 400, start: 0.4 }} class="text-xs text-muted-foreground">
				{gs.direction === 1 ? '↻' : '↺'}
			</span>
		{/key}
		</div>
		<span class="font-medium">
			{isMyTurn
				? $t('uno.yourTurn')
				: $t('common.turnOf', { name: playerName(gs.turnPlayerId) })}
		</span>
		<button
			onclick={() => ($settingsOpen = true)}
			class="text-muted-foreground transition-colors hover:text-foreground"
			aria-label="Settings"
		>
			<SettingsIcon size={16} />
		</button>
	</header>

	<!-- Opponents -->
	<div class="flex flex-wrap justify-center gap-4 border-b border-border bg-card/50 px-4 py-3">
		{#each opponents as pid}
			{@const hand = gs.zones[`hand_${pid}`]?.cards ?? []}
			<div class="flex flex-col items-center gap-1">
				<span class="text-xs font-medium {gs.turnPlayerId === pid ? 'text-foreground' : 'text-muted-foreground'}">
					{playerName(pid)}
					{#if gs.turnPlayerId === pid}<span class="ml-1">▶</span>{/if}
				</span>
				<div class="flex items-center gap-1 {bouncingOpponents.has(pid) ? 'animate-bounce' : ''}">
					{#each hand.slice(0, 5) as card (card.id)}
						<img
							src={cardSrc(card, true)}
							alt="hidden card"
							class="h-12 w-8 rounded-md object-contain shadow-sm"
							draggable="false"
						/>
					{/each}
					{#if hand.length > 5}
						<span class="ml-1 text-xs text-muted-foreground">+{hand.length - 5}</span>
					{/if}
					{#if hand.length === 0}
						<span class="text-xs text-muted-foreground">{$t('game.empty')}</span>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Game area: draw · color · discard -->
	<div class="flex flex-1 items-center justify-center gap-6 px-4 py-6">

		<!-- Draw pile -->
		<div class="flex flex-col items-center gap-1">
			<button
				onclick={() => canDraw && drawAction && onAction(drawAction)}
				disabled={!canDraw}
				class="rounded-lg transition-all {canDraw ? 'cursor-pointer opacity-100 hover:opacity-80' : 'cursor-default opacity-50'} {gs.pendingDraw > 0 ? 'animate-pulse ring-2 ring-yellow-400' : mustDraw ? 'animate-pulse ring-2 ring-primary' : ''}"
				aria-label={$t('uno.draw')}
			>
				{#if drawCount > 0}
					<img
						src={cardSrc({ id: '', face: 'back', isHidden: false }, true)}
						alt="draw pile"
						class="h-20 w-14 rounded-lg object-contain shadow-md sm:h-24 sm:w-16"
						draggable="false"
					/>
				{:else}
					<div class="h-20 w-14 rounded-lg border-2 border-dashed border-border bg-secondary/30 sm:h-24 sm:w-16"></div>
				{/if}
			</button>
			<span class="text-xs text-muted-foreground">{$t('uno.draw')} ({drawCount})</span>
			{#if gs.pendingDraw > 0}
				<span class="text-xs font-bold text-yellow-500">+{gs.pendingDraw}</span>
			{/if}
		</div>

		<!-- Current color indicator -->
		<div class="flex flex-col items-center gap-1">
			<div class="h-8 w-8 rounded-full {COLOR_CLASSES[gs.currentColor]} shadow-md ring-2 ring-border"></div>
			<span class="text-xs capitalize text-muted-foreground">{gs.currentColor}</span>
		</div>

		<!-- Discard pile -->
		<div class="flex flex-col items-center gap-1">
			{#key discardTop?.id}
				{#if discardTop}
					<img
						in:fly={{ y: -20, duration: 280 }}
						src={cardSrc(discardTop)}
						alt="{discardTop.face}{discardTop.suit ? ' ' + discardTop.suit : ''}"
						class="h-20 w-14 rounded-lg object-contain shadow-md sm:h-24 sm:w-16"
						draggable="false"
					/>
				{:else}
					<div class="h-20 w-14 rounded-lg border-2 border-dashed border-border bg-secondary/30 sm:h-24 sm:w-16"></div>
				{/if}
			{/key}
			<span class="text-xs text-muted-foreground">{discard.length}</span>
		</div>
	</div>

	<!-- My hand -->
	<div class="border-t border-border bg-card px-4 py-4">
		<div class="flex flex-wrap justify-center gap-2">
			{#each myHand as card (card.id)}
				{@const playable = playableCardIds.has(card.id)}
				{@const isDrawn = card.id === gs.drewCardId}
				<button
					in:fly={{
						y: -160,
						duration: DRAW_DURATION_MS,
						delay: drawDelays.get(card.id) ?? 0
					}}
					onclick={() => handleCardClick(card)}
					disabled={!playable}
					class="rounded-lg transition-all
						{playable && !isDrawn
							? 'cursor-pointer ring-2 ring-primary hover:-translate-y-1'
							: playable && isDrawn
								? 'cursor-pointer ring-2 ring-yellow-400 hover:-translate-y-1'
								: 'cursor-default opacity-40'}"
					aria-label="{card.face}{card.suit ? ' ' + card.suit : ''}"
				>
					<img
						src={cardSrc(card)}
						alt="{card.face}{card.suit ? ' ' + card.suit : ''}"
						class="h-16 w-11 rounded-lg object-contain shadow-md sm:h-20 sm:w-14"
						draggable="false"
					/>
				</button>
			{/each}
		</div>
		{#if canEndTurn}
			<div class="mt-3 flex justify-center">
				<button
					onclick={() => onAction({ type: 'END_TURN', playerId: myPlayerId })}
					class="rounded-full bg-secondary px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
				>
					{$t('uno.endTurn')}
				</button>
			</div>
		{/if}
	</div>

	<RulesDrawer gameId="uno" />
</div>

<!-- Action banner (Skip!, Reverse!, +2, +4, Color change) -->
{#if actionBanner}
	<div
		transition:fly={{ y: 30, duration: 300 }}
		class="pointer-events-none fixed inset-x-0 bottom-36 z-40 flex justify-center"
	>
		<div class="rounded-full bg-foreground px-8 py-3 text-xl font-bold text-background shadow-2xl">
			{$t(actionBanner)}
		</div>
	</div>
{/if}

<!-- Your turn flash -->
{#if showTurnFlash}
	<div
		transition:fade={{ duration: 200 }}
		class="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
	>
		<div class="animate-bounce rounded-2xl bg-primary px-8 py-4 text-2xl font-bold text-primary-foreground shadow-2xl">
			{$t('uno.yourTurn')}
		</div>
	</div>
{/if}

<!-- Challenge +4 overlay -->
{#if showChallengeOverlay}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
		role="dialog"
		aria-modal="true"
	>
		<div class="flex flex-col items-center gap-4 rounded-2xl bg-card p-6 shadow-2xl">
			<p class="text-sm font-medium text-foreground">{$t('uno.challenge')}</p>
			<div class="flex gap-3">
				{#if acceptAction}
					<button
						onclick={() => onAction(acceptAction)}
						class="rounded-xl bg-secondary px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
					>
						{$t('uno.acceptPenalty')}
					</button>
				{/if}
				{#if challengeAction}
					<button
						onclick={() => onAction(challengeAction)}
						class="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
					>
						{$t('uno.challenge')}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Color picker overlay -->
{#if pendingCardId}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
		role="dialog"
		aria-modal="true"
		aria-label={$t('uno.chooseColor')}
	>
		<div class="flex flex-col items-center gap-4 rounded-2xl bg-card p-6 shadow-2xl">
			<p class="text-sm font-medium text-foreground">{$t('uno.chooseColor')}</p>
			<div class="grid grid-cols-2 gap-3">
				{#each UNO_COLORS as color}
					<button
						onclick={() => handleColorPick(color)}
						class="h-14 w-24 rounded-xl {COLOR_CLASSES[color]} font-bold text-white shadow-md transition-transform hover:scale-105 active:scale-95"
					>
						{COLOR_LABELS[color]}
					</button>
				{/each}
			</div>
			<button
				onclick={() => (pendingCardId = null)}
				class="text-xs text-muted-foreground hover:text-foreground"
			>
				{$t('common.cancel')}
			</button>
		</div>
	</div>
{/if}
