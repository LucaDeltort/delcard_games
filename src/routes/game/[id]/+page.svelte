<script lang="ts">
import { X } from 'lucide-svelte'
import { onDestroy, onMount } from 'svelte'
import { get } from 'svelte/store'
import { browser } from '$app/environment'
import { beforeNavigate, goto } from '$app/navigation'
import { page } from '$app/stores'
import ConfirmDialog from '$lib/components/ConfirmDialog.svelte'
import FightView from '$lib/components/games/FightView.svelte'
import WarView from '$lib/components/games/WarView.svelte'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
import { Button } from '$lib/components/ui/button'
import type { GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'
import { gameList, games } from '$lib/games/index'
import { t } from '$lib/i18n'
import { activeClient, activeHost } from '$lib/stores/session'

const code = $page.params.id
const isHost = $page.url.searchParams.get('role') === 'host'
const gameId = $page.url.searchParams.get('game') ?? ''

let gameState = $state<GameStateGeneric | null>(null)
let lobbyPlayers = $state<{ id: string; name: string }[]>([])
let myPlayerId = $state('')
let disconnectedMsg = $state('')
let reconnecting = $state(false)
let hostError = $state('')
let validActions = $state<Action[]>([])
let codeCopied = $state(false)
let confirmOpen = $state(false)
let pendingDestination = ''
let _skipConfirm = false
let kickTarget = $state<{ id: string; name: string } | null>(null)

const gameMeta = gameList.find((g) => g.id === gameId)

$effect(() => {
	if (!gameState || !myPlayerId) {
		validActions = []
		return
	}
	const def = games[gameState.activeGameId]
	validActions = def ? def.getValidActions(gameState, myPlayerId) : []
})

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
		host.onLobbyChange = (players) => {
			lobbyPlayers = players
		}
		host.onState = (state) => {
			gameState = state
		}
		host.onError = (msg) => {
			hostError = msg
		}
	} else {
		const client = get(activeClient)
		if (!client) {
			goto('/join')
			return
		}
		client.onWelcome = (id) => {
			myPlayerId = id
		}
		client.onLobby = (players) => {
			lobbyPlayers = players
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
		// Read state that may have arrived before onMount ran
		myPlayerId = client.playerId ?? ''
		if (client.lobbyPlayers.length > 0) lobbyPlayers = client.lobbyPlayers
	}
})

onDestroy(() => {
	if (!isHost) get(activeClient)?.close()
})

beforeNavigate(({ cancel, to, willUnload }) => {
	if (willUnload) return
	if (_skipConfirm) {
		_skipConfirm = false
		return
	}
	if (disconnectedMsg) return
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

function submitAction(action: Action) {
	if (isHost) get(activeHost)?.submitAction(action)
	else get(activeClient)?.sendAction(action)
}

async function copyShareLink() {
	await navigator.clipboard.writeText(`${window.location.origin}/join?code=${code}`)
	codeCopied = true
	setTimeout(() => (codeCopied = false), 2000)
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
	<div class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
		<p class="text-sm text-muted-foreground">{$t('network.reconnecting')}</p>
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
	<main class="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
		<p class="text-2xl text-foreground">{disconnectedMsg}</p>
		<Button href="/" variant="outline">{$t('common.backHome')}</Button>
	</main>

	<!-- ── Lobby ──────────────────────────────────────────────────── -->
{:else if !gameState}
	<main class="flex min-h-screen flex-col items-center justify-center gap-10 px-4">
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
			{codeCopied ? $t('game.linkCopied') : $t('game.copyLink')}
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
								class="text-muted-foreground transition-colors hover:text-destructive"
								aria-label="Kick {player.name}"
							>
								<X size={14} />
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		</div>

		{#if isHost}
			<Button
				onclick={startGame}
				disabled={!gameMeta || lobbyPlayers.length < (gameMeta?.minPlayers ?? 2)}
				class="w-full max-w-xs"
			>
				{$t('game.start')}
			</Button>
			{#if gameMeta && lobbyPlayers.length < gameMeta.minPlayers}
				<p class="text-xs text-muted-foreground">
					{$t('game.minPlayersRequired', { n: gameMeta.minPlayers })}
				</p>
			{/if}
		{:else}
			<p class="text-sm text-muted-foreground">{$t('game.waitingStart')}</p>
			<Button onclick={() => goto('/')} variant="outline" class="w-full max-w-xs">
				{$t('game.leaveGame')}
			</Button>
		{/if}
	</main>

	<!-- ── Game over ──────────────────────────────────────────────── -->
{:else if gameState.phase === 'gameover'}
	{@const winner = games[gameState.activeGameId]?.getWinner(gameState)}
	{@const winnerName = lobbyPlayers.find((p) => p.id === winner)?.name ?? winner ?? '?'}
	<main class="flex min-h-screen flex-col items-center justify-center gap-8 px-4 text-center">
		<div>
			<p class="text-sm tracking-widest text-muted-foreground uppercase">{$t('game.over')}</p>
			<h1 class="mt-2 font-heading text-7xl text-foreground">{winnerName}</h1>
			<p class="mt-2 text-muted-foreground">{$t('game.wins')}</p>
		</div>
		<Button href="/" variant="outline">{$t('common.backHome')}</Button>
	</main>

	<!-- ── Game ───────────────────────────────────────────────────── -->
{:else if gameState.activeGameId === 'war'}
	<WarView
		state={gameState}
		{myPlayerId}
		players={lobbyPlayers}
		{validActions}
		onAction={submitAction}
	/>
{:else if gameState.activeGameId === 'fight'}
	<FightView
		state={gameState}
		{myPlayerId}
		players={lobbyPlayers}
		{validActions}
		onAction={submitAction}
	/>

	<!-- ── Game (generic fallback) ───────────────────────────────── -->
{:else}
	{@const activePlayer = lobbyPlayers.find((p) => p.id === gameState?.turnPlayerId)}
	<div class="flex min-h-screen flex-col">
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
							{zoneId}
							<span class="ml-1 text-muted-foreground/50">({zone.cards.length})</span>
						</p>
						<div class="flex flex-wrap gap-1">
							{#if zone.cards.length === 0}
								<span class="text-xs text-muted-foreground/40">{$t('game.empty')}</span>
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
