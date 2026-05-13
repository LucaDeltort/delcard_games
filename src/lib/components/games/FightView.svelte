<script lang="ts">
import { ChevronDown, ChevronUp, MessageSquare, Settings as SettingsIcon, X } from 'lucide-svelte'
import { onDestroy, onMount, untrack } from 'svelte'
import { fade } from 'svelte/transition'
import CardZone from '$lib/components/CardZone.svelte'
import PlayingCard from '$lib/components/PlayingCard.svelte'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
import { Button } from '$lib/components/ui/button'
import type { GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'
import type { FightState, HistoryEntry } from '$lib/games/fight'
import { t } from '$lib/i18n'
import type { LobbyPlayer } from '$lib/network/messages'
import { settings, settingsOpen } from '$lib/stores/settings'

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

const gs = $derived(gameState as unknown as FightState)

function playerName(id: string) {
	return players.find((p) => p.id === id)?.name ?? id
}

const actingPlayerId = $derived(gs.pendingBonusAction ?? gs.turnPlayerId)
const isMyTurn = $derived(validActions.length > 0)
const isBonusTurn = $derived(gs.pendingBonusAction === myPlayerId)
const iAmAlive = $derived(gs.activePlayers.includes(myPlayerId))

const opponents = $derived(gs.players.filter((p) => p !== myPlayerId))

const chargeAction = $derived(validActions.find((a) => a.type === 'CHARGE') ?? null)
const attackActions = $derived(validActions.filter((a) => a.type === 'ATTACK'))
const shieldActions = $derived(validActions.filter((a) => a.type === 'CHANGE_SHIELD'))

function targetId(action: Action): string {
	return (action.payload as { targetId: string }).targetId
}

let attackOpen = $state(false)
let shieldOpen = $state(false)
let historyOpen = $state(false)

type ActionFlash = Extract<HistoryEntry, { type: 'ATTACK' | 'CHANGE_SHIELD' | 'CHARGE' }>

const CARD_DELAY = 1000
const HP_DISPLAY = 4000
const STARTER_DISPLAY = 2500
const FLASH_DURATION = 2500

let actionFlash = $state<ActionFlash | null>(null)
let _flashTimeout: ReturnType<typeof setTimeout> | null = null
let _prevHistLen = untrack(() => gs.history.length)

$effect(() => {
	const len = gs.history.length
	if (len === _prevHistLen) return
	const newEntries = gs.history.slice(_prevHistLen)
	_prevHistLen = len
	const entry = newEntries.find(
		(e) => e.type === 'ATTACK' || e.type === 'CHANGE_SHIELD' || e.type === 'CHARGE'
	)
	if (!entry) return
	if (_flashTimeout) clearTimeout(_flashTimeout)
	actionFlash = entry as ActionFlash
	_flashTimeout = setTimeout(() => {
		actionFlash = null
	}, FLASH_DURATION)
})

const _shouldIntro = untrack(() => {
	const s = gameState as unknown as FightState
	return s.history.length === 0 && !!s.setupCards
})
let introPhase = $state<'dealing' | 'hp' | 'starter' | 'done'>(_shouldIntro ? 'dealing' : 'done')
let dealStep = $state(0)
const _introTimeouts: ReturnType<typeof setTimeout>[] = []

function skipIntro() {
	_introTimeouts.forEach(clearTimeout)
	_introTimeouts.length = 0
	introPhase = 'done'
}

onMount(() => {
	if (introPhase !== 'dealing') return
	if (
		typeof window !== 'undefined' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	) {
		skipIntro()
		return
	}
	const total = gs.players.length * 3
	let t = CARD_DELAY
	for (let i = 1; i <= total; i++) {
		const step = i
		_introTimeouts.push(
			setTimeout(() => {
				dealStep = step
			}, t)
		)
		t += CARD_DELAY
	}
	_introTimeouts.push(
		setTimeout(() => {
			introPhase = 'hp'
		}, t)
	)
	t += HP_DISPLAY
	_introTimeouts.push(
		setTimeout(() => {
			introPhase = 'starter'
		}, t)
	)
	t += STARTER_DISPLAY
	_introTimeouts.push(
		setTimeout(() => {
			introPhase = 'done'
		}, t)
	)
})

onDestroy(() => {
	_introTimeouts.forEach(clearTimeout)
	if (_flashTimeout) clearTimeout(_flashTimeout)
})
</script>

{#if introPhase !== 'done'}
<div class="relative flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-8">
	<button
		onclick={skipIntro}
		class="absolute right-4 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
		style="top: calc(1rem + env(safe-area-inset-top))"
	>
		{$t('fight.skipIntro')}
	</button>
	<div class="text-center">
		<p class="text-xs tracking-widest text-muted-foreground uppercase">{$t('fight.name')}</p>
		<h2 class="mt-1 text-xl font-semibold text-foreground">
			{#if introPhase === 'dealing'}{$t('fight.introDeal')}
			{:else if introPhase === 'hp'}{$t('fight.introHp')}
			{:else}{$t('fight.introStarter')}{/if}
		</h2>
	</div>
	{#if introPhase !== 'starter'}
		<div class="flex flex-wrap justify-center gap-3">
			{#each gs.players as pid, pIdx (pid)}
				<div
					class="flex flex-col items-center gap-2 rounded-lg border px-3 py-3 {introPhase ===
						'hp' && pid === gs.turnPlayerId
						? 'border-accent bg-accent/5'
						: 'border-border bg-card'}"
				>
					<p class="text-xs font-medium text-foreground">{playerName(pid)}</p>
					<div class="flex gap-1">
						{#each [0, 1, 2] as cIdx}
							{@const revealed = dealStep >= pIdx * 3 + cIdx + 1}
							<div
								class="transition-opacity duration-500 {revealed ? 'opacity-100' : 'opacity-0'}"
							>
								<PlayingCard card={gs.setupCards?.[pid]?.[cIdx] ?? null} size="sm" />
							</div>
						{/each}
					</div>
					{#if introPhase === 'hp'}
						<div class="flex w-full items-center justify-between px-0.5 text-xs">
							<span class="text-muted-foreground">{$t('fight.shield')}</span>
							<span class="font-semibold text-accent">{$t('fight.hp', { n: gs.hp[pid] })}</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-6xl font-bold text-foreground">{playerName(gs.turnPlayerId)}</p>
	{/if}
</div>
{:else}
<div class="flex min-h-screen flex-col">
	<!-- Header -->
	<header
		class="flex items-center justify-between border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground"
	>
		<span class="font-mono">{$t('fight.name')}</span>
		<span>
			{#if isBonusTurn}
				<span class="text-accent">{$t('fight.bonusKill')}</span>
			{:else}
				{$t('common.turnOf', { name: playerName(actingPlayerId) })}
			{/if}
		</span>
		<div class="flex items-center">
			<button
				onclick={() => ($settingsOpen = true)}
				class="flex items-center rounded p-2 text-muted-foreground transition-colors hover:text-foreground"
				aria-label={$t('settings.title')}
			>
				<SettingsIcon size={16} />
			</button>
			<RulesDrawer gameId="fight" size={16} />
			<button
				onclick={() => (historyOpen = !historyOpen)}
				class="flex items-center gap-1 rounded px-2 py-2 transition-colors hover:text-foreground {historyOpen
					? 'text-foreground'
					: ''}"
			>
				<MessageSquare size={16} />
				{$t('fight.inPlay', { n: gs.activePlayers.length })}
			</button>
		</div>
	</header>

	<!-- Opponents -->
	<div class="flex gap-3 overflow-x-auto p-4">
		{#each opponents as pid (pid)}
			{@const eliminated = !gs.activePlayers.includes(pid)}
			{@const isActing = pid === actingPlayerId}
			{@const hasCharge = (gs.zones[`charge_${pid}`]?.cards.length ?? 0) > 0}
			<div
				class="flex min-w-27.5 flex-col items-center gap-2 rounded-lg border px-3 py-3 transition-colors
					{eliminated
					? 'border-border'
					: isActing
						? 'border-accent bg-accent/5'
						: 'border-border bg-card'}"
			>
				<p
					class="text-xs font-medium {eliminated
						? 'text-muted-foreground line-through'
						: 'text-foreground'}"
				>
					{playerName(pid)}
				</p>
				<p class="text-sm {eliminated ? 'text-muted-foreground' : 'text-foreground'}">
					{eliminated ? $t('fight.eliminated') : $t('fight.hp', { n: gs.hp[pid] })}
				</p>
				<div class="flex gap-2">
					<CardZone card={gs.zones[`shield_${pid}`]?.cards[0] ?? null} size="sm" label={$t('fight.shield')} />
					<CardZone card={hasCharge ? gs.zones[`charge_${pid}`].cards[0] : null} count={gs.zones[`charge_${pid}`]?.cards.length > 1 ? gs.zones[`charge_${pid}`].cards.length : undefined} size="sm" label={$t('fight.charge')} />
				</div>
			</div>
		{/each}
	</div>

	<!-- Center: draw + discard -->
	<div class="flex items-center justify-center gap-10 py-2">
		<CardZone card={gs.zones.draw?.cards[0] ?? null} back label={$t('fight.draw')} count={gs.zones.draw?.cards.length ?? 0} />
		<CardZone card={gs.zones.discard?.cards.at(-1) ?? null} label={$t('fight.discard')} />
	</div>

	<!-- Me -->
	<div class="flex flex-col items-center gap-3 border-t border-border bg-card/50 px-4 py-4">
		<p class="text-sm text-foreground">
			{playerName(myPlayerId)}
			<span class="text-muted-foreground">({$t('common.you')})</span>
			{#if !iAmAlive}
				<span class="ml-2 text-xs text-muted-foreground">{$t('fight.eliminated')}</span>
			{:else}
				<span class="ml-2 text-sm text-accent">{$t('fight.hp', { n: gs.hp[myPlayerId] })}</span>
			{/if}
		</p>
		<div class="flex gap-4">
			<CardZone card={gs.zones[`shield_${myPlayerId}`]?.cards[0] ?? null} label={$t('fight.shield')} />
			<CardZone card={gs.zones[`charge_${myPlayerId}`]?.cards[0] ?? null} count={(gs.zones[`charge_${myPlayerId}`]?.cards.length ?? 0) > 1 ? gs.zones[`charge_${myPlayerId}`]?.cards.length : undefined} label={$t('fight.charge')} />
		</div>
	</div>

	<!-- Actions -->
	<footer class="mt-auto border-t border-border bg-card px-4 py-4">
		{#if !iAmAlive}
			<p class="text-sm text-muted-foreground">{$t('fight.youEliminated')}</p>
		{:else if isMyTurn}
			<div class="flex flex-col gap-3">
				{#if isBonusTurn}
					<p class="text-xs tracking-widest text-accent uppercase">{$t('fight.bonusAction')}</p>
				{/if}
				<div class="flex flex-col gap-2">
					{#if chargeAction}
						<Button
							onclick={() => onAction(chargeAction)}
							variant="outline"
							class="h-auto w-full py-3"
						>
							{$t('fight.chargeAction')}
						</Button>
					{/if}
					{#if attackActions.length > 0}
						<div class="relative w-full">
							{#if attackOpen}
								<div
									class="absolute right-0 bottom-full left-0 mb-2 flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg"
								>
									{#each attackActions as action (targetId(action))}
										<button
											onclick={() => {
												onAction(action);
												attackOpen = false;
											}}
											class="px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-accent/10"
										>
											{playerName(targetId(action))}
										</button>
									{/each}
								</div>
							{/if}
							<Button
								onclick={() => {
									attackOpen = !attackOpen;
									shieldOpen = false;
								}}
								class="h-auto w-full py-3"
							>
								<span class="flex-1 text-left">{$t('fight.attackBtn')}</span>
								{#if attackOpen}<ChevronUp size={16} />{:else}<ChevronDown size={16} />{/if}
							</Button>
						</div>
					{/if}
					{#if shieldActions.length > 0}
						<div class="relative w-full">
							{#if shieldOpen}
								<div
									class="absolute right-0 bottom-full left-0 mb-2 flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg"
								>
									{#each shieldActions as action (targetId(action))}
										<button
											onclick={() => {
												onAction(action);
												shieldOpen = false;
											}}
											class="px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-accent/10"
										>
											{playerName(targetId(action))}{#if targetId(action) === myPlayerId}
												<span class="ml-1 text-muted-foreground">({$t('common.you')})</span>{/if}
										</button>
									{/each}
								</div>
							{/if}
							<Button
								onclick={() => {
									shieldOpen = !shieldOpen;
									attackOpen = false;
								}}
								variant="outline"
								class="h-auto w-full py-3"
							>
								<span class="flex-1 text-left">{$t('fight.shieldBtn')}</span>
								{#if shieldOpen}<ChevronUp size={16} />{:else}<ChevronDown size={16} />{/if}
							</Button>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">
				{$t('common.waitingFor', { name: playerName(actingPlayerId) })}
			</p>
		{/if}
	</footer>
</div>

{#if historyOpen}
	<!-- Backdrop -->
	<button
		class="fixed inset-0 z-[100] bg-black/20"
		onclick={() => (historyOpen = false)}
		aria-label="Close history"
	></button>
	<!-- Drawer -->
	<div
		class="fixed inset-y-0 right-0 z-[110] flex w-72 max-w-[85vw] flex-col border-l border-border bg-card shadow-xl"
	>
		<div class="flex items-center justify-between border-b border-border px-4 py-2">
			<span class="text-xs tracking-widest text-muted-foreground uppercase"
				>{$t('fight.historyTitle')}</span
			>
			<button
				onclick={() => (historyOpen = false)}
				class="p-2 text-muted-foreground transition-colors hover:text-foreground"
			>
				<X size={16} />
			</button>
		</div>
		<div class="flex-1 overflow-y-auto">
			{#if gs.history.length === 0}
				<p class="px-4 py-3 text-xs text-muted-foreground" aria-hidden="true">—</p>
			{:else}
				{#each [...gs.history].reverse() as entry, i (i)}
					<p
						class="border-b border-border/30 px-4 py-2 text-xs text-muted-foreground last:border-0"
					>
						<span class="mr-1.5 text-muted-foreground"
							>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: $settings.timeFormat === '12' })}</span
						>
						{#if entry.type === 'CHARGE'}
							{$t('fight.historyCharge', { name: playerName(entry.actorId) })}
						{:else if entry.type === 'ATTACK'}
							{entry.damage > 0
								? $t('fight.historyAttack', {
										name: playerName(entry.actorId),
										target: playerName(entry.targetId),
										damage: entry.damage
									})
								: $t('fight.historyBlocked', {
										name: playerName(entry.actorId),
										target: playerName(entry.targetId)
									})}
						{:else if entry.type === 'CHANGE_SHIELD'}
							{$t('fight.historyShield', {
								name: playerName(entry.actorId),
								target: playerName(entry.targetId)
							})}
						{:else if entry.type === 'ELIMINATED'}
							{entry.killedBy
								? $t('fight.historyEliminated', {
										name: playerName(entry.targetId),
										killer: playerName(entry.killedBy)
									})
								: $t('fight.historyEliminatedDragon', {
										name: playerName(entry.targetId)
									})}
						{:else if entry.type === 'DRAGON'}
							{$t('fight.historyDragon')}
						{/if}
					</p>
				{/each}
			{/if}
		</div>
	</div>
{/if}

{#if actionFlash !== null}
	<div
		class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
		transition:fade={{ duration: 150 }}
	>
		<div class="rounded-xl border border-border bg-card/95 px-8 py-6 text-center shadow-2xl backdrop-blur-sm">
			{#if actionFlash.type === 'ATTACK'}
				<p class="mb-4 text-sm font-medium text-foreground">
					{$t('fight.flashAttack', {
						name: playerName(actionFlash.actorId),
						target: playerName(actionFlash.targetId)
					})}
				</p>
				<div class="flex items-center justify-center gap-2">
					<PlayingCard card={actionFlash.attackCard} size="md" />
					{#each actionFlash.chargeCards as cc}
						<span class="text-sm text-muted-foreground">+</span>
						<PlayingCard card={cc} size="md" />
					{/each}
				</div>
				<p class="mt-4 text-sm font-semibold {actionFlash.damage > 0 ? 'text-destructive' : 'text-muted-foreground'}">
					{actionFlash.damage > 0
						? $t('fight.flashDamage', { n: actionFlash.damage })
						: $t('fight.flashBlocked')}
				</p>
			{:else if actionFlash.type === 'CHANGE_SHIELD'}
				<p class="mb-4 text-sm font-medium text-foreground">
					{actionFlash.actorId === actionFlash.targetId
						? $t('fight.flashShieldSelf', { name: playerName(actionFlash.actorId) })
						: $t('fight.flashShield', {
								name: playerName(actionFlash.actorId),
								target: playerName(actionFlash.targetId)
							})}
				</p>
				<div class="flex items-center justify-center gap-3">
					<PlayingCard card={actionFlash.oldShield} size="md" />
					<span class="text-muted-foreground">→</span>
					<PlayingCard card={actionFlash.newShield} size="md" />
				</div>
			{:else if actionFlash.type === 'CHARGE'}
				<p class="mb-4 text-sm font-medium text-foreground">
					{$t('fight.flashCharge', { name: playerName(actionFlash.actorId) })}
				</p>
				<div class="flex justify-center">
					<PlayingCard card={actionFlash.chargedCard} size="md" />
				</div>
			{/if}
		</div>
	</div>
{/if}
{/if}
