<script lang="ts">
import { Settings as SettingsIcon } from 'lucide-svelte'
import CardZone from '$lib/components/CardZone.svelte'
import GameTitle from '$lib/components/GameTitle.svelte'
import PlayerSlot from '$lib/components/PlayerSlot.svelte'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
import { Button } from '$lib/components/ui/button'
import type { GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'
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

const me = $derived(gameState.players.find((p) => p === myPlayerId) ?? gameState.players[0])
const opponent = $derived(gameState.players.find((p) => p !== me) ?? gameState.players[1])

function zone(id: string) {
	return gameState.zones[id]
}

function playerName(id: string): string {
	return players.find((p) => p.id === id)?.name ?? id
}

const myAction = $derived(validActions[0] ?? null)
const isMyTurn = $derived(validActions.length > 0)
const isReviewing = $derived(gameState.phase === 'reviewing')

const roundWinnerId = $derived(
	isReviewing
		? (() => {
				const myCard = zone(`played_${me}`)?.cards[0]
				const oppCard = zone(`played_${opponent}`)?.cards[0]
				if (!myCard || !oppCard) return null
				const faceVal: Record<string, number> = {
					'2': 2,
					'3': 3,
					'4': 4,
					'5': 5,
					'6': 6,
					'7': 7,
					'8': 8,
					'9': 9,
					'10': 10,
					J: 11,
					Q: 12,
					K: 13,
					A: 14
				}
				const myV = faceVal[myCard.face] ?? 0
				const oppV = faceVal[oppCard.face] ?? 0
				if (myV === oppV) return 'tie'
				return myV > oppV ? me : opponent
			})()
		: null
)

let lastRoundWinnerId = $state<string | null>(null)
$effect(() => {
	if (isReviewing && roundWinnerId !== null) lastRoundWinnerId = roundWinnerId
})

const resultTitle = $derived(
	lastRoundWinnerId === 'tie'
		? $t('war.roundTie')
		: lastRoundWinnerId === me
			? $t('war.roundWonMe')
			: $t('war.roundLost')
)
const resultProps = $derived(
	lastRoundWinnerId === 'tie'
		? ({
				entry: 'flipDown',
				exit: 'shrink',
				rotation: 'wobble',
				size: 'none',
				color: 'fire'
			} as const)
		: lastRoundWinnerId === me
			? ({
					entry: 'bigEntrance',
					exit: 'explode',
					rotation: 'wobble',
					size: 'pulse',
					color: 'gold'
				} as const)
			: ({
					entry: 'letterStagger',
					exit: 'blur',
					rotation: 'tilt',
					size: 'breathe',
					color: 'red'
				} as const)
)

function onKeydown(e: KeyboardEvent) {
	if ((e.code === 'Space' || e.code === 'Enter') && isMyTurn && myAction) {
		e.preventDefault()
		onAction(myAction)
	}
}
</script>

<svelte:window onkeydown={onKeydown} />

<!-- Round result overlay -->
<div class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
	<GameTitle
		title={resultTitle}
		show={isReviewing}
		entry={resultProps.entry}
		exit={resultProps.exit}
		rotation={resultProps.rotation}
		size={resultProps.size}
		color={resultProps.color}
	/>
</div>

<div class="flex min-h-screen flex-col">
	<header class="flex items-center justify-between border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground">
		<span class="font-mono">{$t('war.name')}</span>
		<div class="flex items-center">
			<button
				onclick={() => ($settingsOpen = true)}
				class="flex items-center rounded p-2 text-muted-foreground transition-colors hover:text-foreground"
				aria-label={$t('settings.title')}
			>
				<SettingsIcon size={16} />
			</button>
			<RulesDrawer gameId="war" size={16} />
		</div>
	</header>

	<div class="flex flex-1 flex-col items-center justify-center gap-8 px-4">
		<!-- Opponent -->
		<div class="flex flex-col items-center gap-4">
			<PlayerSlot name={playerName(opponent)} />
			<div class="flex items-end gap-6">
				<CardZone card={zone(`deck_${opponent}`)?.cards[0] ?? null} back label={$t('war.deck')} count={zone(`deck_${opponent}`)?.cards.length ?? 0} />
				<CardZone card={zone(`played_${opponent}`)?.cards[0] ?? null} size="lg" label={$t('war.played')} />
				<CardZone card={zone(`won_${opponent}`)?.cards[0] ?? null} back label={$t('war.won')} count={zone(`won_${opponent}`)?.cards.length ?? 0} countVariant="accent" />
			</div>
		</div>

		<!-- VS divider -->
		<div class="flex w-full max-w-xs items-center gap-4">
			<div class="h-px flex-1 bg-border"></div>
			<span class="font-heading text-2xl text-muted-foreground">VS</span>
			<div class="h-px flex-1 bg-border"></div>
		</div>

		<!-- Me -->
		<div class="flex flex-col items-center gap-4">
			<div class="flex items-end gap-6">
				<CardZone card={zone(`deck_${me}`)?.cards[0] ?? null} back label={$t('war.deck')} count={zone(`deck_${me}`)?.cards.length ?? 0} />
				<CardZone card={zone(`played_${me}`)?.cards[0] ?? null} size="lg" label={$t('war.played')} />
				<CardZone card={zone(`won_${me}`)?.cards[0] ?? null} back label={$t('war.won')} count={zone(`won_${me}`)?.cards.length ?? 0} countVariant="accent" />
			</div>
			<PlayerSlot name={playerName(me)} you />
		</div>

		<!-- Action -->
		<div class="mt-2 flex flex-col items-center gap-3">
			{#if isReviewing}
				{#if isMyTurn && myAction}
					<Button onclick={() => onAction(myAction)} size="lg">{$t('war.continue')}</Button>
				{:else}
					<p class="text-sm text-muted-foreground">
						{$t('common.waitingFor', { name: playerName(opponent) })}
					</p>
				{/if}
			{:else if isMyTurn && myAction}
				<Button onclick={() => onAction(myAction)} size="lg">{$t('war.reveal')}</Button>
			{:else}
				<p class="text-sm text-muted-foreground">
					{$t('common.waitingFor', { name: playerName(opponent) })}
				</p>
			{/if}
		</div>
	</div>
</div>
