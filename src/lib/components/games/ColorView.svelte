<script lang="ts">
import { RotateCcw, RotateCw, Settings as SettingsIcon } from 'lucide-svelte'
import { cubicOut } from 'svelte/easing'
import { fade, fly, scale } from 'svelte/transition'
import type {
	ColorProp,
	EntryAnim,
	ExitAnim,
	RotAnim,
	SizeAnim
} from '$lib/components/GameTitle.svelte'
import GameTitle from '$lib/components/GameTitle.svelte'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
import { Button } from '$lib/components/ui/button'
import type { Card, GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'
import type { CardColor } from '$lib/games/color/color'
import { t } from '$lib/i18n'
import type { LobbyPlayer } from '$lib/network/messages'
import { deckPacks, resolvePackFor } from '$lib/stores/deckPacks'
import { settingsOpen } from '$lib/stores/settings'

const DRAW_STAGGER_MS = 250
const DRAW_DURATION_MS = 350

type ColorState = GameStateGeneric & {
	direction: 1 | -1
	currentColor: CardColor
	drewCardId: string | null
	pendingDraw: number
	pendingChallenge: { by: string; hadBluff: boolean } | null
	soloAlert: { playerId: string; x: number; y: number } | null
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

const gs = $derived(rawState as ColorState)
const pack = $derived(resolvePackFor($deckPacks, 'color-deck'))

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
const callSoloAction = $derived(validActions.find((a) => a.type === 'CALL_SOLO') ?? null)
const counterSoloAction = $derived(validActions.find((a) => a.type === 'COUNTER_SOLO') ?? null)
const soloButtonAction = $derived(callSoloAction ?? counterSoloAction)

const opponents = $derived(gs.players.filter((p) => p !== myPlayerId))
const mustDraw = $derived(isMyTurn && canDraw && playableCardIds.size === 0 && gs.pendingDraw === 0)

const COLOR_CLASSES: Record<CardColor, string> = {
	red: 'bg-red-500',
	yellow: 'bg-yellow-400',
	green: 'bg-green-500',
	blue: 'bg-blue-500'
}

const COLOR_LABELS: Record<CardColor, string> = {
	red: 'Red',
	yellow: 'Yellow',
	green: 'Green',
	blue: 'Blue'
}

const CARD_COLORS: CardColor[] = ['red', 'yellow', 'green', 'blue']

let pendingCardId = $state<string | null>(null)
let opponentPlayCard = $state<string | null>(null)

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
let _bannerTimer: ReturnType<typeof setTimeout> | null = null
let _prevTurnPlayerId = ''
let _prevDiscardTopId: string | null = null
let _hasPrevSnapshot = false
const _prevOpponentHandSizes = new Map<string, number>()
let _prevSoloAlert: { playerId: string; x: number; y: number } | null = null
let _prevSoloPlayerHandSize = 0

const ACTION_KEYS: Partial<Record<string, string>> = {
	Skip: 'color.actionSkip',
	Reverse: 'color.actionReverse',
	DrawTwo: 'color.actionDrawTwo',
	Wild: 'color.actionWild',
	WildDrawFour: 'color.actionWildDrawFour'
}

const ACTION_KEYS_OTHER: Partial<Record<string, string>> = {
	Skip: 'color.actionSkipOther',
	Reverse: 'color.actionReverseOther',
	DrawTwo: 'color.actionDrawTwoOther',
	Wild: 'color.actionWildOther',
	WildDrawFour: 'color.actionWildDrawFourOther'
}

const CARD_COLOR_TO_PROP: Record<CardColor, ColorProp> = {
	red: 'neon-red',
	yellow: 'neon-yellow',
	green: 'neon-green',
	blue: 'neon-blue'
}

type BannerStyle = {
	entry: EntryAnim
	exit: ExitAnim
	rotation: RotAnim
	size: SizeAnim
	color: ColorProp | null
}
const BANNER_STYLES: Record<string, BannerStyle> = {
	'color.actionSkip': {
		entry: 'rollIn',
		exit: 'fadeOut',
		rotation: 'none',
		size: 'none',
		color: null
	},
	'color.actionSkipOther': {
		entry: 'rollIn',
		exit: 'fadeOut',
		rotation: 'none',
		size: 'none',
		color: null
	},
	'color.actionReverse': {
		entry: 'flipDown',
		exit: 'shrink',
		rotation: 'none',
		size: 'none',
		color: null
	},
	'color.actionReverseOther': {
		entry: 'flipDown',
		exit: 'shrink',
		rotation: 'none',
		size: 'none',
		color: null
	},
	'color.actionDrawTwo': {
		entry: 'slideDown',
		exit: 'explode',
		rotation: 'wobble',
		size: 'breathe',
		color: null
	},
	'color.actionDrawTwoOther': {
		entry: 'slideDown',
		exit: 'explode',
		rotation: 'wobble',
		size: 'breathe',
		color: null
	},
	'color.actionWild': {
		entry: 'fadeScale',
		exit: 'fadeOut',
		rotation: 'sway',
		size: 'pulse',
		color: 'rainbow'
	},
	'color.actionWildOther': {
		entry: 'fadeScale',
		exit: 'fadeOut',
		rotation: 'sway',
		size: 'pulse',
		color: 'rainbow'
	},
	'color.actionWildDrawFour': {
		entry: 'bigEntrance',
		exit: 'explode',
		rotation: 'wobble',
		size: 'pulse',
		color: 'gold'
	},
	'color.actionWildDrawFourOther': {
		entry: 'bigEntrance',
		exit: 'explode',
		rotation: 'wobble',
		size: 'pulse',
		color: 'gold'
	},
	'color.soloSaved': {
		entry: 'bigEntrance',
		exit: 'explode',
		rotation: 'wobble',
		size: 'pulse',
		color: 'neon-green'
	},
	'color.soloTooSlow': {
		entry: 'glitch',
		exit: 'blur',
		rotation: 'none',
		size: 'none',
		color: 'neon-red'
	}
}

const DRAW_SELF_KEYS = new Set(['color.actionDrawTwo', 'color.actionWildDrawFour'])
const DRAW_OTHER_KEYS = new Set(['color.actionDrawTwoOther', 'color.actionWildDrawFourOther'])

const bannerTitle = $derived(
	actionBanner
		? DRAW_SELF_KEYS.has(actionBanner)
			? `+${gs.pendingDraw}`
			: DRAW_OTHER_KEYS.has(actionBanner)
				? $t('color.actionDrawAcc', { count: gs.pendingDraw })
				: $t(actionBanner)
		: ''
)

const bannerProps = $derived(
	actionBanner
		? {
				...(BANNER_STYLES[actionBanner] ?? {
					entry: 'slideDown' as EntryAnim,
					exit: 'fadeOut' as ExitAnim,
					rotation: 'none' as RotAnim,
					size: 'none' as SizeAnim,
					color: null
				}),
				color: (BANNER_STYLES[actionBanner]?.color ??
					CARD_COLOR_TO_PROP[gs.currentColor]) as ColorProp
			}
		: null
)

$effect(() => {
	if (!_hasPrevSnapshot) {
		_prevTurnPlayerId = gs.turnPlayerId
		_prevDiscardTopId = discardTop?.id ?? null
		for (const pid of opponents) {
			_prevOpponentHandSizes.set(pid, gs.zones[`hand_${pid}`]?.cards.length ?? 0)
		}
		_hasPrevSnapshot = true
		return
	}

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
			if (_bannerTimer !== null) clearTimeout(_bannerTimer)
			actionBanner = label
			_bannerTimer = setTimeout(() => {
				actionBanner = null
				_bannerTimer = null
			}, 1800)
		}
		if (whoJustPlayed !== myPlayerId) {
			opponentPlayCard = cardSrc(discardTop)
			setTimeout(() => (opponentPlayCard = null), 700)
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

	// Solo flash: detect soloAlert → null transition
	const currentSolo = gs.soloAlert
	if (_prevSoloAlert && !currentSolo && gs.phase === 'playing') {
		const currentHandSize = gs.zones[`hand_${_prevSoloAlert.playerId}`]?.cards.length ?? 0
		const wasCountered = currentHandSize > _prevSoloPlayerHandSize
		if (_bannerTimer !== null) clearTimeout(_bannerTimer)
		actionBanner = wasCountered ? 'color.soloTooSlow' : 'color.soloSaved'
		_bannerTimer = setTimeout(() => {
			actionBanner = null
			_bannerTimer = null
		}, 1800)
	}
	if (currentSolo && !_prevSoloAlert) {
		_prevSoloPlayerHandSize = gs.zones[`hand_${currentSolo.playerId}`]?.cards.length ?? 0
	}
	_prevSoloAlert = currentSolo
})

function handleCardClick(card: Card) {
	if (!playableCardIds.has(card.id)) return
	if (card.face === 'Wild' || card.face === 'WildDrawFour') {
		pendingCardId = card.id
	} else {
		onAction({ type: 'PLAY_CARD', playerId: myPlayerId, payload: { cardId: card.id } })
	}
}

function handleColorPick(color: CardColor) {
	if (!pendingCardId) return
	onAction({
		type: 'PLAY_CARD',
		playerId: myPlayerId,
		payload: { cardId: pendingCardId, chosenColor: color }
	})
	pendingCardId = null
}

const GAME_COLOR: Record<CardColor, string> = {
	red: 'oklch(0.65 0.24 25)',
	yellow: 'oklch(0.80 0.18 80)',
	green: 'oklch(0.70 0.22 145)',
	blue: 'oklch(0.65 0.22 255)'
}

const GAME_COLOR_DIM: Record<CardColor, string> = {
	red: 'oklch(0.30 0.12 25 / 0.35)',
	yellow: 'oklch(0.45 0.14 80 / 0.30)',
	green: 'oklch(0.32 0.12 145 / 0.30)',
	blue: 'oklch(0.30 0.12 255 / 0.30)'
}
</script>

<div
	class="color-root"
	style="--gc: {GAME_COLOR[gs.currentColor]}; --gc-dim: {GAME_COLOR_DIM[gs.currentColor]}"
>

	<!-- Header -->
	<header class="color-header">
		<div class="hdr-left">
			{#key gs.direction}
				<span class="dir-icon" in:scale={{ duration: 380, start: 0.3 }}>
					{#if gs.direction === 1}<RotateCw size={15} />{:else}<RotateCcw size={15} />{/if}
				</span>
			{/key}
		</div>
		<span class="hdr-turn">
			{isMyTurn ? $t('color.yourTurn') : $t('common.turnOf', { name: playerName(gs.turnPlayerId) })}
		</span>
		<div class="hdr-right">
			<RulesDrawer gameId="color" size={15} />
			<button onclick={() => ($settingsOpen = true)} class="hdr-btn" aria-label="Settings">
				<SettingsIcon size={15} />
			</button>
		</div>
	</header>

	<!-- Opponents -->
	<div class="opp-strip">
		{#each opponents as pid}
			{@const hand = gs.zones[`hand_${pid}`]?.cards ?? []}
			{@const isActive = gs.turnPlayerId === pid}
			<div class="opp-tile {isActive ? 'opp-tile--active' : ''} {bouncingOpponents.has(pid) ? 'opp-tile--bounce' : ''}">
				<span class="opp-name">
					{playerName(pid)}{#if isActive}&thinsp;▶{/if}
				</span>
				<div class="opp-cards">
					{#each hand.slice(0, 7) as card (card.id)}
						<img src={cardSrc(card, true)} alt="hidden" class="opp-card-img" draggable="false" />
					{/each}
					{#if hand.length > 7}
						<span class="opp-overflow">+{hand.length - 7}</span>
					{/if}
					{#if hand.length === 0}
						<span class="opp-empty">{$t('game.empty')}</span>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Arena: draw · orb · discard -->
	<div class="arena">

		<!-- Draw pile -->
		<div class="arena-pile">
			<button
				onclick={() => canDraw && drawAction && onAction(drawAction)}
				disabled={!canDraw}
				class="pile-btn {canDraw ? 'pile-btn--active' : ''} {gs.pendingDraw > 0 ? 'pile-btn--pending' : mustDraw ? 'pile-btn--must' : ''}"
				aria-label={$t('color.draw')}
			>
				{#if drawCount > 0}
					<img
						src={cardSrc({ id: '', face: 'back', isHidden: false }, true)}
						alt="draw pile"
						class="pile-img"
						draggable="false"
					/>
				{:else}
					<div class="pile-empty"></div>
				{/if}
			</button>
			<span class="pile-label">{$t('color.draw')} ({drawCount})</span>
			{#if gs.pendingDraw > 0}
				<span class="pile-pending">+{gs.pendingDraw}</span>
			{/if}
		</div>

		<!-- Color orb -->
		<div class="color-orb">
			<div class="color-orb-inner"></div>
		</div>

		<!-- Discard pile -->
		<div class="arena-pile">
			{#key discardTop?.id}
				{#if discardTop}
					<img
						in:fly={{ y: -28, duration: 200, easing: cubicOut }}
						src={cardSrc(discardTop)}
						alt="{discardTop.face}{discardTop.suit ? ' ' + discardTop.suit : ''}"
						class="pile-img discard-img"
						draggable="false"
					/>
				{:else}
					<div class="pile-empty"></div>
				{/if}
			{/key}
			<span class="pile-label">{discard.length}</span>
		</div>
	</div>

	<!-- Turn direction -->
	{#key gs.direction}
		<div class="direction-row" in:scale={{ duration: 380, start: 0.3 }}>
			{#if gs.direction === 1}<RotateCw size={22} />{:else}<RotateCcw size={22} />{/if}
		</div>
	{/key}

	<!-- Your turn flash -->
	<div class="pointer-events-none">
		<GameTitle
			title={$t('color.yourTurn')}
			show={showTurnFlash}
			entry="bigEntrance"
			exit="shrink"
			rotation="wobble"
			size="pulse"
			color="default"
		/>
	</div>

	<!-- Hand -->
	<div class="hand-dock">
		<div class="hand-scroll">
			{#each myHand as card (card.id)}
				{@const playable = playableCardIds.has(card.id)}
				{@const isDrawn = card.id === gs.drewCardId}
				<button
					in:fly={{ y: -140, duration: DRAW_DURATION_MS, delay: drawDelays.get(card.id) ?? 0 }}
					onclick={() => handleCardClick(card)}
					disabled={!playable}
					class="card-btn {playable && !isDrawn ? 'card-btn--play' : ''} {playable && isDrawn ? 'card-btn--drawn' : ''} {!playable ? 'card-btn--dead' : ''}"
					aria-label="{card.face}{card.suit ? ' ' + card.suit : ''}"
				>
					<img
						src={cardSrc(card)}
						alt="{card.face}{card.suit ? ' ' + card.suit : ''}"
						class="card-img"
						draggable="false"
					/>
				</button>
			{/each}
		</div>
		{#if canEndTurn}
			<div class="end-turn-row">
				<button
					onclick={() => onAction({ type: 'END_TURN', playerId: myPlayerId })}
					class="end-turn-btn"
				>
					{$t('color.endTurn')}
				</button>
			</div>
		{/if}
	</div>

</div>

<!-- Action banner -->
<div class="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
	{#key actionBanner}
		<GameTitle
			title={bannerTitle}
			show={actionBanner !== null}
			entry={bannerProps?.entry ?? 'slideDown'}
			exit={bannerProps?.exit ?? 'fadeOut'}
			rotation={bannerProps?.rotation ?? 'none'}
			size={bannerProps?.size ?? 'none'}
			color={bannerProps?.color ?? 'default'}
		/>
	{/key}
</div>

<!-- Challenge +4 overlay -->
{#if showChallengeOverlay}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70" role="dialog" aria-modal="true">
		<div class="challenge-box">
			<p class="challenge-label">{$t('color.challenge')}</p>
			<div class="challenge-btns">
				{#if acceptAction}
					<button onclick={() => onAction(acceptAction)} class="ch-btn ch-btn--accept">
						{$t('color.acceptPenalty')}
					</button>
				{/if}
				{#if challengeAction}
					<button onclick={() => onAction(challengeAction)} class="ch-btn ch-btn--challenge">
						{$t('color.challenge')}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Opponent played card fly-in -->
{#if opponentPlayCard}
	<img
		in:fly={{ y: -260, duration: 520, easing: cubicOut }}
		out:fade={{ duration: 80 }}
		src={opponentPlayCard}
		alt="card played"
		class="pointer-events-none fixed left-1/2 top-[42%] z-40 h-24 w-16 -translate-x-1/2 -translate-y-1/2 rounded-lg object-contain shadow-2xl sm:h-28 sm:w-20"
		draggable="false"
	/>
{/if}

<!-- Color picker overlay -->
{#if pendingCardId}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
		role="dialog"
		aria-modal="true"
		aria-label={$t('color.chooseColor')}
	>
		<div class="picker-box">
			<p class="picker-label">{$t('color.chooseColor')}</p>
			<div class="picker-grid">
				{#each CARD_COLORS as color}
					<button onclick={() => handleColorPick(color)} class="picker-swatch picker-swatch--{color}">
						{COLOR_LABELS[color]}
					</button>
				{/each}
			</div>
			<button onclick={() => (pendingCardId = null)} class="picker-cancel">
				{$t('common.cancel')}
			</button>
		</div>
	</div>
{/if}

<!-- Solo button -->
{#if gs.soloAlert && soloButtonAction}
	{@const isMine = gs.soloAlert.playerId === myPlayerId}
	<div
		style="position:fixed; left:{gs.soloAlert.x * 100}%; top:{gs.soloAlert.y * 100}%; transform:translate(-50%,-50%); z-index:60;"
		in:scale={{ duration: 200, start: 0.5 }}
	>
		<button
			onclick={() => onAction(soloButtonAction)}
			class="solo-btn {isMine ? 'solo-btn--mine' : 'solo-btn--counter'}"
		>
			{isMine ? $t('color.solo') : $t('color.counterSolo')}
		</button>
	</div>
{/if}

<style>
	/* ── ROOT ──────────────────────────────────── */
	.color-root {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		background:
			radial-gradient(ellipse 90% 55% at 50% 65%, var(--gc-dim) 0%, transparent 68%),
			oklch(0.09 0.015 265);
	}

	/* ── HEADER ─────────────────────────────────── */
	.color-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: calc(0.5rem + env(safe-area-inset-top)) 0.875rem 0.5rem;
		border-bottom: 1px solid oklch(1 0 0 / 8%);
		background: oklch(0.10 0.015 265 / 0.90);
		backdrop-filter: blur(10px);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.hdr-left,
	.hdr-right {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
		width: 5rem;
	}

	.hdr-right { justify-content: flex-end; }

	.dir-icon {
		color: oklch(0.52 0 0);
		display: flex;
		align-items: center;
	}

	.hdr-turn {
		font-family: var(--font-heading);
		font-size: 0.82rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: oklch(0.62 0 0);
		text-align: center;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.hdr-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.375rem;
		background: none;
		border: none;
		border-radius: 2px;
		color: oklch(0.44 0 0);
		cursor: pointer;
		transition: color 0.15s;
	}
	.hdr-btn:hover { color: oklch(0.78 0 0); }

	/* ── OPPONENTS ──────────────────────────────── */
	.opp-strip {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid oklch(1 0 0 / 7%);
		scrollbar-width: none;
	}
	.opp-strip::-webkit-scrollbar { display: none; }

	.opp-tile {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 0.5rem 0.625rem;
		border-radius: 4px;
		border: 1px solid oklch(1 0 0 / 7%);
		border-top: 2px solid transparent;
		background: oklch(0.13 0.015 265);
		transition: border-top-color 0.3s ease, background 0.3s ease;
	}

	.opp-tile--active {
		border-top-color: var(--gc);
		background: oklch(0.15 0.025 265);
	}

	.opp-tile--bounce { animation: opp-bounce 0.55s ease; }

	@keyframes opp-bounce {
		0%, 100% { transform: translateY(0); }
		40% { transform: translateY(-6px); }
		70% { transform: translateY(-2px); }
	}

	.opp-name {
		font-family: var(--font-heading);
		font-size: 0.82rem;
		letter-spacing: 0.10em;
		text-transform: uppercase;
		color: oklch(0.80 0 0);
		white-space: nowrap;
	}

	.opp-cards {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.opp-card-img {
		width: 22px;
		height: 32px;
		border-radius: 3px;
		object-fit: contain;
	}

	.opp-overflow {
		font-family: var(--font-heading);
		font-size: 0.68rem;
		color: oklch(0.44 0 0);
		margin-left: 2px;
	}

	.opp-empty {
		font-size: 0.68rem;
		color: oklch(0.34 0 0);
	}

	/* ── ARENA ──────────────────────────────────── */
	.arena {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2.25rem;
		padding: 2rem 1rem 0.75rem;
		flex: 1;
	}

	.arena-pile {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
	}

	.pile-btn {
		border: none;
		background: none;
		padding: 0;
		cursor: default;
		border-radius: 6px;
		transition: opacity 0.2s, transform 0.15s;
	}

	.pile-btn--active { cursor: pointer; }
	.pile-btn--active:hover { transform: translateY(-3px); }

	.pile-btn--pending {
		animation: pile-pulse 1.1s ease-in-out infinite;
		filter: drop-shadow(0 0 8px var(--gc));
	}

	.pile-btn--must {
		animation: pile-pulse 1.1s ease-in-out infinite;
	}

	@keyframes pile-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.60; }
	}

	.pile-img {
		width: 56px;
		height: 80px;
		border-radius: 6px;
		object-fit: contain;
		box-shadow: 0 4px 18px oklch(0 0 0 / 0.55);
		display: block;
	}

	.discard-img {
		box-shadow: 0 4px 18px oklch(0 0 0 / 0.55), 0 0 18px var(--gc-dim);
	}

	.pile-empty {
		width: 56px;
		height: 80px;
		border-radius: 6px;
		border: 2px dashed oklch(1 0 0 / 11%);
		background: oklch(1 0 0 / 3%);
	}

	.pile-label {
		font-family: var(--font-heading);
		font-size: 0.68rem;
		letter-spacing: 0.10em;
		text-transform: uppercase;
		color: oklch(0.40 0 0);
	}

	.pile-pending {
		font-family: var(--font-heading);
		font-size: 0.88rem;
		letter-spacing: 0.08em;
		color: oklch(0.82 0.18 80);
		animation: pile-pulse 0.9s ease-in-out infinite;
	}

	/* ── COLOR ORB ──────────────────────────────── */
	.color-orb {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 72px;
		height: 72px;
		border-radius: 50%;
		background: var(--gc-dim);
		box-shadow:
			0 0 0 1px oklch(1 0 0 / 9%),
			0 0 28px var(--gc-dim),
			0 0 52px oklch(0 0 0 / 0.20);
		animation: orb-breathe 3.2s ease-in-out infinite;
	}

	@keyframes orb-breathe {
		0%, 100% {
			transform: scale(1);
			box-shadow: 0 0 0 1px oklch(1 0 0 / 9%), 0 0 28px var(--gc-dim), 0 0 52px oklch(0 0 0 / 0.20);
		}
		50% {
			transform: scale(1.07);
			box-shadow: 0 0 0 1px oklch(1 0 0 / 14%), 0 0 42px var(--gc), 0 0 64px oklch(0 0 0 / 0.10);
		}
	}

	.color-orb-inner {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--gc);
		box-shadow: 0 0 20px var(--gc);
	}

	/* ── DIRECTION ROW ──────────────────────────── */
	.direction-row {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0.375rem;
		color: oklch(0.36 0 0);
	}

	/* ── HAND DOCK ──────────────────────────────── */
	.hand-dock {
		border-top: 1px solid oklch(1 0 0 / 8%);
		background: oklch(0.11 0.015 265 / 0.92);
		padding: 1rem 0.75rem;
		padding-bottom: calc(1rem + env(safe-area-inset-bottom));
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
		border-radius: 6px;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	.card-btn--play {
		cursor: pointer;
		transform: translateY(-5px);
		box-shadow: 0 0 0 2px var(--gc), 0 0 12px oklch(0 0 0 / 0.30);
	}

	.card-btn--play:hover {
		transform: translateY(-9px);
		box-shadow: 0 0 0 2px var(--gc), 0 0 18px var(--gc-dim);
	}

	.card-btn--drawn {
		cursor: pointer;
		transform: translateY(-5px);
		box-shadow: 0 0 0 2px oklch(0.82 0.20 80), 0 0 14px oklch(0.82 0.20 80 / 0.40);
	}

	.card-btn--drawn:hover { transform: translateY(-9px); }

	.card-btn--dead {
		cursor: default;
		opacity: 0.32;
	}

	.card-img {
		width: 44px;
		height: 62px;
		border-radius: 6px;
		object-fit: contain;
		display: block;
	}

	@media (min-width: 640px) {
		.card-img { width: 52px; height: 74px; }
	}

	.end-turn-row {
		margin-top: 0.875rem;
		display: flex;
		justify-content: center;
	}

	.end-turn-btn {
		font-family: var(--font-heading);
		font-size: 0.88rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		padding: 0.6rem 1.75rem;
		border-radius: 3px;
		border: 1px solid oklch(1 0 0 / 12%);
		background: oklch(0.16 0.02 265);
		color: oklch(0.68 0 0);
		cursor: pointer;
		transition: color 0.15s, background 0.15s, border-color 0.15s;
	}

	.end-turn-btn:hover {
		color: oklch(0.90 0 0);
		background: oklch(0.19 0.035 265);
		border-color: var(--gc);
	}

	/* ── CHALLENGE OVERLAY ─────────────────────── */
	.challenge-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		border-radius: 6px;
		border: 1px solid oklch(1 0 0 / 10%);
		background: oklch(0.13 0.02 265);
		padding: 1.5rem 2rem;
		box-shadow: 0 10px 52px oklch(0 0 0 / 0.88);
	}

	.challenge-label {
		font-family: var(--font-heading);
		font-size: 1rem;
		letter-spacing: 0.20em;
		text-transform: uppercase;
		color: oklch(0.72 0 0);
	}

	.challenge-btns { display: flex; gap: 0.75rem; }

	.ch-btn {
		font-family: var(--font-heading);
		font-size: 0.88rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		padding: 0.72rem 1.5rem;
		border-radius: 3px;
		cursor: pointer;
		transition: filter 0.15s;
	}
	.ch-btn:hover { filter: brightness(1.22); }
	.ch-btn:active { transform: scale(0.97); }

	.ch-btn--accept {
		background: oklch(0.17 0.02 265);
		color: oklch(0.58 0 0);
		border: 1px solid oklch(1 0 0 / 11%);
	}

	.ch-btn--challenge {
		background: oklch(0.22 0.10 25);
		color: oklch(0.75 0.18 25);
		border: 1px solid oklch(0.52 0.18 25 / 0.35);
	}

	/* ── COLOR PICKER OVERLAY ──────────────────── */
	.picker-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		border-radius: 6px;
		border: 1px solid oklch(1 0 0 / 10%);
		background: oklch(0.13 0.02 265);
		padding: 1.5rem 2rem;
		box-shadow: 0 10px 52px oklch(0 0 0 / 0.88);
	}

	.picker-label {
		font-family: var(--font-heading);
		font-size: 1rem;
		letter-spacing: 0.20em;
		text-transform: uppercase;
		color: oklch(0.72 0 0);
	}

	.picker-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.625rem;
	}

	.picker-swatch {
		font-family: var(--font-heading);
		font-size: 0.88rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		width: 112px;
		height: 52px;
		border-radius: 4px;
		border: none;
		cursor: pointer;
		transition: transform 0.12s, filter 0.12s;
	}
	.picker-swatch:hover { transform: scale(1.05); filter: brightness(1.2); }
	.picker-swatch:active { transform: scale(0.96); }

	.picker-swatch--red    { background: oklch(0.62 0.22 25);  color: oklch(0.96 0 0); }
	.picker-swatch--yellow { background: oklch(0.80 0.18 80);  color: oklch(0.16 0 0); }
	.picker-swatch--green  { background: oklch(0.70 0.22 145); color: oklch(0.14 0 0); }
	.picker-swatch--blue   { background: oklch(0.62 0.22 255); color: oklch(0.96 0 0); }

	.picker-cancel {
		font-size: 0.72rem;
		color: oklch(0.38 0 0);
		background: none;
		border: none;
		cursor: pointer;
		transition: color 0.15s;
	}
	.picker-cancel:hover { color: oklch(0.65 0 0); }

	/* ── SOLO BUTTON ────────────────────────────── */
	.solo-btn {
		font-family: var(--font-heading);
		font-size: 0.92rem;
		letter-spacing: 0.20em;
		text-transform: uppercase;
		padding: 0.75rem 1.5rem;
		border-radius: 999px;
		border: none;
		cursor: pointer;
		animation: solo-pulse 0.85s ease-in-out infinite;
	}

	.solo-btn--mine {
		background: oklch(0.60 0.22 145);
		color: oklch(0.96 0 0);
		box-shadow: 0 4px 18px oklch(0.60 0.22 145 / 0.45);
	}

	.solo-btn--counter {
		background: oklch(0.62 0.22 25);
		color: oklch(0.96 0 0);
		box-shadow: 0 4px 18px oklch(0.62 0.22 25 / 0.45);
	}

	@keyframes solo-pulse {
		0%, 100% { transform: scale(1); filter: brightness(1); }
		50% { transform: scale(1.12); filter: brightness(1.18); }
	}

	.solo-btn:hover {
		animation: none;
		transform: scale(1.20);
		filter: brightness(1.25);
		transition: transform 0.1s, filter 0.1s;
	}

	.solo-btn:active {
		animation: none;
		transform: scale(0.88);
		transition: transform 0.08s;
	}
</style>
