<script lang="ts">
import { Layers, Settings as SettingsIcon, Star, Swords } from 'lucide-svelte'
import GameTitle from '$lib/components/GameTitle.svelte'
import PlayingCard from '$lib/components/PlayingCard.svelte'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
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

const me = $derived(gameState.players.find((p) => p === myPlayerId))
const opponent = $derived(gameState.players.find((p) => p !== myPlayerId) ?? gameState.players[0])

function zone(id: string) {
	return gameState.zones[id]
}

function playerName(id: string): string {
	return players.find((p) => p.id === id)?.name ?? id
}

const myAction = $derived(validActions[0] ?? null)
const isMyTurn = $derived(validActions.length > 0)
const isReviewing = $derived(gameState.phase === 'reviewing')

const FACE_VALUES: Record<string, number> = {
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

const roundWinnerId = $derived(
	isReviewing
		? (() => {
				const [p0, p1] = gameState.players
				if (!p0 || !p1) return null
				const c0 = zone(`played_${p0}`)?.cards[0]
				const c1 = zone(`played_${p1}`)?.cards[0]
				if (!c0 || !c1) return null
				const v0 = FACE_VALUES[c0.face] ?? 0
				const v1 = FACE_VALUES[c1.face] ?? 0
				if (v0 === v1) return 'tie'
				return v0 > v1 ? p0 : p1
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
			: me
				? $t('war.roundLost')
				: $t('war.roundWon', { name: playerName(lastRoundWinnerId ?? '') })
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
		: lastRoundWinnerId === me || (!me && lastRoundWinnerId !== null)
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

const bottomPlayer = $derived(me ?? (gameState.players.length > 1 ? gameState.players[1] : null))
const isBottomMe = $derived(!!me)

function cardSlotClass(playerId: string): string {
	if (!isReviewing || !roundWinnerId || roundWinnerId === 'tie') return 'card-slot'
	if (roundWinnerId === playerId) return 'card-slot card-slot--win'
	return 'card-slot card-slot--lose'
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

<div class="arena flex min-h-screen flex-col">
	<!-- Header -->
	<header class="flex items-center justify-between px-4 py-2">
		<span class="font-heading text-sm uppercase tracking-widest text-muted-foreground"
			>{$t('war.name')}</span
		>
		<div class="flex items-center gap-1">
			<button
				onclick={() => ($settingsOpen = true)}
				class="rounded p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
				aria-label="Settings"
			>
				<SettingsIcon size={16} />
			</button>
			<RulesDrawer gameId="war" size={16} />
		</div>
	</header>

	<!-- Battlefield -->
	<div class="flex flex-1 flex-col items-center justify-center gap-1 px-4">
		<!-- Opponent info -->
		<div class="mb-3 flex w-full max-w-xs items-center justify-between">
			<span class="font-heading text-base tracking-wider text-muted-foreground"
				>{playerName(opponent)}</span
			>
			<div class="flex items-center gap-2">
				<span class="stat-pip">
					<Layers size={11} />
					{zone(`deck_${opponent}`)?.cards.length ?? 0}
				</span>
				<span class="stat-pip stat-pip--won">
					<Star size={11} />
					{zone(`won_${opponent}`)?.cards.length ?? 0}
				</span>
			</div>
		</div>

		<!-- Opponent card -->
		<div class={cardSlotClass(opponent)}>
			<div class="card-inner">
				<PlayingCard card={zone(`played_${opponent}`)?.cards[0] ?? null} size="lg" />
			</div>
		</div>

		<!-- VS bar -->
		<div class="vs-bar flex w-full max-w-xs items-center gap-3 py-5">
			<div class="slash flex-1"></div>
			<div class="flex items-center gap-2">
				<Swords size={15} style="color: oklch(0.48 0.14 15)" />
				<span class="font-heading text-xl tracking-[0.3em] text-vs">VS</span>
				<Swords size={15} style="color: oklch(0.48 0.14 15); transform: scaleX(-1)" />
			</div>
			<div class="slash flex-1"></div>
		</div>

		<!-- My card -->
		{#if bottomPlayer}
			<div class={cardSlotClass(bottomPlayer)}>
				<div class="card-inner">
					<PlayingCard card={zone(`played_${bottomPlayer}`)?.cards[0] ?? null} size="lg" />
				</div>
			</div>

			<!-- My info -->
			<div class="mt-3 flex w-full max-w-xs items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="stat-pip">
						<Layers size={11} />
						{zone(`deck_${bottomPlayer}`)?.cards.length ?? 0}
					</span>
					<span class="stat-pip stat-pip--won">
						<Star size={11} />
						{zone(`won_${bottomPlayer}`)?.cards.length ?? 0}
					</span>
				</div>
				<span
					class="font-heading text-base tracking-wider {isBottomMe
						? 'text-foreground'
						: 'text-muted-foreground'}"
				>
					{playerName(bottomPlayer)}{#if isBottomMe}&nbsp;<span
							class="text-xs normal-case text-muted-foreground">({$t('common.you')})</span
						>{/if}
				</span>
			</div>
		{/if}

		<!-- Action -->
		<div class="mt-8 flex flex-col items-center">
			{#if isReviewing}
				{#if isMyTurn && myAction}
					<button class="war-btn war-btn--continue" onclick={() => onAction(myAction)}>
						{$t('war.continue')}
					</button>
				{:else}
					<p class="text-sm text-muted-foreground">
						{$t('common.waitingFor', { name: playerName(opponent) })}
					</p>
				{/if}
			{:else if isMyTurn && myAction}
				<button class="war-btn war-btn--reveal" onclick={() => onAction(myAction)}>
					<Swords size={18} />
					{$t('war.reveal')}
				</button>
			{:else}
				<p class="text-sm text-muted-foreground">
					{$t('common.waitingFor', { name: playerName(opponent) })}
				</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.arena {
		background:
			radial-gradient(ellipse 70% 45% at 50% 50%, oklch(0.22 0.06 15 / 0.35) 0%, transparent 65%),
			oklch(0.13 0 0);
	}

	/* Stats */
	.stat-pip {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 2px 8px;
		border-radius: 9999px;
		font-size: 0.7rem;
		font-family: var(--font-heading);
		letter-spacing: 0.05em;
		background: oklch(0.2 0 0);
		color: oklch(0.5 0 0);
		border: 1px solid oklch(1 0 0 / 8%);
	}
	.stat-pip--won {
		color: oklch(0.74 0.135 354);
		border-color: oklch(0.74 0.135 354 / 25%);
	}

	/* Card slots — sized to contain the 1.4× scaled lg card (96×134 → 135×188) */
	.card-slot {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 135px;
		height: 188px;
	}

	.card-inner {
		transform: scale(1.4);
		transform-origin: center;
		transition:
			filter 0.35s ease,
			transform 0.35s ease;
		filter: drop-shadow(0 6px 20px oklch(0 0 0 / 0.55));
	}

	.card-slot--win .card-inner {
		filter:
			drop-shadow(0 0 10px oklch(0.8 0.2 85 / 0.9))
			drop-shadow(0 0 28px oklch(0.7 0.18 85 / 0.5));
	}

	.card-slot--lose .card-inner {
		filter: grayscale(0.75) brightness(0.4) drop-shadow(0 4px 12px oklch(0 0 0 / 0.5));
		transform: scale(1.28);
	}

	/* VS */
	.slash {
		height: 1px;
		background: linear-gradient(90deg, transparent, oklch(0.42 0.12 15 / 0.5) 50%, transparent);
	}

	.text-vs {
		color: oklch(0.52 0.14 15);
	}

	/* Action buttons */
	.war-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.8rem 2.2rem;
		border: none;
		border-radius: 3px;
		font-family: var(--font-heading);
		font-size: 1.3rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		cursor: pointer;
		transition:
			filter 0.15s ease,
			transform 0.1s ease;
	}

	.war-btn:focus-visible {
		outline: 2px solid oklch(0.7 0.15 264);
		outline-offset: 3px;
	}

	.war-btn:active {
		transform: scale(0.96);
	}

	.war-btn--reveal {
		background: linear-gradient(135deg, #6b1515 0%, #c41a1a 40%, #6b1515 100%);
		color: oklch(0.93 0 0);
		box-shadow:
			0 0 0 1px oklch(0.55 0.18 15 / 0.4),
			0 4px 18px oklch(0.35 0.18 15 / 0.5);
		animation: reveal-glow 2s ease-in-out infinite;
	}

	.war-btn--reveal:hover {
		filter: brightness(1.2);
	}

	.war-btn--continue {
		background: linear-gradient(135deg, #6b4e00 0%, #c9931a 40%, #6b4e00 100%);
		color: oklch(0.1 0 0);
		box-shadow:
			0 0 0 1px oklch(0.75 0.18 80 / 0.4),
			0 4px 18px oklch(0.5 0.18 80 / 0.35);
	}

	.war-btn--continue:hover {
		filter: brightness(1.15);
	}

	@keyframes reveal-glow {
		0%,
		100% {
			box-shadow:
				0 0 0 1px oklch(0.55 0.18 15 / 0.4),
				0 4px 18px oklch(0.35 0.18 15 / 0.5);
		}
		50% {
			box-shadow:
				0 0 0 1px oklch(0.6 0.18 15 / 0.65),
				0 4px 28px oklch(0.38 0.2 15 / 0.8);
		}
	}
</style>
