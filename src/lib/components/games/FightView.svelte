<script lang="ts">
import { ChevronDown, ChevronUp, MessageSquare, Settings as SettingsIcon, X } from 'lucide-svelte'
import { onDestroy, onMount, untrack } from 'svelte'
import { fade } from 'svelte/transition'
import CardZone from '$lib/components/CardZone.svelte'
import GameTitle from '$lib/components/GameTitle.svelte'
import PlayingCard from '$lib/components/PlayingCard.svelte'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
import { Button } from '$lib/components/ui/button'
import type { GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'
import type { FightState, HistoryEntry } from '$lib/games/fight/fight'
import { t } from '$lib/i18n'
import type { LobbyPlayer } from '$lib/network/messages'
import { settings, settingsOpen } from '$lib/stores/settings'
import GameLayout from './GameLayout.svelte'

let {
	state: gameState,
	myPlayerId,
	players,
	validActions,
	onAction,
	isSpectator = false
}: {
	state: GameStateGeneric
	myPlayerId: string
	players: LobbyPlayer[]
	validActions: Action[]
	onAction: (action: Action) => void
	isSpectator?: boolean
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
let attackContainerEl = $state<HTMLDivElement | null>(null)
let shieldContainerEl = $state<HTMLDivElement | null>(null)
let attackDir = $state<'up' | 'down'>('up')
let shieldDir = $state<'up' | 'down'>('up')

function pickDirection(el: HTMLElement | null): 'up' | 'down' {
	if (!el) return 'up'
	const rect = el.getBoundingClientRect()
	return rect.top >= window.innerHeight - rect.bottom ? 'up' : 'down'
}

function toggleAttack() {
	if (!attackOpen) attackDir = pickDirection(attackContainerEl)
	attackOpen = !attackOpen
	shieldOpen = false
}

function toggleShield() {
	if (!shieldOpen) shieldDir = pickDirection(shieldContainerEl)
	shieldOpen = !shieldOpen
	attackOpen = false
}

type ActionFlash = Extract<HistoryEntry, { type: 'ATTACK' | 'CHANGE_SHIELD' | 'CHARGE' }>

const CARD_DELAY = 1000
const HP_DISPLAY = 4000
const STARTER_DISPLAY = 2500
const FLASH_DURATION = 2500

let actionFlash = $state<ActionFlash | null>(null)
let _flashTimeout: ReturnType<typeof setTimeout> | null = null
let showTurnFlash = $state(false)
let showBonusFlash = $state(false)
let bannerType = $state<'attack' | 'blocked' | 'charge' | 'shield' | null>(null)
let _bannerTimer: ReturnType<typeof setTimeout> | null = null
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
	const flash = entry as ActionFlash
	if (_flashTimeout) clearTimeout(_flashTimeout)
	actionFlash = flash
	_flashTimeout = setTimeout(() => {
		actionFlash = null
	}, FLASH_DURATION)
	if (_bannerTimer) clearTimeout(_bannerTimer)
	if (flash.type === 'ATTACK') bannerType = flash.damage > 0 ? 'attack' : 'blocked'
	else if (flash.type === 'CHARGE') bannerType = 'charge'
	else if (flash.type === 'CHANGE_SHIELD') bannerType = 'shield'
	_bannerTimer = setTimeout(() => {
		bannerType = null
	}, FLASH_DURATION)
})

let _prevTurnPlayerId = untrack(() => gs.turnPlayerId)
let _prevPendingBonus = untrack(() => gs.pendingBonusAction)

$effect(() => {
	const tid = gs.turnPlayerId
	const bonus = gs.pendingBonusAction
	if (bonus !== _prevPendingBonus) {
		if (bonus === myPlayerId) {
			showBonusFlash = true
			setTimeout(() => (showBonusFlash = false), 1500)
		}
		_prevPendingBonus = bonus
	}
	if (tid !== _prevTurnPlayerId) {
		if (tid === myPlayerId && !bonus) {
			showTurnFlash = true
			setTimeout(() => (showTurnFlash = false), 1500)
		}
		_prevTurnPlayerId = tid
	}
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
	if (_bannerTimer) clearTimeout(_bannerTimer)
})
</script>

{#if introPhase !== 'done'}
<!-- ── INTRO ──────────────────────────────────────────────── -->
<div class="intro-root">
	<button onclick={skipIntro} class="skip-btn">{$t('fight.skipIntro')}</button>

	<div class="intro-header">
		<p class="intro-game-tag">{$t('fight.name')}</p>
		<h2 class="intro-phase-title">
			{#if introPhase === 'dealing'}{$t('fight.introDeal')}
			{:else if introPhase === 'hp'}{$t('fight.introHp')}
			{:else}{$t('fight.introStarter')}{/if}
		</h2>
	</div>

	{#if introPhase !== 'starter'}
		<div class="intro-fighters-row">
			{#each gs.players as pid, pIdx (pid)}
				{@const isFirst = introPhase === 'hp' && pid === gs.turnPlayerId}
				<div class="intro-fighter-block {isFirst ? 'intro-fighter-block--first' : ''}">
					<p class="intro-fighter-name">{playerName(pid)}</p>
					<div class="intro-cards-row">
						{#each [0, 1, 2] as cIdx}
							{@const revealed = dealStep >= pIdx * 3 + cIdx + 1}
							<div class="intro-card {revealed ? 'intro-card--revealed' : ''}">
								<PlayingCard card={gs.setupCards?.[pid]?.[cIdx] ?? null} size="sm" />
							</div>
						{/each}
					</div>
					{#if introPhase === 'hp'}
						<div class="intro-hp-row">
							<div class="intro-hp-bar-track">
								<div
									class="intro-hp-bar-fill"
									style="width: {Math.min((gs.hp[pid] / 26) * 100, 100)}%"
								></div>
							</div>
							<span class="intro-hp-value">{$t('fight.hp', { n: gs.hp[pid] })}</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<div class="intro-starter-block">
			<p class="intro-starter-label">FIRST TO FIGHT</p>
			<div class="intro-divider"></div>
			<p class="intro-starter-name">{playerName(gs.turnPlayerId)}</p>
		</div>
	{/if}
</div>

{:else}
<!-- ── MAIN GAME ──────────────────────────────────────────── -->
<div class="fight-root">

	<!-- HEADER -->
	<header class="fight-header">
		<span class="fight-game-name">{$t('fight.name')}</span>
		<span class="fight-turn-info {isBonusTurn ? 'fight-turn-info--bonus' : ''}">
			{#if isBonusTurn}
				{$t('fight.bonusKill')}
			{:else}
				{$t('common.turnOf', { name: playerName(actingPlayerId) })}
			{/if}
		</span>
		<div class="fight-header-icons">
			<button
				onclick={() => ($settingsOpen = true)}
				class="hdr-btn"
				aria-label={$t('settings.title')}
			>
				<SettingsIcon size={16} />
			</button>
			<RulesDrawer gameId="fight" size={16} />
			<button
				onclick={() => (historyOpen = !historyOpen)}
				class="hdr-btn hdr-btn--label {historyOpen ? 'hdr-btn--active' : ''}"
			>
				<MessageSquare size={16} />
				<span>{$t('fight.inPlay', { n: gs.activePlayers.length })}</span>
			</button>
		</div>
	</header>

	{#snippet opponentTile(pid: string)}
		{@const eliminated = !gs.activePlayers.includes(pid)}
		{@const isActing = pid === actingPlayerId}
		{@const hasCharge = (gs.zones[`charge_${pid}`]?.cards.length ?? 0) > 0}
		{@const hpPct = eliminated ? 0 : Math.min((gs.hp[pid] / 26) * 100, 100)}
		{@const barColor =
			hpPct > 60
				? 'oklch(0.72 0.18 80)'
				: hpPct > 30
					? 'oklch(0.68 0.20 50)'
					: 'oklch(0.62 0.22 25)'}
		<div
			class="fighter-card {eliminated
				? 'fighter-card--eliminated'
				: isActing
					? 'fighter-card--active'
					: ''}"
		>
			<p class="fighter-name">{playerName(pid)}</p>
			<div class="fighter-hp-row">
				<div class="hp-bar-track">
					<div class="hp-bar-fill" style="width: {hpPct}%; background-color: {barColor}"></div>
				</div>
				<span class="hp-value">
					{eliminated ? $t('fight.eliminated') : $t('fight.hp', { n: gs.hp[pid] })}
				</span>
			</div>
			<div class="fighter-zones">
				<CardZone
					card={gs.zones[`shield_${pid}`]?.cards[0] ?? null}
					size="sm"
					label={$t('fight.shield')}
				/>
				<CardZone
					card={hasCharge ? gs.zones[`charge_${pid}`].cards[0] : null}
					count={gs.zones[`charge_${pid}`]?.cards.length > 1
						? gs.zones[`charge_${pid}`].cards.length
						: undefined}
					size="sm"
					label={$t('fight.charge')}
				/>
			</div>
		</div>
	{/snippet}

	{#snippet center()}
		<div class="flex items-center gap-8">
			<CardZone
				card={gs.zones.draw?.cards[0] ?? null}
				back
				label={$t('fight.draw')}
				count={gs.zones.draw?.cards.length ?? 0}
			/>
			<div class="arena-divider"></div>
			<CardZone card={gs.zones.discard?.cards.at(-1) ?? null} label={$t('fight.discard')} />
		</div>
	{/snippet}

	<GameLayout {opponents} {opponentTile} {center} />

	<!-- MY SECTION -->
	{#if !isSpectator}
		{@const myHpPct = iAmAlive ? Math.min((gs.hp[myPlayerId] / 26) * 100, 100) : 0}
		{@const myBarColor = myHpPct > 60 ? 'oklch(0.72 0.18 80)' : myHpPct > 30 ? 'oklch(0.68 0.20 50)' : 'oklch(0.62 0.22 25)'}
		<div class="my-section">
			<div class="my-name-row">
				<span class="my-name">
					{playerName(myPlayerId)}<span class="my-you-tag">&thinsp;({$t('common.you')})</span>
				</span>
				{#if !iAmAlive}
					<span class="my-elim-tag">{$t('fight.eliminated')}</span>
				{:else}
					<span class="my-hp">{$t('fight.hp', { n: gs.hp[myPlayerId] })}</span>
				{/if}
			</div>
			{#if iAmAlive}
				<div class="my-hp-bar-track">
					<div
						class="my-hp-bar-fill"
						style="width: {myHpPct}%; background-color: {myBarColor}"
					></div>
				</div>
			{/if}
			<div class="my-cards-row">
				<CardZone
					card={gs.zones[`shield_${myPlayerId}`]?.cards[0] ?? null}
					label={$t('fight.shield')}
				/>
				<CardZone
					card={gs.zones[`charge_${myPlayerId}`]?.cards[0] ?? null}
					count={(gs.zones[`charge_${myPlayerId}`]?.cards.length ?? 0) > 1
						? gs.zones[`charge_${myPlayerId}`]?.cards.length
						: undefined}
					label={$t('fight.charge')}
				/>
			</div>
		</div>
	{/if}

	<!-- FOOTER ACTIONS -->
	<footer class="fight-footer">
		{#if isSpectator}
			<!-- spectators have no actions -->
		{:else if !iAmAlive}
			<p class="wait-text">{$t('fight.youEliminated')}</p>
		{:else if isMyTurn}
			<div class="actions-col">
				{#if isBonusTurn}
					<div class="bonus-strip">{$t('fight.bonusAction')}</div>
				{/if}
				{#if chargeAction}
					<button onclick={() => onAction(chargeAction)} class="fight-btn fight-btn--charge">
						<span>{$t('fight.chargeAction')}</span>
					</button>
				{/if}
				{#if attackActions.length > 0}
					<div class="relative w-full" bind:this={attackContainerEl}>
						{#if attackOpen}
							<div
								class="drop-menu {attackDir === 'up' ? 'drop-menu--up' : 'drop-menu--down'}"
							>
								{#each attackActions as action (targetId(action))}
									<button
										onclick={() => {
											onAction(action);
											attackOpen = false;
										}}
										class="drop-item"
									>
										{playerName(targetId(action))}
									</button>
								{/each}
							</div>
						{/if}
						<button onclick={toggleAttack} class="fight-btn fight-btn--attack w-full">
							<span class="flex-1 text-left">{$t('fight.attackBtn')}</span>
							{#if attackOpen}<ChevronUp size={16} />{:else}<ChevronDown size={16} />{/if}
						</button>
					</div>
				{/if}
				{#if shieldActions.length > 0}
					<div class="relative w-full" bind:this={shieldContainerEl}>
						{#if shieldOpen}
							<div
								class="drop-menu {shieldDir === 'up' ? 'drop-menu--up' : 'drop-menu--down'}"
							>
								{#each shieldActions as action (targetId(action))}
									<button
										onclick={() => {
											onAction(action);
											shieldOpen = false;
										}}
										class="drop-item"
									>
										{playerName(targetId(action))}{#if targetId(action) === myPlayerId}
											<span class="drop-item-you">({$t('common.you')})</span>{/if}
									</button>
								{/each}
							</div>
						{/if}
						<button onclick={toggleShield} class="fight-btn fight-btn--shield w-full">
							<span class="flex-1 text-left">{$t('fight.shieldBtn')}</span>
							{#if shieldOpen}<ChevronUp size={16} />{:else}<ChevronDown size={16} />{/if}
						</button>
					</div>
				{/if}
			</div>
		{:else}
			<p class="wait-text">{$t('common.waitingFor', { name: playerName(actingPlayerId) })}</p>
		{/if}
	</footer>
</div>

<!-- HISTORY DRAWER -->
{#if historyOpen}
	<button
		class="fixed inset-0 z-[100] cursor-default bg-black/30"
		onclick={() => (historyOpen = false)}
		aria-label="Close history"
	></button>
	<div class="hist-drawer">
		<div class="hist-header">
			<span class="hist-title">{$t('fight.historyTitle')}</span>
			<button onclick={() => (historyOpen = false)} class="hdr-btn">
				<X size={16} />
			</button>
		</div>
		<div class="hist-list">
			{#if gs.history.length === 0}
				<p class="hist-empty" aria-hidden="true">—</p>
			{:else}
				{#each [...gs.history].reverse() as entry, i (i)}
					<p class="hist-entry">
						<span class="hist-time">
							{new Date(entry.timestamp).toLocaleTimeString([], {
								hour: '2-digit',
								minute: '2-digit',
								hour12: $settings.timeFormat === '12'
							})}
						</span>
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
								: $t('fight.historyEliminatedDisconnect', {
										name: playerName(entry.targetId)
									})}
						{/if}
					</p>
				{/each}
			{/if}
		</div>
	</div>
{/if}

<!-- ACTION FLASH OVERLAY -->
{#if actionFlash !== null}
	<div
		class="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center gap-4"
		transition:fade={{ duration: 150 }}
	>
		{#key bannerType}
			<GameTitle
				title={bannerType === 'attack'
					? $t('fight.bannerAttack')
					: bannerType === 'blocked'
						? $t('fight.bannerBlocked')
						: bannerType === 'charge'
							? $t('fight.bannerCharge')
							: $t('fight.bannerShield')}
				show={bannerType !== null}
				entry={bannerType === 'attack'
					? 'slideDown'
					: bannerType === 'blocked'
						? 'letterStagger'
						: bannerType === 'charge'
							? 'fadeScale'
							: 'flipDown'}
				exit={bannerType === 'attack'
					? 'shrink'
					: bannerType === 'blocked'
						? 'blur'
						: bannerType === 'charge'
							? 'fadeOut'
							: 'shrink'}
				rotation={bannerType === 'attack' ? 'wobble' : bannerType === 'blocked' ? 'tilt' : 'none'}
				size={bannerType === 'charge' ? 'breathe' : 'pulse'}
				color={bannerType === 'attack'
					? 'red'
					: bannerType === 'blocked'
						? 'gold'
						: bannerType === 'charge'
							? 'yellow'
							: 'green'}
			/>
		{/key}
		<div class="flash-box">
			{#if actionFlash.type === 'ATTACK'}
				<p class="flash-actor">
					{$t('fight.flashAttack', {
						name: playerName(actionFlash.actorId),
						target: playerName(actionFlash.targetId)
					})}
				</p>
				<div class="flash-cards-row">
					<PlayingCard card={actionFlash.attackCard} size="md" />
					{#each actionFlash.chargeCards as cc}
						<span class="flash-op">+</span>
						<PlayingCard card={cc} size="md" />
					{/each}
				</div>
				<p class="{actionFlash.damage > 0 ? 'flash-damage' : 'flash-blocked'}">
					{actionFlash.damage > 0
						? $t('fight.flashDamage', { n: actionFlash.damage })
						: $t('fight.flashBlocked')}
				</p>
			{:else if actionFlash.type === 'CHANGE_SHIELD'}
				<p class="flash-actor">
					{actionFlash.actorId === actionFlash.targetId
						? $t('fight.flashShieldSelf', { name: playerName(actionFlash.actorId) })
						: $t('fight.flashShield', {
								name: playerName(actionFlash.actorId),
								target: playerName(actionFlash.targetId)
							})}
				</p>
				<div class="flash-cards-row">
					<PlayingCard card={actionFlash.oldShield} size="md" />
					<span class="flash-op">→</span>
					<PlayingCard card={actionFlash.newShield} size="md" />
				</div>
			{:else if actionFlash.type === 'CHARGE'}
				<p class="flash-actor">
					{$t('fight.flashCharge', { name: playerName(actionFlash.actorId) })}
				</p>
				<div class="flash-cards-row">
					<PlayingCard card={actionFlash.chargedCard} size="md" />
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- YOUR TURN / BONUS TURN FLASHES -->
<div class="pointer-events-none">
	<GameTitle
		title={$t('fight.yourTurn')}
		show={showTurnFlash}
		entry="bigEntrance"
		exit="shrink"
		rotation="wobble"
		size="pulse"
		color="default"
	/>
</div>
<div class="pointer-events-none">
	<GameTitle
		title={$t('fight.bonusTurn')}
		show={showBonusFlash}
		entry="bigEntrance"
		exit="explode"
		rotation="sway"
		size="breathe"
		color="fire"
	/>
</div>

{/if}

<style>
	/* ── INTRO ──────────────────────────────────────── */
	.intro-root {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		padding: 1.25rem;
		position: relative;
		background:
			radial-gradient(ellipse 65% 55% at 50% 50%, oklch(0.18 0.07 55 / 0.45) 0%, transparent 70%),
			oklch(0.10 0.02 25);
	}

	.skip-btn {
		position: absolute;
		top: calc(1rem + env(safe-area-inset-top));
		right: 1rem;
		padding: 0.375rem 0.75rem;
		border-radius: 2px;
		border: 1px solid oklch(1 0 0 / 10%);
		background: oklch(0.15 0.02 25);
		font-family: var(--font-heading);
		font-size: 0.8rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: oklch(0.48 0 0);
		cursor: pointer;
		transition: color 0.15s;
	}
	.skip-btn:hover { color: oklch(0.78 0 0); }

	.intro-header { text-align: center; }

	.intro-game-tag {
		font-family: var(--font-heading);
		font-size: 0.75rem;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: oklch(0.45 0.07 55);
		margin-bottom: 0.2rem;
	}

	.intro-phase-title {
		font-family: var(--font-heading);
		font-size: 2.2rem;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: oklch(0.90 0 0);
		line-height: 1;
	}

	.intro-fighters-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
	}

	.intro-fighter-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 0.875rem;
		border-radius: 3px;
		border: 1px solid oklch(1 0 0 / 8%);
		background: oklch(0.14 0.02 25);
		min-width: 88px;
		transition: border-color 0.3s, background 0.3s;
	}

	.intro-fighter-block--first {
		border-color: oklch(0.72 0.18 80 / 0.5);
		background: oklch(0.16 0.05 55);
	}

	.intro-fighter-name {
		font-family: var(--font-heading);
		font-size: 0.9rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: oklch(0.84 0 0);
	}

	.intro-cards-row { display: flex; gap: 0.25rem; }

	.intro-card { opacity: 0; transition: opacity 0.45s ease; }
	.intro-card--revealed { opacity: 1; }

	.intro-hp-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
	}

	.intro-hp-bar-track {
		flex: 1;
		height: 4px;
		border-radius: 2px;
		background: oklch(1 0 0 / 10%);
		overflow: hidden;
	}

	.intro-hp-bar-fill {
		height: 100%;
		border-radius: 2px;
		background: oklch(0.72 0.18 80);
		transition: width 0.7s ease;
	}

	.intro-hp-value {
		font-family: var(--font-heading);
		font-size: 0.72rem;
		letter-spacing: 0.07em;
		color: oklch(0.72 0.18 80);
		white-space: nowrap;
	}

	.intro-starter-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		text-align: center;
	}

	.intro-starter-label {
		font-family: var(--font-heading);
		font-size: 0.8rem;
		letter-spacing: 0.38em;
		text-transform: uppercase;
		color: oklch(0.48 0.07 55);
	}

	.intro-divider {
		width: 100px;
		height: 1px;
		background: linear-gradient(90deg, transparent, oklch(0.58 0.12 55 / 0.55), transparent);
	}

	.intro-starter-name {
		font-family: var(--font-heading);
		font-size: 3.8rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: oklch(0.92 0 0);
		line-height: 1;
	}

	/* ── ROOT ──────────────────────────────────────── */
	.fight-root {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		background:
			radial-gradient(ellipse 80% 50% at 50% 25%, oklch(0.16 0.05 50 / 0.3) 0%, transparent 65%),
			oklch(0.10 0.02 25);
	}

	/* ── HEADER ──────────────────────────────────── */
	.fight-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: calc(0.5rem + env(safe-area-inset-top)) 0.75rem 0.5rem 1rem;
		border-bottom: 1px solid oklch(1 0 0 / 8%);
		background: oklch(0.11 0.02 25 / 0.9);
		backdrop-filter: blur(8px);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.fight-game-name {
		font-family: var(--font-heading);
		font-size: 0.95rem;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: oklch(0.44 0.07 55);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.fight-turn-info {
		font-family: var(--font-heading);
		font-size: 0.78rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: oklch(0.56 0 0);
		text-align: center;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.fight-turn-info--bonus { color: oklch(0.72 0.18 80); }

	.fight-header-icons {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.hdr-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.45rem 0.45rem;
		color: oklch(0.48 0 0);
		background: none;
		border: none;
		border-radius: 2px;
		cursor: pointer;
		font-family: var(--font-heading);
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		transition: color 0.15s;
	}
	.hdr-btn:hover,
	.hdr-btn--active { color: oklch(0.80 0 0); }
	.hdr-btn--label { gap: 0.3rem; }

	.fighter-card {
		flex-shrink: 0;
		min-width: 108px;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.625rem;
		border-radius: 3px;
		border: 1px solid oklch(1 0 0 / 8%);
		background: oklch(0.14 0.02 25);
		transition: border-color 0.25s, background 0.25s, opacity 0.25s;
	}

	.fighter-card--active {
		border-color: oklch(0.72 0.18 80 / 0.5);
		background: oklch(0.16 0.04 55);
		box-shadow: inset 0 0 0 1px oklch(0.72 0.18 80 / 0.12);
	}

	.fighter-card--eliminated {
		opacity: 0.28;
		filter: grayscale(1);
	}

	.fighter-name {
		font-family: var(--font-heading);
		font-size: 0.88rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: oklch(0.84 0 0);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.fighter-hp-row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.hp-bar-track {
		flex: 1;
		height: 3px;
		border-radius: 2px;
		background: oklch(1 0 0 / 9%);
		overflow: hidden;
		min-width: 36px;
	}

	.hp-bar-fill {
		height: 100%;
		border-radius: 2px;
		transition: width 0.45s ease, background-color 0.3s ease;
	}

	.hp-value {
		font-family: var(--font-heading);
		font-size: 0.62rem;
		letter-spacing: 0.05em;
		color: oklch(0.45 0 0);
		white-space: nowrap;
	}

	.fighter-zones {
		display: flex;
		gap: 0.375rem;
		justify-content: center;
	}

	.arena-divider {
		width: 1px;
		height: 72px;
		background: linear-gradient(to bottom, transparent, oklch(0.48 0.10 55 / 0.4), transparent);
		flex-shrink: 0;
	}

	/* ── MY SECTION ────────────────────────────── */
	.my-section {
		border-top: 1px solid oklch(1 0 0 / 8%);
		background: oklch(0.12 0.02 25 / 0.6);
		padding: 0.875rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.my-name-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.my-name {
		font-family: var(--font-heading);
		font-size: 1.1rem;
		letter-spacing: 0.13em;
		text-transform: uppercase;
		color: oklch(0.88 0 0);
	}

	.my-you-tag {
		font-size: 0.68rem;
		letter-spacing: 0.04em;
		color: oklch(0.46 0 0);
		text-transform: none;
		font-family: var(--font-sans);
	}

	.my-hp {
		font-family: var(--font-heading);
		font-size: 0.9rem;
		letter-spacing: 0.1em;
		color: oklch(0.72 0.18 80);
		white-space: nowrap;
	}

	.my-elim-tag {
		font-family: var(--font-heading);
		font-size: 0.72rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: oklch(0.42 0 0);
	}

	.my-hp-bar-track {
		height: 5px;
		border-radius: 3px;
		background: oklch(1 0 0 / 8%);
		overflow: hidden;
	}

	.my-hp-bar-fill {
		height: 100%;
		border-radius: 3px;
		transition: width 0.5s ease, background-color 0.3s ease;
	}

	.my-cards-row {
		display: flex;
		justify-content: center;
		gap: 2rem;
		padding-top: 0.25rem;
	}

	/* ── FOOTER ACTIONS ───────────────────────── */
	.fight-footer {
		margin-top: auto;
		border-top: 1px solid oklch(1 0 0 / 8%);
		background: oklch(0.11 0.02 25 / 0.92);
		padding: 0.875rem 1rem;
		padding-bottom: calc(0.875rem + env(safe-area-inset-bottom));
	}

	.wait-text {
		font-family: var(--font-heading);
		font-size: 0.88rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: oklch(0.40 0 0);
		text-align: center;
		padding: 0.5rem 0;
	}

	.actions-col {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.bonus-strip {
		font-family: var(--font-heading);
		font-size: 0.72rem;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: oklch(0.72 0.18 80);
		text-align: center;
		padding: 0.25rem;
		border: 1px solid oklch(0.72 0.18 80 / 0.22);
		border-radius: 2px;
		background: oklch(0.72 0.18 80 / 0.05);
		animation: bonus-blink 1.6s ease-in-out infinite;
	}

	@keyframes bonus-blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
	}

	.fight-btn {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-radius: 3px;
		font-family: var(--font-heading);
		font-size: 1.05rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		cursor: pointer;
		transition: filter 0.15s ease, transform 0.1s ease;
	}
	.fight-btn:active { transform: scale(0.98); }

	.fight-btn--charge {
		background: oklch(0.17 0.07 290);
		color: oklch(0.70 0.20 290);
		border: 1px solid oklch(0.52 0.18 290 / 0.28);
	}
	.fight-btn--charge:hover { filter: brightness(1.28); }

	.fight-btn--attack {
		background: linear-gradient(
			135deg,
			oklch(0.20 0.08 25) 0%,
			oklch(0.30 0.16 25) 50%,
			oklch(0.20 0.08 25) 100%
		);
		color: oklch(0.88 0.08 25);
		border: 1px solid oklch(0.48 0.18 25 / 0.38);
		animation: atk-glow 2.8s ease-in-out infinite;
	}
	.fight-btn--attack:hover { filter: brightness(1.28); }

	@keyframes atk-glow {
		0%, 100% { box-shadow: 0 2px 12px oklch(0.30 0.16 25 / 0.28); }
		50% { box-shadow: 0 2px 22px oklch(0.36 0.18 25 / 0.52); }
	}

	.fight-btn--shield {
		background: oklch(0.15 0.04 235);
		color: oklch(0.60 0.10 235);
		border: 1px solid oklch(0.48 0.10 235 / 0.28);
	}
	.fight-btn--shield:hover { filter: brightness(1.28); }

	/* ── DROPDOWNS ─────────────────────────────── */
	.drop-menu {
		position: absolute;
		left: 0;
		right: 0;
		z-index: 20;
		border: 1px solid oklch(1 0 0 / 11%);
		border-radius: 3px;
		background: oklch(0.16 0.03 25);
		overflow: hidden;
		box-shadow: 0 8px 28px oklch(0 0 0 / 0.65);
	}

	.drop-menu--up { bottom: calc(100% + 4px); }
	.drop-menu--down { top: calc(100% + 4px); }

	.drop-item {
		display: block;
		width: 100%;
		padding: 0.72rem 1rem;
		text-align: left;
		font-family: var(--font-heading);
		font-size: 0.98rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: oklch(0.70 0 0);
		background: none;
		border: none;
		border-bottom: 1px solid oklch(1 0 0 / 7%);
		cursor: pointer;
		transition: background 0.1s, color 0.1s;
	}
	.drop-item:last-child { border-bottom: none; }
	.drop-item:hover { background: oklch(1 0 0 / 5%); color: oklch(0.94 0 0); }

	.drop-item-you {
		font-size: 0.72rem;
		color: oklch(0.42 0 0);
		text-transform: none;
		font-family: var(--font-sans);
		margin-left: 0.25rem;
	}

	/* ── HISTORY DRAWER ────────────────────────── */
	.hist-drawer {
		position: fixed;
		inset-block: 0;
		right: 0;
		z-index: 110;
		width: 17rem;
		max-width: 85vw;
		display: flex;
		flex-direction: column;
		border-left: 1px solid oklch(1 0 0 / 8%);
		background: oklch(0.12 0.02 25);
		box-shadow: -6px 0 36px oklch(0 0 0 / 0.55);
	}

	.hist-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid oklch(1 0 0 / 8%);
		padding: 0.45rem 0.75rem 0.45rem 1rem;
	}

	.hist-title {
		font-family: var(--font-heading);
		font-size: 0.75rem;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: oklch(0.42 0 0);
	}

	.hist-list { flex: 1; overflow-y: auto; }

	.hist-empty {
		padding: 0.75rem 1rem;
		font-size: 0.75rem;
		color: oklch(0.35 0 0);
	}

	.hist-entry {
		padding: 0.5rem 1rem;
		font-size: 0.72rem;
		color: oklch(0.52 0 0);
		border-bottom: 1px solid oklch(1 0 0 / 6%);
		line-height: 1.55;
	}
	.hist-entry:last-child { border-bottom: none; }

	.hist-time {
		margin-right: 0.35rem;
		color: oklch(0.38 0 0);
	}

	/* ── FLASH OVERLAY ─────────────────────────── */
	.flash-box {
		background: oklch(0.14 0.03 25);
		border: 1px solid oklch(1 0 0 / 11%);
		border-radius: 6px;
		padding: 1.25rem 1.75rem;
		text-align: center;
		box-shadow: 0 10px 44px oklch(0 0 0 / 0.85);
	}

	.flash-actor {
		font-family: var(--font-heading);
		font-size: 0.95rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: oklch(0.68 0 0);
		margin-bottom: 0.875rem;
	}

	.flash-cards-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.flash-op {
		font-family: var(--font-heading);
		font-size: 1.1rem;
		color: oklch(0.38 0 0);
	}

	.flash-damage {
		font-family: var(--font-heading);
		font-size: 1.3rem;
		letter-spacing: 0.20em;
		text-transform: uppercase;
		color: oklch(0.65 0.22 25);
		margin-top: 0.875rem;
	}

	.flash-blocked {
		font-family: var(--font-heading);
		font-size: 1.3rem;
		letter-spacing: 0.20em;
		text-transform: uppercase;
		color: oklch(0.50 0 0);
		margin-top: 0.875rem;
	}
</style>
