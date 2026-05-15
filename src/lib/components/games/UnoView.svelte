<script lang="ts">
import { Settings as SettingsIcon } from 'lucide-svelte'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
import { Button } from '$lib/components/ui/button'
import type { Card, GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'
import type { UnoColor } from '$lib/games/uno'
import { t } from '$lib/i18n'
import type { LobbyPlayer } from '$lib/network/messages'
import { deckPacks, resolvePackFor } from '$lib/stores/deckPacks'
import { settingsOpen } from '$lib/stores/settings'

type UnoState = GameStateGeneric & {
	direction: 1 | -1
	currentColor: UnoColor
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

const opponents = $derived(gs.players.filter((p) => p !== myPlayerId))

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
			<span class="text-xs text-muted-foreground">{gs.direction === 1 ? '↻' : '↺'}</span>
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
				<div class="flex items-center gap-1">
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
				class="rounded-lg transition-opacity {canDraw ? 'cursor-pointer opacity-100 hover:opacity-80' : 'cursor-default opacity-50'}"
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
		</div>

		<!-- Current color indicator -->
		<div class="flex flex-col items-center gap-1">
			<div class="h-8 w-8 rounded-full {COLOR_CLASSES[gs.currentColor]} shadow-md ring-2 ring-border"></div>
			<span class="text-xs capitalize text-muted-foreground">{gs.currentColor}</span>
		</div>

		<!-- Discard pile -->
		<div class="flex flex-col items-center gap-1">
			{#if discardTop}
				<img
					src={cardSrc(discardTop)}
					alt="{discardTop.face}{discardTop.suit ? ' ' + discardTop.suit : ''}"
					class="h-20 w-14 rounded-lg object-contain shadow-md sm:h-24 sm:w-16"
					draggable="false"
				/>
			{:else}
				<div class="h-20 w-14 rounded-lg border-2 border-dashed border-border bg-secondary/30 sm:h-24 sm:w-16"></div>
			{/if}
			<span class="text-xs text-muted-foreground">{discard.length}</span>
		</div>
	</div>

	<!-- My hand -->
	<div class="border-t border-border bg-card px-4 py-4">
		<div class="flex flex-wrap justify-center gap-2">
			{#each myHand as card (card.id)}
				{@const playable = playableCardIds.has(card.id)}
				<button
					onclick={() => handleCardClick(card)}
					disabled={!playable}
					class="rounded-lg transition-all
						{playable
							? 'cursor-pointer ring-2 ring-primary hover:-translate-y-1'
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
	</div>

	<RulesDrawer gameId="uno" />
</div>

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
