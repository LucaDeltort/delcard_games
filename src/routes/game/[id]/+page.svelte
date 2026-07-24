<script lang="ts">
import { Dialog } from 'bits-ui'
import {
	Club,
	Diamond,
	Heart,
	Loader2,
	Settings as SettingsIcon,
	SlidersHorizontal,
	Spade,
	X
} from 'lucide-svelte'
import { onDestroy, onMount } from 'svelte'
import { get } from 'svelte/store'
import { fade } from 'svelte/transition'
import { browser } from '$app/environment'
import { beforeNavigate, goto } from '$app/navigation'
import { page } from '$app/stores'
import { onGameStateChange } from '$lib/audio/gameAudio'
import ChatPanel from '$lib/components/ChatPanel.svelte'
import ConfirmDialog from '$lib/components/ConfirmDialog.svelte'
import DeckPackPicker from '$lib/components/DeckPackPicker.svelte'
import DicePackPicker from '$lib/components/DicePackPicker.svelte'
import GameOptionsPanel from '$lib/components/GameOptionsPanel.svelte'
import GameOverOverlay from '$lib/components/GameOverOverlay.svelte'
import BlackjackView from '$lib/components/games/BlackjackView.svelte'
import ColorView from '$lib/components/games/ColorView.svelte'
import FightView from '$lib/components/games/FightView.svelte'
import PresidentsView from '$lib/components/games/PresidentsView.svelte'
import PurpleView from '$lib/components/games/PurpleView.svelte'
import WarView from '$lib/components/games/WarView.svelte'
import WerewolfView from '$lib/components/games/WerewolfView.svelte'
import YamsView from '$lib/components/games/YamsView.svelte'
import NetworkStatusBanner from '$lib/components/NetworkStatusBanner.svelte'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
import Seo from '$lib/components/Seo.svelte'
import { Button } from '$lib/components/ui/button'
import type { GameStateGeneric } from '$lib/core/types'
import { getDeckSlugForType } from '$lib/decks/registry'
import type { Action } from '$lib/engine'
import { gameList, games } from '$lib/games/index'
import type { PurpleState } from '$lib/games/purple/purple'
import type { WerewolfState } from '$lib/games/werewolf/werewolf'
import { t } from '$lib/i18n'
import { GameClient, type MigrationResult } from '$lib/network/client'
import { GameHost } from '$lib/network/host'
import type { LobbyPlayer } from '$lib/network/messages'
import { chatMessages, clearChat, pushChatMessage } from '$lib/stores/chat'
import { loadGameOptions, saveGameOptions } from '$lib/stores/gameOptions'
import { activeClient, activeHost } from '$lib/stores/session'
import { settingsOpen } from '$lib/stores/settings'
import { recordGame } from '$lib/stores/stats'

const code = $page.params.id ?? ''
let isHost = $state($page.url.searchParams.get('role') === 'host')
let resolvedGameId = $state($page.url.searchParams.get('game') ?? '')

let gameState = $state<GameStateGeneric | null>(null)
let lobbyPlayers = $state<LobbyPlayer[]>([])
let myPlayerId = $state('')
let disconnectedMsg = $state('')
let reconnecting = $state(false)
let hostError = $state('')
let validActions = $state<Action[]>([])
let codeCopied = $state(false)
let confirmOpen = $state(false)
let connectionQuality = $state<'good' | 'warn' | 'poor' | null>(null)
let reconnectFailed = $state(false)
let migrating = $state(false)
let _reconnectingFromReload = false
let _reconnectTimeout: ReturnType<typeof setTimeout> | null = null
let pendingDestination = ''
let _skipConfirm = false
let kickTarget = $state<{ id: string; name: string } | null>(null)

const gameMeta = $derived(gameList.find((g) => g.id === resolvedGameId))
const gameDef = $derived(games[resolvedGameId])
const deckSlug = $derived(
	getDeckSlugForType(games[resolvedGameId]?.deckType ?? 'FrenchDeckWithoutJoker')
)
const gameDiceSlug = $derived(games[resolvedGameId]?.diceSlug ?? null)

let lobbyOptions = $state<Record<string, unknown>>({})

let knownNames: Record<string, string> = $state({})

$effect(() => {
	for (const p of lobbyPlayers) knownNames[p.id] = p.name
})

// Also populate from game state — late joiners/spectators appear in gameState
// but may not be in the current lobby list.
$effect(() => {
	if (!gameState) return
	for (const id of gameState.players) {
		if (!knownNames[id]) knownNames[id] = id
	}
})

const enrichedPlayers = $derived(
	gameState ? gameState.players.map((id) => ({ id, name: knownNames[id] ?? id })) : lobbyPlayers
)
const isSpectator = $derived(
	!isHost && gameState !== null && !!myPlayerId && !gameState.players.includes(myPlayerId)
)
const pendingLobbyPlayers = $derived(lobbyPlayers.filter((p) => p.pending))

$effect(() => {
	if (!gameState || !myPlayerId) {
		validActions = []
		return
	}
	const def = games[gameState.activeGameId]
	validActions = def ? def.getValidActions(gameState, myPlayerId) : []
})

// Reactive game audio: play SFX on state changes
let prevAudioState: GameStateGeneric | null = null

function isPhaseOver(state: GameStateGeneric): boolean {
	return state.phase === 'gameover' || state.phase === 'finished' || state.phase === 'done'
}

$effect(() => {
	if (!gameState) return
	const next = gameState
	const winner = next ? games[next.activeGameId]?.getWinner(next) : undefined
	onGameStateChange(prevAudioState, next, winner, myPlayerId)

	// Record stats when game transitions to over
	if (prevAudioState && !isPhaseOver(prevAudioState) && isPhaseOver(next)) {
		const myName = myPlayerId ? knownNames[myPlayerId] : undefined
		if (myName) recordGame(myName, next.activeGameId, winner === myPlayerId)
	}

	prevAudioState = next
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

function setupHostCallbacks(host: GameHost) {
	if (_hostVisibilityHandler) {
		document.removeEventListener('visibilitychange', _hostVisibilityHandler)
	}
	if (_hostOnlineHandler) {
		window.removeEventListener('online', _hostOnlineHandler)
	}
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
	host.onChat = (playerId, playerName, text) => {
		pushChatMessage(playerId, playerName, text)
	}
	_hostVisibilityHandler = () => {
		if (document.visibilityState === 'visible') host.reconnectSignaling()
	}
	_hostOnlineHandler = () => host.reconnectSignaling()
	document.addEventListener('visibilitychange', _hostVisibilityHandler)
	window.addEventListener('online', _hostOnlineHandler)
}

function setupClientCallbacks(client: GameClient) {
	client.onWelcome = (id) => {
		myPlayerId = id
		if (client.gameId) {
			resolvedGameId = client.gameId
			const def = games[client.gameId]
			if (def) client.setDef(def)
		}
	}
	client.onLobby = (players) => {
		lobbyPlayers = players
		lobbyOptions = client.options
	}
	client.onState = (state) => {
		reconnecting = false
		migrating = false
		gameState = state
	}
	client.onDisconnected = (msg) => {
		reconnecting = false
		migrating = false
		disconnectedMsg = msg
	}
	client.onReconnecting = () => {
		reconnecting = true
	}
	client.onMigrating = () => {
		reconnecting = false
		migrating = true
	}
	client.onQualityChange = (q) => {
		connectionQuality = q
	}
	client.onChat = (playerId, playerName, text) => {
		pushChatMessage(playerId, playerName, text)
	}
	client.onMigration = handleMigration
}

function handleMigration(result: MigrationResult) {
	migrating = false
	reconnecting = false
	const oldClient = get(activeClient)
	if (result.role === 'host') {
		const host = result.host
		isHost = true
		activeClient.set(null)
		activeHost.set(host)
		myPlayerId = host.playerId
		lobbyOptions = host.options
		lobbyPlayers = host.lobbyPlayers
		if (host.lastState) gameState = host.lastState
		setupHostCallbacks(host)
	} else {
		const client = result.client
		activeClient.set(client)
		setupClientCallbacks(client)
		// Carry over known state while new client connects
		myPlayerId = client.playerId ?? myPlayerId
	}
	oldClient?.close()
}

onMount(async () => {
	if (!browser) return

	if (isHost) {
		let host = get(activeHost)
		if (!host) {
			// Page reload — try to recover the host session from sessionStorage
			const stored = GameHost.getStoredHostSession(code)
			if (stored) {
				_reconnectingFromReload = true
				reconnecting = true
				// We need a game definition; if we don't know the game ID yet,
				// we can't resume. Try to read it from URL or wait for RESYNC.
				if (!resolvedGameId) {
					// Can't resume without knowing which game — redirect home
					GameHost.clearStoredHostSession(code)
					reconnecting = false
					_reconnectingFromReload = false
					await goto('/')
					return
				}
				const def = games[resolvedGameId]
				if (!def) {
					GameHost.clearStoredHostSession(code)
					reconnecting = false
					_reconnectingFromReload = false
					await goto('/')
					return
				}
				// Host reload is not supported for in-progress games because
				// the host peer ID would collide with the old one. Redirect home.
				GameHost.clearStoredHostSession(code)
				reconnecting = false
				_reconnectingFromReload = false
				await goto('/')
				return
			}
			await goto('/')
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
		setupHostCallbacks(host)
	} else {
		let client = get(activeClient)
		if (!client) {
			// Page reload or reopen - try to recover the client session from localStorage
			const stored = GameClient.getStoredSession(code)
			if (stored) {
				_reconnectingFromReload = true
				reconnecting = true
				const reconnectedClient = new GameClient(
					code,
					stored.playerName,
					undefined,
					-1,
					stored.peerId
				)
				client = reconnectedClient
				activeClient.set(reconnectedClient)
				setupClientCallbacks(reconnectedClient)
				reconnectedClient.onWelcome = () => {
					reconnecting = false
					_reconnectingFromReload = false
					myPlayerId = reconnectedClient.playerId ?? ''
					if (reconnectedClient.gameId) {
						resolvedGameId = reconnectedClient.gameId
						const def = games[reconnectedClient.gameId]
						if (def) reconnectedClient.setDef(def)
					}
					lobbyOptions = reconnectedClient.options
					if (reconnectedClient.lobbyPlayers.length > 0)
						lobbyPlayers = reconnectedClient.lobbyPlayers
					if (reconnectedClient.lastState) gameState = reconnectedClient.lastState
				}
				// Fallback: if no welcome within timeout, redirect to join
				const reloadTimeout = setTimeout(() => {
					if (_reconnectingFromReload) {
						reconnecting = false
						_reconnectingFromReload = false
						GameClient.clearStoredSession(code)
						reconnectedClient.close()
						activeClient.set(null)
						goto('/join')
					}
				}, 10000)
				reconnectedClient.onDisconnected = () => {
					clearTimeout(reloadTimeout)
					reconnecting = false
					_reconnectingFromReload = false
					GameClient.clearStoredSession(code)
					activeClient.set(null)
					disconnectedMsg = get(t)('network.connectionLost')
				}
				return
			}
			await goto('/join')
			return
		}
		setupClientCallbacks(client)
		// Read state that may have arrived before onMount ran
		myPlayerId = client.playerId ?? ''
		if (client.gameId) {
			resolvedGameId = client.gameId
			const def = games[client.gameId]
			if (def) client.setDef(def)
		}
		lobbyOptions = client.options
		if (client.lobbyPlayers.length > 0) lobbyPlayers = client.lobbyPlayers
		if (client.lastState) gameState = client.lastState
	}
})

onDestroy(() => {
	if (browser) {
		if (_hostVisibilityHandler)
			document.removeEventListener('visibilitychange', _hostVisibilityHandler)
		if (_hostOnlineHandler) window.removeEventListener('online', _hostOnlineHandler)
	}
	clearChat()
	// Both stores may be populated after migration; close whichever is active
	get(activeHost)?.close()
	get(activeClient)?.close()
})

// Clean up stored sessions when game ends — prevents stale reconnection attempts
$effect(() => {
	if (gameState?.phase === 'gameover' && browser) {
		GameClient.clearStoredSession(code)
		GameHost.clearStoredHostSession(code)
	}
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

async function confirmLeave() {
	confirmOpen = false
	// Clean up stored sessions so reload after leaving doesn't try to reconnect
	GameClient.clearStoredSession(code)
	GameHost.clearStoredHostSession(code)
	// If host leaves mid-game, migrate rather than terminate the session
	if (isHost && gameState && gameState.phase !== 'gameover') {
		const host = get(activeHost)
		if (host) {
			host.migrateAway(host.migrationIndex + 1)
			// Brief pause so MIGRATE_HOST message can be flushed before peer closes
			await new Promise<void>((r) => setTimeout(r, 150))
		}
	}
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

function retryReconnect() {
	reconnectFailed = false
	const oldClient = get(activeClient)
	if (!oldClient) return
	// Manually trigger a fresh reconnection attempt.
	// Creates a new GameClient from the stored session, replacing the old one.
	reconnecting = true
	setTimeout(() => {
		const session = GameClient.getStoredSession(code)
		if (!session) {
			reconnecting = false
			disconnectedMsg = get(t)('network.connectionLost')
			return
		}
		const newClient = new GameClient(code, session.playerName, undefined, -1, session.peerId)
		activeClient.set(newClient)
		setupClientCallbacks(newClient)
		newClient.onWelcome = () => {
			reconnecting = false
			myPlayerId = newClient.playerId ?? ''
			if (newClient.gameId) {
				resolvedGameId = newClient.gameId
				const def = games[newClient.gameId]
				if (def) newClient.setDef(def)
			}
		}
		newClient.onDisconnected = (msg) => {
			reconnecting = false
			migrating = false
			disconnectedMsg = msg
		}
		oldClient.close()
	}, 100)
}

function submitAction(action: Action) {
	if (isHost) get(activeHost)?.submitAction(action)
	else get(activeClient)?.sendAction(action)
}

function sendChat(text: string) {
	if (isHost) get(activeHost)?.sendChat(text)
	else get(activeClient)?.sendChat(text)
}

async function copyShareLink() {
	const link = `${window.location.origin}/join?code=${code}`
	const shareData = {
		title: $t('game.shareTitle'),
		text: $t('game.shareText', { game: gameMeta ? $t(`${gameMeta.id}.name`) : 'Delcard', code }),
		url: link
	}
	if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
		try {
			await navigator.share(shareData)
			return
		} catch {
			// user cancelled — fall through to clipboard
		}
	}
	await navigator.clipboard.writeText(link)
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

<Seo
	title="Game | Delcard"
	description="Live card game session."
	canonical="/game"
	noindex={true}
/>

<!-- ── Network status banner (top bar) ────────────────────────── -->
<NetworkStatusBanner quality={connectionQuality} {migrating} />

<!-- ── Migrating screen (dedicated full-screen) ─────────────────── -->
{#if migrating}
	<div class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/90 backdrop-blur-sm">
		<Loader2 class="size-8 animate-spin text-muted-foreground" aria-hidden="true" />
		<div class="flex flex-col items-center gap-1 text-center">
			<p class="font-heading text-lg text-foreground">{$t('network.migrationTitle')}</p>
			<p class="max-w-xs text-sm text-muted-foreground">{$t('network.migrationDescription')}</p>
		</div>
	</div>
{/if}

<!-- ── Reconnecting overlay ──────────────────────────────────── -->
{#if reconnecting}
	<div class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
		{#if reconnectFailed}
			<p class="px-8 text-center text-sm text-foreground">{$t('network.reconnectFailed')}</p>
			<div class="flex gap-3">
				<Button onclick={retryReconnect} size="sm">{$t('network.retry')}</Button>
				<Button href="/" variant="outline" size="sm">{$t('network.goHome')}</Button>
			</div>
		{:else}
			<Loader2 class="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
			<p class="text-sm text-muted-foreground">{$t('network.reconnecting')}</p>
		{/if}
	</div>
{/if}

<!-- ── Connection quality indicator ──────────────────────────── -->
{#if !isHost && connectionQuality && gameState && gameState.phase !== 'gameover'}
	<div class="fixed right-4 bottom-4 z-40 flex items-center justify-center rounded-full border border-border bg-card/90 p-1.5 backdrop-blur-sm">
		<span
			class="block h-2.5 w-2.5 rounded-full {connectionQuality === 'good'
				? 'bg-green-500'
				: connectionQuality === 'warn'
					? 'bg-yellow-500'
					: 'bg-red-500'}"
			role="status"
			aria-label="{$t('network.connection')}: {$t(`network.quality.${connectionQuality}`)}"
		></span>
	</div>
{/if}

<!-- ── Spectator banner ──────────────────────────────────────── -->
{#if isSpectator}
	<div class="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center border-t border-border bg-card/95 px-4 py-3 backdrop-blur-sm">
		<p class="text-sm text-muted-foreground">{$t('game.spectating')}</p>
	</div>
{/if}

<!-- ── Pending players indicator ─────────────────────────────── -->
{#if !isSpectator && pendingLobbyPlayers.length > 0 && gameState && gameState.phase !== 'gameover'}
	<div class="fixed bottom-4 left-4 z-40 rounded-lg border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm">
		{$t('game.waitingToJoin', { n: pendingLobbyPlayers.length })}
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

	<div class="lobby-bg-club" aria-hidden="true"><Club style="width:100%;height:100%" /></div>
	<div class="lobby-bg-glow" aria-hidden="true"></div>

	<main class="lobby-root">
		<div class="lobby-grid">
			<aside class="lobby-brand">
				<span class="lobby-eyebrow">{$t('game.roomCode')}</span>
				<h1 class="lobby-code">{code}</h1>
				<div class="lobby-suits" aria-hidden="true">
					<Spade size={20} class="suit-blue" />
					<Heart size={20} class="suit-red" />
					<Diamond size={20} class="suit-blue" />
					<Club size={20} class="suit-red" />
				</div>
				<button type="button" onclick={copyShareLink} class="lobby-share-btn">
					{#key codeCopied}
						<span class="inline-block" in:fade={{ duration: 200 }}>
							{codeCopied ? $t('game.linkCopied') : $t('game.copyLink')}
						</span>
					{/key}
				</button>
			</aside>

			<section class="lobby-panel">
				<div class="lobby-panel-head">
					<span class="lobby-tag">{$t('game.players', { n: lobbyPlayers.length })}</span>
					<div class="lobby-title-row">
						<h2 class="lobby-title">
							{gameMeta ? $t(`${gameMeta.id}.name`) : '—'}
						</h2>
						{#if gameMeta}
							<RulesDrawer gameId={gameMeta.id} />
						{/if}
					</div>
				</div>

				<ul class="lobby-roster">
					{#each lobbyPlayers as player, i}
						<li class="lobby-player {player.id === myPlayerId ? 'lobby-player--me' : ''}">
							<span class="player-icon {i === 0 ? 'player-icon--host' : ''}">
								{i === 0 ? '★' : '·'}
							</span>
							<span class="player-name">{player.name}</span>
							{#if player.id === myPlayerId}
								<span class="player-you">{$t('common.you')}</span>
							{:else if isHost}
								<button
									type="button"
									onclick={() => (kickTarget = player)}
									class="player-kick"
									aria-label={$t('game.kickPlayer', { name: player.name })}
								>
									<X size={14} />
								</button>
							{/if}
						</li>
					{/each}
				</ul>

				{#if gameDef?.optionsSchema?.length || isHost}
					<Dialog.Root>
						<Dialog.Trigger
							class="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-4 py-3 text-sm text-foreground transition-colors hover:border-primary"
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
									{#if gameDef?.optionsSchema?.length}
										<GameOptionsPanel
											schema={gameDef.optionsSchema}
											options={lobbyOptions}
											{isHost}
											onChange={updateOption}
										/>
									{/if}
									<!-- Per-turn timer (global, host-only) -->
									<div class="mt-4 flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 {isHost ? '' : 'opacity-40'}">
										<div class="flex flex-col gap-0.5">
											<span class="text-sm text-foreground">{$t('timer.label')}</span>
											<span class="text-xs text-muted-foreground">{$t('timer.desc')}</span>
										</div>
										<select
											disabled={!isHost}
											value={(lobbyOptions.timerSeconds as number) ?? 0}
											onchange={(e) => updateOption('timerSeconds', Number(e.currentTarget.value))}
											class="ml-4 shrink-0 rounded-md border border-border bg-secondary px-2 py-1 text-sm text-foreground"
										>
											<option value={0}>{$t('timer.off')}</option>
											<option value={15}>{$t('timer.seconds', { n: 15 })}</option>
											<option value={30}>{$t('timer.seconds', { n: 30 })}</option>
											<option value={60}>{$t('timer.seconds', { n: 60 })}</option>
										</select>
									</div>
								</div>
							</Dialog.Content>
						</Dialog.Portal>
					</Dialog.Root>
				{/if}

				{#if gameDiceSlug}
					<DicePackPicker diceSlug={gameDiceSlug} />
				{:else}
					<DeckPackPicker {deckSlug} />
				{/if}

				{#if isHost}
					{@const notEnoughPlayers = !!gameMeta && lobbyPlayers.length < gameMeta.minPlayers}
					{@const optionsInvalid = !notEnoughPlayers && gameDef?.canStart != null && !gameDef.canStart(lobbyOptions, lobbyPlayers.length)}
					{#if notEnoughPlayers}
						<p class="lobby-hint">{$t('game.minPlayersRequired', { n: gameMeta.minPlayers })}</p>
					{:else if optionsInvalid}
						<p class="lobby-hint">{$t('game.optionsInvalid')}</p>
					{/if}
					<Button
						onclick={startGame}
						disabled={!gameMeta || notEnoughPlayers || optionsInvalid}
						class="w-full"
					>
						{$t('game.start')}
					</Button>
				{:else}
					<p class="lobby-waiting">{$t('game.waitingStart')}</p>
					<Button onclick={() => goto('/')} variant="outline" class="w-full">
						{$t('game.leaveGame')}
					</Button>
				{/if}
			</section>
		</div>
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
		{isSpectator}
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

{:else if gameState.activeGameId === 'purple'}
	<PurpleView
		state={gameState as PurpleState}
		{myPlayerId}
		players={enrichedPlayers}
		{validActions}
		onAction={submitAction}
		{deckSlug}
	/>
{:else if gameState.activeGameId === 'werewolf'}
	<WerewolfView
		state={gameState as WerewolfState}
		{myPlayerId}
		players={enrichedPlayers}
		{validActions}
		onAction={submitAction}
		{deckSlug}
	/>
{:else if gameState.activeGameId === 'yams'}
	<YamsView
		state={gameState}
		{myPlayerId}
		players={enrichedPlayers}
		{validActions}
		onAction={submitAction}
	/>
{:else if gameState.activeGameId === 'blackjack'}
	<BlackjackView
		state={gameState}
		{myPlayerId}
		players={enrichedPlayers}
		{validActions}
		onAction={submitAction}
		{isSpectator}
		{deckSlug}
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

<!-- ── Game over overlay ─────────────────────────────────────── -->
{#if gameState?.phase === 'gameover'}
	{@const winner = games[gameState.activeGameId]?.getWinner(gameState)}
	{@const _notEnough = !!gameMeta && lobbyPlayers.length < gameMeta.minPlayers}
	{@const _optionsBad = !_notEnough && gameDef?.canStart != null && !gameDef.canStart(lobbyOptions, lobbyPlayers.length)}
	<GameOverOverlay
		gameState={gameState}
		gameDef={gameDef}
		gameName={gameMeta ? $t(`${gameMeta.id}.name`) : 'Delcard'}
		players={enrichedPlayers}
		winnerId={winner}
		{isHost}
		canRematch={!!gameMeta && !_notEnough && !_optionsBad}
		onRematch={() => get(activeHost)?.startGame()}
	/>
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

{#if gameState && !isSpectator}
	<ChatPanel {isHost} onSend={sendChat} />
{/if}

<style>
	/* ── Lobby atmospheric background ── */
	.lobby-bg-club {
		position: fixed;
		width: min(70vw, 60vh);
		height: min(70vw, 60vh);
		color: white;
		opacity: 0.025;
		pointer-events: none;
		user-select: none;
		right: -8%;
		top: 50%;
		transform: translateY(-50%);
		z-index: 0;
	}

	.lobby-bg-glow {
		position: fixed;
		inset: 0;
		background: radial-gradient(ellipse 60% 50% at 20% 50%, oklch(0.2 0.04 264 / 0.45), transparent);
		pointer-events: none;
		z-index: 0;
	}

	/* ── Root ── */
	.lobby-root {
		position: relative;
		z-index: 1;
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
	}

	/* ── Two-column grid ── */
	.lobby-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2.5rem;
		width: 100%;
		max-width: 860px;
		min-width: 0;
	}

	@media (min-width: 768px) {
		.lobby-grid {
			grid-template-columns: 1fr 1fr;
			gap: 5rem;
			align-items: center;
		}
	}

	/* ── Brand side (left) ── */
	.lobby-brand {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		animation: lobby-fade-up 0.6s ease both;
		animation-delay: 0.05s;
	}

	@media (max-width: 767px) {
		.lobby-brand {
			text-align: center;
			align-items: center;
		}
	}

	.lobby-eyebrow {
		display: inline-flex;
		align-items: center;
		font-size: 0.625rem;
		font-weight: 700;
		letter-spacing: 0.3em;
		color: var(--primary);
		border: 1px solid oklch(0.37 0.222 264 / 0.4);
		background: oklch(0.37 0.222 264 / 0.08);
		padding: 0.25rem 0.75rem;
		border-radius: 999px;
		width: fit-content;
	}

	.lobby-code {
		font-family: var(--font-heading);
		font-size: clamp(4rem, 16vw, 8rem);
		line-height: 1;
		letter-spacing: 0.12em;
		color: var(--foreground);
		margin: 0;
		text-shadow: 0 0 120px rgba(0, 47, 167, 0.45);
	}

	.lobby-suits {
		display: flex;
		gap: 1rem;
		align-items: center;
	}


	.lobby-share-btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 5px 12px;
		border-radius: 99px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		color: rgba(255, 255, 255, 0.45);
		background: transparent;
		cursor: pointer;
		transition: all 180ms ease;
		width: fit-content;
	}

	.lobby-share-btn:hover {
		border-color: rgba(255, 255, 255, 0.32);
		color: rgba(255, 255, 255, 0.82);
		background: rgba(255, 255, 255, 0.06);
	}

	/* ── Panel (right) ── */
	.lobby-panel {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 2rem;
		min-width: 0;
		animation: lobby-fade-up 0.6s ease both;
		animation-delay: 0.15s;
		box-shadow:
			0 0 0 1px oklch(0.37 0.222 264 / 0.08),
			0 24px 48px oklch(0 0 0 / 0.3);
		position: relative;
		overflow: hidden;
	}

	.lobby-panel::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 40%;
		background: radial-gradient(ellipse at 50% 0%, rgba(0, 47, 167, 0.18) 0%, transparent 70%);
		pointer-events: none;
	}

	.lobby-panel-head {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		position: relative;
	}

	.lobby-tag {
		font-size: 0.625rem;
		font-weight: 700;
		letter-spacing: 0.35em;
		text-transform: uppercase;
		color: var(--primary);
		margin-bottom: 0.25rem;
	}

	.lobby-title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.lobby-title {
		font-family: var(--font-heading);
		font-size: 2rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--foreground);
		margin: 0;
		line-height: 1;
	}

	/* ── Player roster ── */
	.lobby-roster {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.lobby-player {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.65rem 0.9rem;
		border-radius: 0.5rem;
		border: 1px solid transparent;
		background: oklch(1 0 0 / 0.02);
		transition: border-color 150ms ease;
	}

	.lobby-player--me {
		border-color: rgba(0, 47, 167, 0.3);
		background: rgba(0, 47, 167, 0.06);
	}

	.player-icon {
		font-size: 0.8rem;
		color: var(--muted-foreground);
		width: 1rem;
		text-align: center;
		flex-shrink: 0;
	}

	.player-icon--host {
		color: var(--accent);
	}

	.player-name {
		flex: 1;
		font-family: var(--font-heading);
		font-size: 1rem;
		letter-spacing: 0.03em;
		color: var(--foreground);
	}

	.player-you {
		font-size: 0.65rem;
		letter-spacing: 0.08em;
		color: var(--muted-foreground);
	}

	.player-kick {
		color: var(--muted-foreground);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		transition: color 150ms ease;
	}

	.player-kick:hover {
		color: var(--destructive);
	}

	/* ── Status hints ── */
	.lobby-hint {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		margin: 0;
		text-align: center;
	}

	.lobby-waiting {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		margin: 0;
		text-align: center;
	}

	/* ── Entrance animations ── */
	@keyframes lobby-fade-up {
		from {
			opacity: 0;
			transform: translateY(1.25rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
