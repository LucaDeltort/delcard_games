<script lang="ts">
import { Settings as SettingsIcon } from 'lucide-svelte'
import { untrack } from 'svelte'
import { fade } from 'svelte/transition'
import PlayerSlot from '$lib/components/PlayerSlot.svelte'
import PlayingCard from '$lib/components/PlayingCard.svelte'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
import { Button } from '$lib/components/ui/button'
import type { Card, GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'
import type { PresidentsState } from '$lib/games/presidents'
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
const canSelectCard = $derived(isMyTurn || (isExchanging && isPresident))

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

const isExchanging = $derived(gs.phase === 'exchanging')
const isPresident = $derived(gs.pendingExchange?.president === me)

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
</script>

<div class="flex min-h-screen flex-col">
	<header
		class="flex items-center justify-between border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground"
	>
		<span class="font-mono">{$t('presidents.name')}</span>
		<div class="flex items-center">
			<button
				onclick={() => ($settingsOpen = true)}
				class="flex items-center rounded p-2 text-muted-foreground transition-colors hover:text-foreground"
				aria-label="Settings"
			>
				<SettingsIcon size={16} />
			</button>
			<RulesDrawer gameId="presidents" size={16} />
		</div>
	</header>

	{#if gs.phase === 'gameover'}
		<!-- Results: full-screen centered -->
		<div class="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-6">
			<p class="text-sm font-semibold text-accent">{$t('game.over')}</p>
			<ol class="flex w-full max-w-xs flex-col gap-1.5">
				{#each gs.finishOrder as pid, i}
					<li class="flex items-center gap-3 rounded-lg border px-3 py-2 {pid === me ? 'border-accent/50 bg-accent/5' : 'border-border bg-card'}">
						<span class="w-5 text-center font-mono text-xs text-muted-foreground">#{i + 1}</span>
						<span class="flex-1 text-sm {pid === me ? 'font-semibold text-accent' : 'font-medium'}">
							{playerName(pid)}{pid === me ? ` (${$t('common.you')})` : ''}
						</span>
						<span class="text-xs text-muted-foreground">{getRoleLabel(i, gs.finishOrder.length)}</span>
					</li>
				{/each}
			</ol>
		</div>
	{:else}
	<div class="flex flex-1 flex-col gap-4 px-4 py-6">
		<!-- Opponents -->
		<div class="flex flex-wrap justify-center gap-6">
			{#each opponents as pid}
				<div class="flex flex-col items-center gap-2">
					<PlayerSlot
						name={playerName(pid)}
						dimmed={isFinished(pid)}
					/>
					<div class="flex items-center gap-0.5">
						{#each { length: Math.min(handCount(pid), 5) } as _}
							<PlayingCard card={null} back size="sm" />
						{/each}
						{#if handCount(pid) > 5}
							<span class="ml-1 text-xs text-muted-foreground">+{handCount(pid) - 5}</span>
						{/if}
						{#if handCount(pid) === 0}
							<span class="text-xs text-muted-foreground">{$t('game.empty')}</span>
						{/if}
					</div>
					{#if isFinished(pid)}
						<span class="text-xs text-muted-foreground">{$t('presidents.finished')}</span>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Pile -->
		<div class="flex flex-col items-center gap-2">
			<span class="text-xs text-muted-foreground">{$t('presidents.pile')}</span>
			<div class="flex items-center gap-1">
				{#if pileCards.length > 0}
					{#each pileCards as card}
						<PlayingCard {card} size="lg" />
					{/each}
					{#if comboLabel}
						<span class="ml-2 text-sm text-muted-foreground">({comboLabel})</span>
					{/if}
				{:else}
					<div class="flex h-[134px] w-[96px] items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
						{$t('game.empty')}
					</div>
				{/if}
			</div>
		</div>

		<!-- Status -->
		<div class="text-center text-sm">
			{#if isExchanging}
				<span class={isPresident ? 'font-medium text-accent' : 'text-muted-foreground'}>
					{isPresident ? $t('presidents.chooseToGive') : $t('presidents.waitingExchange')}
				</span>
			{:else if isMyTurn && lockedFace}
				<span class="font-medium text-accent">
					{$t('presidents.lockedPlay', { face: lockedFace })}
				</span>
			{:else if isMyTurn}
				<span class="font-medium text-accent">
					{gs.lastPlay === null ? $t('presidents.newTrick') : $t('presidents.yourTurn')}
				</span>
			{:else}
				<span class="text-muted-foreground">
					{$t('common.waitingFor', { name: playerName(gs.turnPlayerId) })}
				</span>
			{/if}
		</div>

		<!-- My hand -->
		<div class="mt-auto">
			<div class="mb-2 flex items-center justify-between">
				<PlayerSlot name={playerName(me)} you />
				<span class="text-xs text-muted-foreground">
					{$t('presidents.cards', { n: myHand.length })}
				</span>
			</div>
			<div class="flex flex-wrap justify-center gap-2">
				{#each myHandSorted as card}
					{@const selected = selectedIds.has(card.id)}
					<button
						onclick={() => toggleCard(card.id)}
						class="rounded-lg transition-transform focus:outline-none {selected ? '-translate-y-3 ring-2 ring-accent' : ''} {canSelectCard ? 'cursor-pointer hover:-translate-y-1' : 'cursor-default'}"
					>
						<PlayingCard {card} size="md" />
					</button>
				{/each}
			</div>

			<!-- Actions -->
			{#if isExchanging && isPresident}
				<div class="mt-4 flex justify-center gap-3">
					<Button onclick={handleGive} disabled={!giveAction} size="lg">
						{$t('presidents.giveCards')}
					</Button>
				</div>
			{:else if isMyTurn}
				<div class="mt-4 flex justify-center gap-3">
					<Button onclick={handlePlay} disabled={!playAction} size="lg">
						{$t('presidents.play')}
					</Button>
					{#if passAction}
						<Button onclick={handlePass} variant="outline" size="lg">
							{gs.leaderCanPlay ? $t('presidents.endTrick') : $t('presidents.pass')}
						</Button>
					{/if}
				</div>
			{/if}
		</div>
	</div>
	{/if}
</div>

{#if exchangeFlash !== null}
	<div
		class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
		transition:fade={{ duration: 150 }}
	>
		<div class="rounded-xl border border-border bg-card/95 px-8 py-6 text-center shadow-2xl backdrop-blur-sm">
			<p class="mb-4 text-sm font-medium text-foreground">{exchangeFlashTitle}</p>
			<div class="flex items-center justify-center gap-2">
				{#each exchangeFlash as card}
					<PlayingCard {card} size="md" />
				{/each}
			</div>
		</div>
	</div>
{/if}
