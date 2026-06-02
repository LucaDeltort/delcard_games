<script lang="ts">
import { Settings as SettingsIcon } from 'lucide-svelte'
import { quintOut } from 'svelte/easing'
import { crossfade } from 'svelte/transition'
import GameLayout from '$lib/components/games/GameLayout.svelte'
import PlayingCard from '$lib/components/PlayingCard.svelte'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
import type { GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'
import type { PurpleState } from '$lib/games/purple/purple'
import { t } from '$lib/i18n'
import type { LobbyPlayer } from '$lib/network/messages'
import { settingsOpen } from '$lib/stores/settings'

const [send, receive] = crossfade({ duration: 500, easing: quintOut })

let {
	state: gameState,
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

const s = $derived(gameState as PurpleState)
const isMyTurn = $derived(s.turnPlayerId === myPlayerId)
const turnPlayer = $derived(players.find((p) => p.id === s.turnPlayerId))
const playingBankCards = $derived(s.zones['playingBank'].cards)
const turnBets = $derived(s.turnBets)
const canStop = $derived(validActions.some((a) => a.type === 'STOP'))
const isFailing = $derived(s.phase === 'failing')
const canDecrease = $derived(validActions.some((a) => a.type === 'DECREASE_SCORE'))

$effect(() => {
	if (isFailing && isMyTurn) {
		const timeout = setTimeout(() => {
			onAction({ type: 'FINALIZE_FAILURE', playerId: myPlayerId })
		}, 500)
		return () => clearTimeout(timeout)
	}
})

function getBankedScore(pid: string) {
	return gameState.scores[pid] ?? 0
}

function getCurrentPenaltyCount(pid: string) {
	return gameState.zones[`penaltyBank_${pid}`]?.cards.length ?? 0
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

function playerName(id: string): string {
	return players.find((p) => p.id === id)?.name ?? id
}

const opponents = $derived(s.players.filter((id) => id !== myPlayerId))
</script>

{#snippet oppTileInner(pid: string, active: boolean)}
	<span class="opp-name">{playerName(pid)}{#if active}&thinsp;▶{/if}</span>
	<div class="opp-meta">
		<div class="score-badge-wrap">
			<span class="score-badge">{getBankedScore(pid)}</span>
			{#if s.lastScoreEvent && s.lastScoreEvent.pid === pid}
				{#key s.lastScoreEvent.timestamp}
					<span class="score-ping"></span>
				{/key}
			{/if}
		</div>
		{#if getCurrentPenaltyCount(pid) > 0}
			<span class="penalty-badge">{getCurrentPenaltyCount(pid)}</span>
		{/if}
	</div>
{/snippet}

<div class="pur-root" class:pur-root--failing={isFailing}>

	{#if turnBets >= 3}
		{#key turnBets}
			<div class="pur-ripple-wrap">
				<div class="pur-ripple"></div>
			</div>
		{/key}
	{/if}

	<!-- Header -->
	<header class="pur-hdr">
		<span class="pur-hdr-title">{$t('purple.name')}</span>
		<span class="pur-hdr-status">
			{#if !isMyTurn}
				{$t('common.waitingFor', { name: turnPlayer?.name ?? s.turnPlayerId })}
			{/if}
		</span>
		<div class="pur-hdr-icons">
			<button onclick={() => ($settingsOpen = true)} class="hdr-btn" aria-label="Settings">
				<SettingsIcon size={15} />
			</button>
			<RulesDrawer gameId="purple" size={15} />
		</div>
	</header>

	{#snippet opponentTile(pid: string)}
		{@const active = s.turnPlayerId === pid}
		<div class="opp-tile {active ? 'opp-tile--active' : ''}">
			{@render oppTileInner(pid, active)}
		</div>
	{/snippet}

	{#snippet center()}
		<div class="flex flex-col items-center gap-5">
			<div class="zones-row">
				<div class="zone-col">
					<PlayingCard card={{ id: 'back', face: 'back', isHidden: true }} back size="md" {deckSlug} />
					<span class="zone-count">{s.zones['deck'].cards.length}</span>
					<span class="zone-label">{$t('purple.deck')}</span>
				</div>
				<div class="zone-col">
					<div
						class="card-stack {isFailing
							? 'card-stack--failing'
							: playingBankCards.length > 0
								? 'card-stack--active'
								: ''}"
					>
						{#each playingBankCards as card (card.id)}
							<div
								class="absolute"
								style={getCardStyle(card.id)}
								in:receive={{ key: card.id }}
								out:send={{ key: card.id }}
							>
								<PlayingCard {card} size="md" {deckSlug} />
							</div>
						{/each}
					</div>
					<span class="zone-count">{playingBankCards.length}</span>
					<span class="zone-label">{$t('purple.playingBank')}</span>
				</div>
				<div class="zone-col">
					<div class="card-stack card-stack--penalty">
						{#each s.zones[`penaltyBank_${s.turnPlayerId}`].cards as card (card.id)}
							<div class="absolute" style={getCardStyle(card.id)} in:receive={{ key: card.id }}>
								<PlayingCard {card} size="md" {deckSlug} />
							</div>
						{/each}
					</div>
					<span class="zone-count zone-count--penalty">{getCurrentPenaltyCount(s.turnPlayerId)}</span>
					<span class="zone-label zone-label--penalty">{$t('purple.penalty')}</span>
				</div>
			</div>
			<div class="bet-gems">
				{#each [0, 1, 2] as i}
					<div class="gem {turnBets > i ? 'gem--filled' : ''}"></div>
				{/each}
			</div>
		</div>
	{/snippet}

	<GameLayout {opponents} {opponentTile} {center} />

	<!-- Bottom dock -->
	<div class="action-dock">
		<div class="my-row">
			<span class="my-name">{playerName(myPlayerId)}&thinsp;<span class="you-tag">({$t('common.you')})</span></span>
			<div class="my-badges">
				<div class="score-badge-wrap">
					<span class="score-badge score-badge--mine">{getBankedScore(myPlayerId)}</span>
					{#if s.lastScoreEvent && s.lastScoreEvent.pid === myPlayerId}
						{#key s.lastScoreEvent.timestamp}
							<span class="score-ping"></span>
						{/key}
					{/if}
				</div>
				{#if getCurrentPenaltyCount(myPlayerId) > 0 && s.turnPlayerId === myPlayerId}
					<span class="penalty-badge">{getCurrentPenaltyCount(myPlayerId)}</span>
				{/if}
			</div>
		</div>

		<div class="actions-area">
			{#if isMyTurn}
				<div class="bet-grid">
					<button
						onclick={() => onAction({ type: 'BET_RED', playerId: myPlayerId })}
						class="bet-btn bet-btn--red"
						disabled={isFailing}
					>
						{$t('purple.betRed')}
					</button>
					<button
						onclick={() => onAction({ type: 'BET_BLACK', playerId: myPlayerId })}
						class="bet-btn bet-btn--black"
						disabled={isFailing}
					>
						{$t('purple.betBlack')}
					</button>
					<button
						onclick={() => onAction({ type: 'BET_PURPLE', playerId: myPlayerId })}
						class="bet-btn bet-btn--purple"
						disabled={isFailing}
					>
						{$t('purple.betPurple')}
					</button>
				</div>
				<button
					disabled={!canStop}
					onclick={() => onAction({ type: 'STOP', playerId: myPlayerId })}
					class="stop-btn"
					class:stop-btn--ready={canStop}
				>
					{$t('purple.stop')}
				</button>
			{:else}
				<div class="waiting-row">
					<span class="waiting-text">{$t('common.waitingFor', { name: turnPlayer?.name ?? s.turnPlayerId })}</span>
					{#if canDecrease}
						<button
							onclick={() => onAction({ type: 'DECREASE_SCORE', playerId: myPlayerId })}
							class="decrease-btn"
						>
							{$t('purple.decreaseScore')}
						</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	/* ── ROOT ─────────────────────────────────── */
	.pur-root {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		position: relative;
		overflow-x: hidden;
		--pur: oklch(0.65 0.28 295);
		--pur-dim: oklch(0.28 0.12 295 / 0.40);
		--pur-glow: oklch(0.55 0.22 295 / 0.55);
		--fail: oklch(0.62 0.22 25);
		--fail-dim: oklch(0.28 0.12 25 / 0.35);
		--score: oklch(0.68 0.24 340);
		--score-dim: oklch(0.26 0.10 340 / 0.30);
		--void: oklch(0.07 0.02 290);
		--ink: oklch(0.10 0.025 290);
		--dim: oklch(0.40 0.02 290);
		--light: oklch(0.88 0.01 290);
		background:
			radial-gradient(ellipse 85% 55% at 50% 78%, var(--pur-dim) 0%, transparent 65%),
			var(--void);
		transition: background 0.5s ease;
	}

	.pur-root--failing {
		background:
			radial-gradient(ellipse 85% 55% at 50% 78%, var(--fail-dim) 0%, transparent 65%),
			var(--void);
	}

	/* ── RIPPLE ───────────────────────────────── */
	.pur-ripple-wrap {
		pointer-events: none;
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		z-index: 0;
	}

	.pur-ripple {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: var(--pur);
		animation: pur-ripple 0.8s ease-out forwards;
	}

	@keyframes pur-ripple {
		0% { transform: scale(0); opacity: 0.7; }
		100% { transform: scale(10); opacity: 0; }
	}

	/* ── HEADER ───────────────────────────────── */
	.pur-hdr {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: calc(0.5rem + env(safe-area-inset-top)) 0.875rem 0.5rem;
		border-bottom: 1px solid oklch(1 0 0 / 7%);
		background: oklch(0.08 0.025 290 / 0.92);
		backdrop-filter: blur(10px);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.pur-hdr-title {
		font-family: var(--font-display);
		font-size: 1.2rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		color: var(--pur);
		flex-shrink: 0;
		text-shadow: 0 0 18px var(--pur-glow);
	}

	.pur-hdr-status {
		font-family: var(--font-display);
		font-size: 0.92rem;
		font-style: italic;
		color: var(--dim);
		text-align: center;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.pur-hdr-icons {
		display: flex;
		align-items: center;
		gap: 0.125rem;
		flex-shrink: 0;
	}

	.hdr-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.375rem;
		background: none;
		border: none;
		border-radius: 2px;
		color: oklch(0.36 0.02 290);
		cursor: pointer;
		transition: color 0.15s;
	}
	.hdr-btn:hover { color: var(--pur); }

	/* ── OPPONENTS ───────────────────────────── */
	.opp-tile {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.5rem 0.625rem;
		border-radius: 4px;
		border: 1px solid oklch(1 0 0 / 7%);
		border-top: 2px solid transparent;
		background: oklch(0.11 0.025 290);
		transition: border-top-color 0.3s, background 0.3s;
	}

	.opp-tile--active {
		border-top-color: var(--pur);
		background: oklch(0.13 0.05 295);
		box-shadow: 0 0 12px var(--pur-dim);
	}

	.opp-name {
		font-family: var(--font-display);
		font-size: 0.97rem;
		font-weight: 600;
		color: var(--light);
		white-space: nowrap;
	}

	.opp-tile--active .opp-name { color: var(--pur); }

	.opp-meta {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	/* ── SCORE BADGE ──────────────────────────── */
	.score-badge-wrap {
		position: relative;
		display: inline-flex;
	}

	.score-badge {
		font-family: var(--font-heading);
		font-size: 0.80rem;
		letter-spacing: 0.04em;
		padding: 0.15rem 0.45rem;
		border-radius: 999px;
		background: var(--score-dim);
		border: 1px solid oklch(0.50 0.18 340 / 0.30);
		color: var(--score);
	}

	.score-badge--mine {
		font-size: 0.90rem;
		padding: 0.2rem 0.6rem;
	}

	.score-ping {
		position: absolute;
		inset: 0;
		border-radius: 999px;
		border: 2px solid var(--score);
		animation: score-ping 0.55s ease-out forwards;
	}

	@keyframes score-ping {
		0% { transform: scale(1); opacity: 0.9; }
		100% { transform: scale(2.2); opacity: 0; }
	}

	/* ── PENALTY BADGE ────────────────────────── */
	.penalty-badge {
		font-family: var(--font-heading);
		font-size: 0.80rem;
		letter-spacing: 0.04em;
		padding: 0.15rem 0.45rem;
		border-radius: 999px;
		background: var(--fail-dim);
		border: 1px solid oklch(0.50 0.18 25 / 0.30);
		color: var(--fail);
	}

	.zones-row {
		display: flex;
		align-items: flex-start;
		gap: 1.75rem;
	}

	.zone-col {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.375rem;
	}

	.zone-count {
		font-family: var(--font-heading);
		font-size: 0.82rem;
		letter-spacing: 0.10em;
		color: oklch(0.50 0.02 290);
	}

	.zone-count--penalty {
		color: var(--fail);
	}

	.zone-label {
		font-family: var(--font-heading);
		font-size: 0.62rem;
		letter-spacing: 0.20em;
		text-transform: uppercase;
		color: oklch(0.34 0.02 290);
	}

	.zone-label--penalty {
		color: oklch(0.44 0.12 25);
	}

	/* ── CARD STACKS ──────────────────────────── */
	.card-stack {
		position: relative;
		height: 100px;
		width: 72px;
		border-radius: 8px;
		transition: box-shadow 0.35s ease;
	}

	.card-stack--active {
		box-shadow: 0 0 22px var(--pur-dim), 0 0 6px var(--pur-glow);
	}

	.card-stack--failing {
		box-shadow: 0 0 28px var(--fail-dim);
		animation: fail-pulse 0.55s ease-in-out infinite;
	}

	@keyframes fail-pulse {
		0%, 100% { box-shadow: 0 0 18px var(--fail-dim); }
		50% { box-shadow: 0 0 40px var(--fail); }
	}

	.card-stack--penalty {
		border: 2px dashed oklch(0.42 0.15 25 / 0.45);
		background: oklch(0.11 0.04 25 / 0.15);
	}

	/* ── BET GEMS ─────────────────────────────── */
	.bet-gems {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.gem {
		width: 14px;
		height: 14px;
		clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
		background: oklch(0.18 0.05 295);
		border: none;
		transition: background 0.25s, box-shadow 0.25s;
	}

	.gem--filled {
		background: var(--pur);
		box-shadow: 0 0 8px var(--pur-glow), 0 0 16px var(--pur-dim);
	}

	/* ── BOTTOM DOCK ──────────────────────────── */
	.action-dock {
		border-top: 1px solid oklch(1 0 0 / 8%);
		background: oklch(0.09 0.022 290 / 0.92);
		backdrop-filter: blur(10px);
		padding: 0.875rem 0.875rem;
		padding-bottom: calc(0.875rem + env(safe-area-inset-bottom));
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		position: relative;
		z-index: 5;
	}

	.my-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.my-name {
		font-family: var(--font-display);
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--light);
	}

	.you-tag {
		font-family: var(--font-sans);
		font-size: 0.70rem;
		font-weight: 400;
		font-style: normal;
		color: oklch(0.36 0 0);
	}

	.my-badges {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	/* ── ACTIONS ──────────────────────────────── */
	.actions-area {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.bet-grid {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0.5rem;
	}

	.bet-btn {
		font-family: var(--font-heading);
		font-size: 1.1rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		height: 3.25rem;
		border-radius: 3px;
		border: none;
		cursor: pointer;
		transition: transform 0.1s, filter 0.15s;
	}

	.bet-btn:active { transform: scale(0.96); }
	.bet-btn:hover:not(:disabled) { filter: brightness(1.18); }
	.bet-btn:disabled { opacity: 0.35; cursor: default; }

	.bet-btn--red {
		background: oklch(0.20 0.10 25);
		color: oklch(0.70 0.22 25);
		border: 1px solid oklch(0.48 0.18 25 / 0.40);
		box-shadow: 0 2px 12px oklch(0.55 0.20 25 / 0.20);
	}

	.bet-btn--black {
		background: oklch(0.12 0.01 290);
		color: oklch(0.72 0.01 290);
		border: 1px solid oklch(0.30 0.01 290 / 0.55);
	}

	.bet-btn--purple {
		background: linear-gradient(135deg, oklch(0.22 0.12 295), oklch(0.18 0.10 330));
		color: var(--pur);
		border: 1px solid oklch(0.45 0.18 295 / 0.45);
		box-shadow: 0 2px 14px var(--pur-dim);
		text-shadow: 0 0 10px var(--pur-glow);
	}

	.stop-btn {
		font-family: var(--font-heading);
		font-size: 0.90rem;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		height: 2.75rem;
		width: 100%;
		border-radius: 3px;
		cursor: pointer;
		transition: color 0.2s, border-color 0.2s, box-shadow 0.2s, filter 0.15s;
		background: transparent;
		color: oklch(0.30 0.02 290);
		border: 1px solid oklch(1 0 0 / 10%);
	}

	.stop-btn:disabled {
		cursor: default;
		opacity: 0.4;
	}

	.stop-btn--ready {
		color: oklch(0.72 0.14 76);
		border-color: oklch(0.55 0.12 76 / 0.45);
		box-shadow: 0 0 14px oklch(0.65 0.14 76 / 0.18);
	}

	.stop-btn--ready:hover {
		filter: brightness(1.20);
	}

	/* ── WAITING ROW ──────────────────────────── */
	.waiting-row {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.875rem;
		min-height: 5.5rem;
		justify-content: center;
	}

	.waiting-text {
		font-family: var(--font-display);
		font-size: 1rem;
		font-style: italic;
		color: var(--dim);
		animation: waiting-pulse 2.4s ease-in-out infinite;
	}

	@keyframes waiting-pulse {
		0%, 100% { opacity: 0.7; }
		50% { opacity: 1; }
	}

	.decrease-btn {
		font-family: var(--font-heading);
		font-size: 0.82rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		padding: 0.55rem 1.5rem;
		border-radius: 3px;
		cursor: pointer;
		background: var(--fail-dim);
		color: var(--fail);
		border: 1px solid oklch(0.48 0.18 25 / 0.30);
		transition: filter 0.15s, transform 0.1s;
	}

	.decrease-btn:hover { filter: brightness(1.22); }
	.decrease-btn:active { transform: scale(0.97); }
</style>
