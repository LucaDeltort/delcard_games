<script lang="ts">
import { Settings as SettingsIcon } from 'lucide-svelte'
import { quintOut } from 'svelte/easing'
import { crossfade, fade } from 'svelte/transition'
import PlayerSlot from '$lib/components/PlayerSlot.svelte'
import PlayingCard from '$lib/components/PlayingCard.svelte'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
import { Button } from '$lib/components/ui/button'
import type { GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'
import type { PurpleState } from '$lib/games/purple'
import { t } from '$lib/i18n'
import type { LobbyPlayer } from '$lib/network/messages'
import { settingsOpen } from '$lib/stores/settings'

const [send, receive] = crossfade({
	duration: 500,
	easing: quintOut
})

let {
	state,
	myPlayerId,
	players,
	validActions,
	onAction,
	deckSlug
}: {
	state: GameStateGeneric & PurpleState
	myPlayerId: string
	players: LobbyPlayer[]
	validActions: Action[]
	onAction: (action: Action) => void
	deckSlug: string
} = $props()

const s = $derived(state as PurpleState)
const isMyTurn = $derived(s.turnPlayerId === myPlayerId)

const turnPlayer = $derived(players.find((p) => p.id === s.turnPlayerId))
const playingBankCards = $derived(s.zones['playingBank'].cards)
const turnBets = $derived(s.turnBets)
const canStop = $derived(validActions.some((a) => a.type === 'STOP'))
const isFailing = $derived(s.phase === 'failing')

$effect(() => {
	if (isFailing && isMyTurn) {
		const timeout = setTimeout(() => {
			onAction({ type: 'FINALIZE_FAILURE', playerId: myPlayerId })
		}, 500)
		return () => clearTimeout(timeout)
	}
})

function getBankedScore(pid: string) {
	return state.scores[pid] ?? 0
}

function getCurrentPenaltyCount(pid: string) {
	return state.zones[`penaltyBank_${pid}`]?.cards.length ?? 0
}

function getCardStyle(id: string) {
	let hash = 0
	for (let i = 0; i < id.length; i++) {
		hash = id.charCodeAt(i) + ((hash << 5) - hash)
	}
	const rotation = (hash % 15) - 7
	const offsetX = (hash % 8) - 4
	const offsetY = (hash % 8) - 4
	return `transform: rotate(${rotation}deg); left: ${offsetX}px; top: ${offsetY}px;`
}

const otherPlayers = $derived(state.players.filter((id) => id !== myPlayerId))
</script>

<div class="flex min-h-screen flex-col bg-background relative overflow-hidden">
	{#if turnBets >= 3}
		{#key turnBets}
			<div class="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
				<div class="h-20 w-20 rounded-full bg-white animate-grow"></div>
			</div>
		{/key}
	{/if}

	<header class="relative z-10 flex items-center justify-between border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground">
		<span class="font-mono uppercase tracking-widest">{$t('purple.name')}</span>
		<div class="flex items-center">
			<button
				onclick={() => ($settingsOpen = true)}
				class="flex items-center rounded p-2 text-muted-foreground transition-colors hover:text-foreground"
				aria-label={$t('settings.title')}
			>
				<SettingsIcon size={16} />
			</button>
			<RulesDrawer gameId="purple" size={16} />
		</div>
	</header>

	<main class="relative z-10 flex flex-1 flex-col items-center justify-between p-6">
		<div class="flex w-full flex-wrap justify-center gap-4">
	{#each otherPlayers as pid}
				<div class="flex flex-col items-center gap-2">
					<PlayerSlot name={players.find(p => p.id === pid)?.name ?? pid} dimmed={s.turnPlayerId !== pid} />
					<div class="flex flex-col items-center gap-1">
						<div class="relative h-8 w-6">
					{#each s.zones[`penaltyBank_${pid}`].cards.slice(0, 3) as card, i}
						<div 
							class="absolute transition-all duration-300" 
							style="transform: rotate({(i-1)*5}deg); left: {i*2}px;"
						>
							<PlayingCard {card} size="sm" {deckSlug} />
						</div>
					{/each}
 
							{#if s.zones[`penaltyBank_${pid}`].cards.length > 3}
								<div class="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-destructive">+{s.zones[`penaltyBank_${pid}`].cards.length - 3}</div>
							{/if}
						</div>
						<div class="relative">
							<div class="rounded-full bg-destructive/10 px-3 py-0.5 text-xs font-bold text-destructive">
								{getBankedScore(pid)}
							</div>
							{#if s.lastScoreEvent && s.lastScoreEvent.pid === pid}
								{#key s.lastScoreEvent.timestamp}
									<div class="absolute inset-0 animate-ping-once rounded-full border-2 border-white opacity-50"></div>
								{/key}
							{/if}
						</div>
					</div>
				</div>
			{/each}

		</div>

		<div class="flex items-start gap-12 py-8">
			<!-- Deck (Left) -->
			<div class="flex flex-col items-center">
				<PlayingCard card={{ id: 'back', face: 'back', isHidden: true }} back size="md" {deckSlug} />
				<span class="mt-2 text-xs font-bold text-foreground">{s.zones['deck'].cards.length}</span>
				<span class="text-xs text-muted-foreground uppercase">{$t('purple.deck')}</span>
			</div>

			<!-- Playing Bank (Middle) -->
			<div class="flex flex-col items-center">
				<div class="relative h-[100px] w-[72px]">
					{#each playingBankCards as card (card.id)}
						<div
							class="absolute transition-all duration-300"
							style={getCardStyle(card.id)}
							in:receive={{key: card.id}}
							out:send={{key: card.id}}
						>
							<PlayingCard {card} size="md" {deckSlug} />
						</div>
					{/each}
				</div>
				<span class="mt-2 text-xs font-bold text-foreground">{playingBankCards.length}</span>
				<span class="text-xs text-muted-foreground uppercase">{$t('purple.playingBank')}</span>
			</div>

			<!-- Penalty Zone (Right) -->
			<div class="flex flex-col items-center">
				<div class="relative h-[100px] w-[72px] rounded-lg border-2 border-dashed border-red-500/50 bg-red-500/10">
					{#each s.zones[`penaltyBank_${s.turnPlayerId}`].cards as card (card.id)}
						<div
							class="absolute transition-all duration-300"
							style={getCardStyle(card.id)}
							in:receive={{key: card.id}}
						>
							<PlayingCard {card} size="md" {deckSlug} />
						</div>
					{/each}
				</div>
				<span class="mt-2 text-xs font-bold text-red-500">{getCurrentPenaltyCount(s.turnPlayerId)}</span>
				<span class="text-xs text-red-500 uppercase">Penalty</span>
			</div>
		</div>

		<p class="mt-2 text-sm font-medium text-white uppercase tracking-widest">
			{$t('purple.betsProgress', { current: turnBets, total: 3 })}
		</p>

		<!-- Bottom section: My turn / Actions -->
		<div class="flex w-full flex-col items-center gap-8">
			<div class="flex flex-col items-center gap-2">
				<PlayerSlot name={players.find(p => p.id === myPlayerId)?.name ?? myPlayerId} you dimmed={!isMyTurn} />
				<div class="relative">
					<div class="rounded-full bg-destructive px-4 py-1 text-sm font-bold text-destructive-foreground">
						{$t('purple.penaltyBank')}: {getBankedScore(myPlayerId)}
					</div>
					{#if s.lastScoreEvent && s.lastScoreEvent.pid === myPlayerId}
						{#key s.lastScoreEvent.timestamp}
							<div class="absolute inset-0 animate-ping-once rounded-full border-2 border-white opacity-50"></div>
						{/key}
					{/if}
				</div>
			</div>

			<div class="h-32 w-full max-w-md flex flex-col items-center justify-center gap-4">
				{#if isMyTurn}
					<div in:fade={{ duration: 200 }} class="flex w-full flex-col gap-3">
						<div class="grid grid-cols-3 gap-3">
							<Button onclick={() => onAction({ type: 'BET_RED', playerId: myPlayerId })} class="h-16 bg-red-600 font-bold hover:bg-red-700">{$t('purple.betRed')}</Button>
							<Button onclick={() => onAction({ type: 'BET_BLACK', playerId: myPlayerId })} class="h-16 bg-zinc-900 font-bold hover:bg-black">{$t('purple.betBlack')}</Button>
							<Button onclick={() => onAction({ type: 'BET_PURPLE', playerId: myPlayerId })} class="h-16 bg-gradient-to-br from-purple-600 to-indigo-700 font-bold hover:from-purple-700 hover:to-indigo-800">{$t('purple.betPurple')}</Button>
						</div>
						<Button variant="outline" disabled={!canStop} onclick={() => onAction({ type: 'STOP', playerId: myPlayerId })} class="h-16 w-full border-2 font-bold">{$t('purple.stop')}</Button>
					</div>
				{:else}
					<div class="flex flex-col items-center gap-4">
						<p class="animate-pulse text-sm text-muted-foreground">{$t('common.waitingFor', { name: turnPlayer?.name ?? s.turnPlayerId })}</p>
						{#if validActions.some(a => a.type === 'DECREASE_SCORE')}
							<Button 
								onclick={() => onAction({ type: 'DECREASE_SCORE', playerId: myPlayerId })}
								variant="outline"
								class="px-6 py-2 text-xs font-bold text-destructive border-destructive hover:bg-destructive/10"
							>
								{$t('purple.decreaseScore')}
							</Button>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</main>
</div>

	<style>
		.animate-grow {
			animation: grow 0.6s ease-out forwards;
		}

		@keyframes grow {

		0% {
			transform: scale(0);
			opacity: 1;
		}
		100% {
			transform: scale(8);
			opacity: 0;
		}
	}

	.animate-ping-once {
		animation: ping-once 0.6s ease-out forwards;
	}

	@keyframes ping-once {
		0% {
			transform: scale(1);
			opacity: 1;
		}
		100% {
			transform: scale(2);
			opacity: 0;
		}
	}
</style>
