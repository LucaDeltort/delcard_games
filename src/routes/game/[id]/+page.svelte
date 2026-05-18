<script lang="ts">
import { Dialog } from 'bits-ui'
import { Loader2, Settings as SettingsIcon, SlidersHorizontal, X } from 'lucide-svelte'
import { onDestroy, onMount } from 'svelte'
import { get } from 'svelte/store'
import { fade, fly } from 'svelte/transition'
import { browser } from '$app/environment'
import { beforeNavigate, goto } from '$app/navigation'
import { page } from '$app/stores'
import ConfirmDialog from '$lib/components/ConfirmDialog.svelte'
import DeckPackPicker from '$lib/components/DeckPackPicker.svelte'
import GameOptionsPanel from '$lib/components/GameOptionsPanel.svelte'
import ColorView from '$lib/components/games/ColorView.svelte'
import FightView from '$lib/components/games/FightView.svelte'
import PresidentsView from '$lib/components/games/PresidentsView.svelte'
import WarView from '$lib/components/games/WarView.svelte'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
import { Button } from '$lib/components/ui/button'
import type { GameStateGeneric } from '$lib/core/types'
import { getDeckSlugForType } from '$lib/decks/registry'
import type { Action } from '$lib/engine'
import { gameList, games } from '$lib/games/index'
import { t } from '$lib/i18n'
import { loadGameOptions, saveGameOptions } from '$lib/stores/gameOptions'
import { activeClient, activeHost } from '$lib/stores/session'
import { settingsOpen } from '$lib/stores/settings'

const code = $page.params.id
const isHost = $page.url.searchParams.get('role') === 'host'
let resolvedGameId = $state($page.url.searchParams.get('game') ?? '')

let gameState = $state<GameStateGeneric | null>(null)
let lobbyPlayers = $state<{ id: string; name: string }[]>([])
let myPlayerId = $state('')
let disconnectedMsg = $state('')
let reconnecting = $state(false)
let hostError = $state('')
let validActions = $state<Action[]>([])
let codeCopied = $state(false)
let confirmOpen = $state(false)
let connectionQuality = $state<'good' | 'warn' | 'poor' | null>(null)
let reconnectFailed = $state(false)
let _reconnectTimeout: ReturnType<typeof setTimeout> | null = null
let pendingDestination = ''
let _skipConfirm = false
let kickTarget = $state<{ id: string; name: string } | null>(null)

const gameMeta = $derived(gameList.find((g) => g.id === resolvedGameId))
const gameDef = $derived(games[resolvedGameId])
const deckSlug = $derived(
	getDeckSlugForType(games[resolvedGameId]?.deckType ?? 'FrenchDeckWithoutJoker')
)

let lobbyOptions = $state<Record<string, unknown>>({})

let knownNames: Record<string, string> = $state({})

$effect(() => {
	for (const p of lobbyPlayers) knownNames[p.id] = p.name
})

const enrichedPlayers = $derived(
	gameState ? gameState.players.map((id) => ({ id, name: knownNames[id] ?? id })) : lobbyPlayers
)

$effect(() => {
	if (!gameState || !myPlayerId) {
		validActions = []
		return
	}
	const def = games[gameState.activeGameId]
	validActions = def ? def.getValidActions(gameState, myPlayerId) : []
})

$effect(() => {
	if (reconnecting) {
		reconnectFailed = false
		_reconnectTimeout = setTimeout(() => {
			reconnectFailed = true
		}, 10000)
		return () => {
			if (_reconnectTimeout) {
				clearTimeout(_reconnectTimeout)
				_reconnectTimeout = null
			}
		}
	}
	reconnectFailed = false
})

let _hostVisibilityHandler: (() => void) | null = null
let _hostOnlineHandler: (() => void) | null = null

onMount(() => {
	if (!browser) return

	if (isHost) {
		const host = get(activeHost)
		if (!host) {
			goto('/')
			return
		}
		myPlayerId = host.playerId
		lobbyPlayers = host.lobbyPlayers
		lobbyOptions = host.options
		const saved = loadGameOptions(resolvedGameId)
		for (const [key, value] of Object.entries(saved)) {
			if (key in lobbyOptions) host.updateOption(key, value)
		}
		lobbyOptions = host.options
		host.onLobbyChange = (players) => {
			lobbyPlayers = players
			lobbyOptions = get(activeHost)?.options ?? {}
		}
		host.onState = (state) => {
			gameState = state
		}
		host.onError = (msg) => {
			hostError = msg
		}
		_hostVisibilityHandler = () => {
			if (document.visibilityState === 'visible') host.reconnectSignaling()
		}
		_hostOnlineHandler = () => host.reconnectSignaling()
		document.addEventListener('visibilitychange', _hostVisibilityHandler)
		window.addEventListener('online', _hostOnlineHandler)
	} else {
		const client = get(activeClient)
		if (!client) {
			goto('/join')
			return
		}
		client.onWelcome = (id) => {
			myPlayerId = id
			if (client.gameId) resolvedGameId = client.gameId
		}
		client.onLobby = (players) => {
			lobbyPlayers = players
			lobbyOptions = client.options
		}
		client.onState = (state) => {
			reconnecting = false
			gameState = state
		}
		client.onDisconnected = (msg) => {
			reconnecting = false
			disconnectedMsg = msg
		}
		client.onReconnecting = () => {
			reconnecting = true
		}
		client.onQualityChange = (q) => {
			connectionQuality = q
		}
		// Read state that may have arrived before onMount ran
		myPlayerId = client.playerId ?? ''
		if (client.gameId) resolvedGameId = client.gameId
		lobbyOptions = client.options
		if (client.lobbyPlayers.length > 0) lobbyPlayers = client.lobbyPlayers
	}
})

onDestroy(() => {
	if (browser) {
		if (_hostVisibilityHandler)
			document.removeEventListener('visibilitychange', _hostVisibilityHandler)
		if (_hostOnlineHandler) window.removeEventListener('online', _hostOnlineHandler)
	}
	if (isHost) get(activeHost)?.close()
	else get(activeClient)?.close()
})

beforeNavigate(({ cancel, to, willUnload, type }) => {
	if (willUnload) return
	if (type === 'popstate' && !gameState) return
	if (_skipConfirm) {
		_skipConfirm = false
		return
	}
	if (disconnectedMsg) return
	if (reconnectFailed) return
	if (gameState?.phase === 'gameover') return
	cancel()
	pendingDestination = to?.url.href ?? '/'
	confirmOpen = true
})

function confirmLeave() {
	confirmOpen = false
	_skipConfirm = true
	goto(pendingDestination)
}

function cancelLeave() {
	confirmOpen = false
}

function confirmKick() {
	if (kickTarget) get(activeHost)?.kick(kickTarget.id)
	kickTarget = null
}

function startGame() {
	get(activeHost)?.startGame()
}

function updateOption(key: string, value: unknown) {
	get(activeHost)?.updateOption(key, value)
	lobbyOptions = get(activeHost)?.options ?? {}
	saveGameOptions(resolvedGameId, lobbyOptions)
}

function submitAction(action: Action) {
	if (isHost) get(activeHost)?.submitAction(action)
	else get(activeClient)?.sendAction(action)
}

async function copyShareLink() {
	await navigator.clipboard.writeText(`${window.location.origin}/join?code=${code}`)
	codeCopied = true
	setTimeout(() => (codeCopied = false), 3000)
}

function actionLabel(action: Action): string {
	const payload = action.payload as Record<string, unknown> | undefined
	if (!payload) return action.type
	if (typeof payload.targetId === 'string') return `${action.type} → ${payload.targetId}`
	return action.type
}

function cardLabel(face: string, suit?: string): string {
	const suits: Record<string, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
	return face + (suit ? (suits[suit] ?? suit) : '')
}

$effect(() => {
	if (isHost) {
		const host = get(activeHost)
		if (host) lobbyPlayers = host.lobbyPlayers
	}
})
</script>

<!-- ── Reconnecting overlay ──────────────────────────────────── -->
{#if reconnecting}
	<div class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
		{#if reconnectFailed}
			<p class="text-sm text-foreground">{$t('network.reconnectFailed')}</p>
			<Button href="/" variant="outline">{$t('common.backHome')}</Button>
		{:else}
			<Loader2 class="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
			<p class="text-sm text-muted-foreground">{$t('network.reconnecting')}</p>
		{/if}
	</div>
{/if}

<!-- ── Connection quality dot ────────────────────────────────── -->
{#if !isHost && connectionQuality && gameState && gameState.phase !== 'gameover'}
	<div class="fixed bottom-4 right-4 z-40">
		<span
			class="block h-2.5 w-2.5 rounded-full {connectionQuality === 'good'
				? 'bg-green-500'
				: connectionQuality === 'warn'
					? 'bg-yellow-500'
					: 'bg-red-500'}"
			aria-hidden="true"
		></span>
		<span class="sr-only">{$t('network.connection')}: {$t(`network.quality.${connectionQuality}`)}</span>
	</div>
{/if}

<!-- ── Host error banner ─────────────────────────────────────── -->
{#if hostError}
	<div class="fixed top-0 right-0 left-0 z-50 flex items-center justify-between gap-4 bg-destructive/90 px-4 py-2 text-sm text-destructive-foreground">
		<span>{hostError}</span>
		<button onclick={() => (hostError = '')} class="shrink-0 opacity-70 hover:opacity-100">
			<X size={16} />
		</button>
	</div>
{/if}

<!-- ── Disconnected ───────────────────────────────────────────── -->
{#if disconnectedMsg}
	<main class="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
		<p class="text-2xl text-foreground">{disconnectedMsg}</p>
		<Button href="/" variant="outline">{$t('common.backHome')}</Button>
	</main>

	<!-- ── Lobby ──────────────────────────────────────────────────── -->
{:else if !gameState}
	<button
		onclick={() => ($settingsOpen = true)}
		class="fixed right-4 z-50 rounded-md border border-border bg-card px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
		style="top: calc(1rem + env(safe-area-inset-top))"
		aria-label={$t('settings.title')}
	>
		<SettingsIcon size={16} />
	</button>
	<main class="flex min-h-dvh flex-col items-center justify-center gap-10 px-4">
		<header class="flex flex-col items-center text-center">
			<div class="flex items-center gap-2">
				<p class="text-sm tracking-widest text-muted-foreground uppercase">
					{gameMeta ? $t(`${gameMeta.id}.name`) : 'Partie'}
				</p>
				{#if gameMeta}
					<RulesDrawer gameId={gameMeta.id} />
				{/if}
			</div>
			<h1 class="font-heading text-7xl tracking-wide text-foreground">{code}</h1>
		</header>

		<button
			onclick={copyShareLink}
			class="rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
		>
			{#key codeCopied}
				<span class="inline-block" in:fade={{ duration: 200 }}>
					{codeCopied ? $t('game.linkCopied') : $t('game.copyLink')}
				</span>
			{/key}
		</button>

		<div class="w-full max-w-xs">
			<p class="mb-3 text-xs tracking-widest text-muted-foreground uppercase">
				{$t('game.players', { n: lobbyPlayers.length })}
			</p>
			<ul class="flex flex-col gap-2">
				{#each lobbyPlayers as player, i}
					<li
						class="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm"
					>
						{#if i === 0}
							<span class="text-accent">★</span>
						{:else}
							<span class="text-muted-foreground">·</span>
						{/if}
						<span class="flex-1 text-foreground">{player.name}</span>
						{#if player.id === myPlayerId}
							<span class="text-xs text-muted-foreground">{$t('common.you')}</span>
						{:else if isHost}
							<button
								onclick={() => (kickTarget = player)}
								class="p-2 text-muted-foreground transition-colors hover:text-destructive"
								aria-label="Kick {player.name}"
							>
								<X size={16} />
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		</div>

		{#if gameDef?.optionsSchema?.length}
			<Dialog.Root>
				<Dialog.Trigger
					class="flex w-full max-w-xs items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground transition-colors hover:border-primary"
				>
					<SlidersHorizontal size={14} />
					{$t('game.rules')}
				</Dialog.Trigger>
				<Dialog.Portal>
					<Dialog.Overlay class="fixed inset-0 z-[100] bg-black/20" />
					<Dialog.Content
						class="fixed inset-y-0 right-0 z-[110] flex w-72 max-w-[85vw] flex-col border-l border-border bg-card shadow-xl focus:outline-none"
					>
						<div class="flex items-center justify-between border-b border-border px-4 py-2">
							<Dialog.Title class="text-xs tracking-widest text-muted-foreground uppercase">
								{$t('game.rules')}
							</Dialog.Title>
							<Dialog.Close
								class="p-2 text-muted-foreground transition-colors hover:text-foreground"
								aria-label={$t('common.close')}
							>
								<X size={16} />
							</Dialog.Close>
						</div>
						<div class="flex-1 overflow-y-auto px-4 py-4">
							<GameOptionsPanel
								schema={gameDef.optionsSchema}
								options={lobbyOptions}
								{isHost}
								onChange={updateOption}
							/>
						</div>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		{/if}

		<DeckPackPicker {deckSlug} />

		{#if isHost}
			{#if gameMeta && lobbyPlayers.length < gameMeta.minPlayers}
				<p class="text-xs text-muted-foreground">
					{$t('game.minPlayersRequired', { n: gameMeta.minPlayers })}
				</p>
			{/if}
			<Button
				onclick={startGame}
				disabled={!gameMeta || lobbyPlayers.length < (gameMeta?.minPlayers ?? 2)}
				class="w-full max-w-xs"
			>
				{$t('game.start')}
			</Button>
		{:else}
			<p class="text-sm text-muted-foreground">{$t('game.waitingStart')}</p>
			<Button onclick={() => goto('/')} variant="outline" class="w-full max-w-xs">
				{$t('game.leaveGame')}
			</Button>
		{/if}
	</main>

	<!-- ── Game ───────────────────────────────────────────────────── -->
{:else if gameState.activeGameId === 'war'}
	<WarView
		state={gameState}
		{myPlayerId}
		players={enrichedPlayers}
		{validActions}
		onAction={submitAction}
	/>
{:else if gameState.activeGameId === 'fight'}
	<FightView
		state={gameState}
		{myPlayerId}
		players={enrichedPlayers}
		{validActions}
		onAction={submitAction}
	/>
{:else if gameState.activeGameId === 'color'}
	<ColorView
		state={gameState}
		{myPlayerId}
		players={enrichedPlayers}
		{validActions}
		onAction={submitAction}
	/>

{:else if gameState.activeGameId === 'presidents'}
	<PresidentsView
		state={gameState}
		{myPlayerId}
		players={enrichedPlayers}
		{validActions}
		onAction={submitAction}
	/>

	<!-- ── Game (generic fallback) ───────────────────────────────── -->
{:else}
	{@const activePlayer = enrichedPlayers.find((p) => p.id === gameState?.turnPlayerId)}
	<div class="flex min-h-dvh flex-col">
		<header
			class="flex items-center justify-between border-b border-border bg-card px-6 py-3 text-sm"
		>
			<span class="font-mono text-muted-foreground">{code}</span>
			<span class="text-foreground">
				{$t('common.turnOf', { name: activePlayer?.name ?? gameState.turnPlayerId })}
			</span>
			<span class="text-muted-foreground">{gameState.phase}</span>
		</header>

		<div class="flex-1 overflow-auto p-6">
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each Object.entries(gameState.zones) as [zoneId, zone]}
					{@const canSee = zone.type === 'public' || zone.ownerId === myPlayerId}
					<div class="rounded-lg border border-border bg-card p-4">
						<p class="mb-2 text-xs tracking-widest text-muted-foreground uppercase">
							{import.meta.env.DEV ? zoneId : ''}
							<span class="ml-1 text-muted-foreground">({zone.cards.length})</span>
						</p>
						<div class="flex flex-wrap gap-1">
							{#if zone.cards.length === 0}
								<span class="text-xs text-muted-foreground">{$t('game.empty')}</span>
							{:else if canSee}
								{#each zone.cards as card}
									<span
										class="inline-flex items-center rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-xs text-foreground"
									>
										{cardLabel(card.face, card.suit)}
									</span>
								{/each}
							{:else}
								<span class="text-xs text-muted-foreground">
									{zone.cards.length}
									{zone.cards.length > 1 ? $t('game.hiddenCards') : $t('game.hiddenCard')}
								</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<footer class="border-t border-border bg-card px-6 py-4">
			{#if validActions.length > 0}
				<p class="mb-3 text-xs tracking-widest text-muted-foreground uppercase">
					{$t('game.yourActions')}
				</p>
				<div class="flex flex-wrap gap-2">
					{#each validActions as action}
						<Button onclick={() => submitAction(action)} variant="outline" size="sm">
							{actionLabel(action)}
						</Button>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">
					{$t('game.waitingTurn', { name: activePlayer?.name ?? '…' })}
				</p>
			{/if}
		</footer>
	</div>
{/if}

<!-- ── Game over banner ───────────────────────────────────────── -->
{#if gameState?.phase === 'gameover'}
	{@const winner = games[gameState.activeGameId]?.getWinner(gameState)}
	{@const winnerName = enrichedPlayers.find((p) => p.id === winner)?.name ?? winner ?? '?'}
	<div
		in:fly={{ y: -80, duration: 400 }}
		class="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-border bg-card/95 px-6 py-4 shadow-lg backdrop-blur-sm"
	>
		<div>
			<p class="text-xs uppercase tracking-widest text-muted-foreground">{$t('game.over')}</p>
			<p class="font-heading text-xl text-foreground">{winnerName} — {$t('game.wins')}</p>
		</div>
		<div class="flex gap-2">
			{#if isHost}
				<Button onclick={() => get(activeHost)?.startGame()} size="sm">
					{$t('game.rematch')}
				</Button>
			{/if}
			<Button href="/" variant="outline" size="sm">{$t('common.backHome')}</Button>
		</div>
	</div>
{/if}

<ConfirmDialog
	open={confirmOpen}
	message={$t('game.confirmLeave')}
	confirmLabel={$t('game.leaveGame')}
	onConfirm={confirmLeave}
	onCancel={cancelLeave}
/>
<ConfirmDialog
	open={kickTarget !== null}
	message={$t('game.confirmKick', { name: kickTarget?.name ?? '' })}
	onConfirm={confirmKick}
	onCancel={() => (kickTarget = null)}
/>
