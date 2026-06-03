<script lang="ts">
import {
	Crown,
	Eye,
	EyeOff,
	Heart,
	LayoutList,
	Moon,
	Scale,
	Settings as SettingsIcon,
	Sun,
	X
} from 'lucide-svelte'
import { onDestroy } from 'svelte'
import { fade, fly } from 'svelte/transition'
import { playSoundUntilEnd, unlockAudio } from '$lib/audio/player'
import { type SoundDef, Sounds } from '$lib/audio/sounds'
import GameLayout from '$lib/components/games/GameLayout.svelte'
import PlayingCard from '$lib/components/PlayingCard.svelte'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
import { Button } from '$lib/components/ui/button'
import type { GameStateGeneric } from '$lib/core/types'
import type { Action } from '$lib/engine'
import { turnByKey } from '$lib/games/werewolf/turns'
import type { NightStepKey } from '$lib/games/werewolf/types'
import type { WerewolfState } from '$lib/games/werewolf/werewolf'
import { t } from '$lib/i18n'
import type { LobbyPlayer } from '$lib/network/messages'
import { settingsOpen } from '$lib/stores/settings'

let {
	state: gameState,
	myPlayerId,
	players,
	validActions,
	onAction,
	deckSlug = 'werewolf-deck'
}: {
	state: GameStateGeneric & WerewolfState
	myPlayerId: string
	players: LobbyPlayer[]
	validActions: Action[]
	onAction: (action: Action) => void
	deckSlug?: string
} = $props()

const s = $derived(gameState as WerewolfState)
const myRole = $derived(s.roles[myPlayerId])
const isAlive = $derived(s.alive.includes(myPlayerId))

const SINGLE_TARGET = [
	'PROTECT',
	'NIGHT_VOTE',
	'SEER_PEEK',
	'DAY_VOTE',
	'HUNTER_SHOOT',
	'MAYOR_VOTE',
	'MAYOR_SUCCESSOR'
]
const ACTION_TYPES = ['CUPID_LINK', 'WITCH_ACT', ...SINGLE_TARGET]
const NIGHT_ACTIONS = [
	'CUPID_LINK',
	'PROTECT',
	'NIGHT_VOTE',
	'WITCH_ACT',
	'SEER_PEEK',
	'HUNTER_SHOOT'
]

const myActionType = $derived(validActions.find((a) => ACTION_TYPES.includes(a.type))?.type ?? null)
const isCupidTurn = $derived(myActionType === 'CUPID_LINK')
const isWitchTurn = $derived(myActionType === 'WITCH_ACT')
const isSingleTarget = $derived(myActionType !== null && SINGLE_TARGET.includes(myActionType))
const canNextPhase = $derived(validActions.some((a) => a.type === 'NEXT_PHASE'))
const canPlayerReady = $derived(validActions.some((a) => a.type === 'PLAYER_READY'))
const allReady = $derived(s.readyPlayers.length >= s.players.length)
const isMyTurn = $derived(myActionType !== null)
const isNightAction = $derived(myActionType !== null && NIGHT_ACTIONS.includes(myActionType))

let selectedTarget = $state<string | null>(null)
let selectedLovers = $state<string[]>([])
let witchSave = $state(false)
let witchPoison = $state(false)
let revealDone = $state(false)
let cardRevealed = $state(false)
let showDesc = $state(false)
let hidden = $state(true)
let showComposition = $state(false)
let now = $state(Date.now())
$effect(() => {
	const id = setInterval(() => {
		now = Date.now()
	}, 250)
	return () => clearInterval(id)
})

// Reset selections whenever the active phase/step changes
$effect(() => {
	void s.nightStep
	void s.phase
	void s.daySubPhase
	void s.pendingHunter
	selectedTarget = null
	selectedLovers = []
	witchSave = false
	witchPoison = false
})

// Auto-reveal my card only on night actions (privacy). Day votes don't flip it.
$effect(() => {
	hidden = !isNightAction
})

// ── Narration ── play voice cues on phase/step transitions. A transition can
// emit several cues (e.g. night start = "night falls" + first role); they're
// queued and played one after another, each waiting for the previous clip to
// finish (+ a short breath) so they never overlap. The longer pause *between*
// night turns is enforced by the engine (nightGap), not here. Each client
// narrates locally; starts once everyone is ready.
const CUE_BREATH_MS = 400
let narrPhase: string | undefined
let narrStep: NightStepKey | null | undefined
let narrQueue: SoundDef[] = []
let narrRunning = false
let narrAlive = true

async function pump() {
	if (narrRunning) return
	narrRunning = true
	while (narrAlive && narrQueue.length > 0) {
		await playSoundUntilEnd(narrQueue.shift()!)
		if (narrAlive && narrQueue.length > 0) {
			await new Promise((r) => setTimeout(r, CUE_BREATH_MS))
		}
	}
	narrRunning = false
}

function playCues(cues: SoundDef[]) {
	unlockAudio()
	narrQueue.push(...cues)
	pump()
}

onDestroy(() => {
	narrAlive = false
})
$effect(() => {
	const phase = s.phase
	const step = s.nightStep
	if (!allReady) return

	const cues: SoundDef[] = []
	const sleepOf = (k: NightStepKey | null | undefined) => (k ? turnByKey(k)?.sleepVoice : undefined)
	const wakeOf = (k: NightStepKey | null | undefined) => (k ? turnByKey(k)?.wakeVoice : undefined)
	const push = (v: SoundDef | undefined) => {
		if (v) cues.push(v)
	}

	if (phase === 'gameover') {
		if (narrPhase !== 'gameover') {
			push(
				s.winTeam === 'werewolves'
					? Sounds.voice.WolvesWin
					: s.winTeam === 'lovers'
						? Sounds.voice.LoversWin
						: Sounds.voice.VillageWins
			)
		}
	} else if (phase === 'night') {
		if (narrPhase !== 'night') {
			push(Sounds.voice.NightFalls)
			push(wakeOf(step))
		} else if (step !== narrStep) {
			push(sleepOf(narrStep))
			// Lovers recognise each other after Cupid acts, first night only.
			if (narrStep === 'cupid' && s.lovers && s.round === 1) {
				push(Sounds.voice.LoversWake)
				push(Sounds.voice.LoversSleep)
			}
			push(wakeOf(step))
		}
	} else if (phase === 'day') {
		if (narrPhase === 'night') {
			push(sleepOf(narrStep))
			push(Sounds.voice.DayBreaks)
		}
	}

	narrPhase = phase
	narrStep = step

	if (cues.length > 0) playCues(cues)
})

function playerName(id: string) {
	return players.find((p) => p.id === id)?.name ?? id
}

function roleLabel(role: string) {
	if (role === 'werewolf') return $t('werewolf.roleWerewolf')
	if (role === 'seer') return $t('werewolf.roleSeer')
	if (role === 'witch') return $t('werewolf.roleWitch')
	if (role === 'hunter') return $t('werewolf.roleHunter')
	if (role === 'cupid') return $t('werewolf.roleCupid')
	if (role === 'defender') return $t('werewolf.roleDefender')
	if (role === 'elder') return $t('werewolf.roleElder')
	if (role === 'scapegoat') return $t('werewolf.roleScapegoat')
	if (role === 'village-idiot') return $t('werewolf.roleVillageIdiot')
	return $t('werewolf.roleVillager')
}

function roleDesc(role: string) {
	if (role === 'werewolf') return $t('werewolf.desc.werewolf')
	if (role === 'seer') return $t('werewolf.desc.seer')
	if (role === 'witch') return $t('werewolf.desc.witch')
	if (role === 'hunter') return $t('werewolf.desc.hunter')
	if (role === 'cupid') return $t('werewolf.desc.cupid')
	if (role === 'defender') return $t('werewolf.desc.defender')
	if (role === 'elder') return $t('werewolf.desc.elder')
	if (role === 'scapegoat') return $t('werewolf.desc.scapegoat')
	if (role === 'village-idiot') return $t('werewolf.desc.villageIdiot')
	return $t('werewolf.desc.villager')
}

const actionLabel = $derived(
	myActionType === 'SEER_PEEK'
		? $t('werewolf.peek')
		: myActionType === 'PROTECT'
			? $t('werewolf.protect')
			: myActionType === 'HUNTER_SHOOT'
				? $t('werewolf.shoot')
				: $t('werewolf.vote')
)

// A player can currently be tapped as a target
const canSelect = $derived(isSingleTarget || isCupidTurn || (isWitchTurn && witchPoison))

function selectable(pid: string, alive: boolean) {
	if (!canSelect || !alive || s.phase === 'gameover') return false
	if (myActionType === 'PROTECT' && pid === s.defenderLast) return false
	return true
}

function isSelected(pid: string) {
	return isCupidTurn ? selectedLovers.includes(pid) : selectedTarget === pid
}

function tapPlayer(pid: string) {
	if (isCupidTurn) {
		if (selectedLovers.includes(pid)) selectedLovers = selectedLovers.filter((x) => x !== pid)
		else if (selectedLovers.length < 2) selectedLovers = [...selectedLovers, pid]
	} else {
		selectedTarget = selectedTarget === pid ? null : pid
	}
}

function submitSingle() {
	if (!selectedTarget || !myActionType) return
	onAction({ type: myActionType, playerId: myPlayerId, payload: { target: selectedTarget } })
	selectedTarget = null
}

function submitProtect() {
	const target = selectedTarget ?? myPlayerId
	onAction({ type: 'PROTECT', playerId: myPlayerId, payload: { target } })
	selectedTarget = null
}

function submitMayorVote() {
	const target = selectedTarget ?? myPlayerId
	onAction({ type: 'MAYOR_VOTE', playerId: myPlayerId, payload: { target } })
	selectedTarget = null
}

const myLover = $derived.by(() => {
	if (!s.lovers) return null
	if (s.lovers[0] === myPlayerId) return s.lovers[1]
	if (s.lovers[1] === myPlayerId) return s.lovers[0]
	return null
})

function submitCupid() {
	if (selectedLovers.length !== 2) return
	onAction({ type: 'CUPID_LINK', playerId: myPlayerId, payload: { lovers: selectedLovers } })
	selectedLovers = []
}

function submitWitch() {
	onAction({
		type: 'WITCH_ACT',
		playerId: myPlayerId,
		payload: { save: witchSave, kill: witchPoison && selectedTarget ? selectedTarget : undefined }
	})
	witchSave = false
	witchPoison = false
	selectedTarget = null
}

// Wolves' current target (visible to witch)
const witchVictim = $derived.by(() => {
	const counts: Record<string, number> = {}
	for (const tgt of Object.values(s.nightVotes)) counts[tgt] = (counts[tgt] ?? 0) + 1
	let best: string | null = null
	let bestC = 0
	for (const [k, c] of Object.entries(counts))
		if (c > bestC) {
			best = k
			bestC = c
		}
	return best
})

// Others in clockwise order from my left neighbour
const others = $derived.by(() => {
	const total = s.players.length
	const myIdx = s.players.indexOf(myPlayerId)
	return Array.from({ length: total - 1 }, (_, i) => s.players[(myIdx + 1 + i) % total])
})

const dayVoteCount = $derived(Object.keys(s.dayVotes).length)

function stepLabel(step: string | null) {
	if (step === 'cupid') return $t('werewolf.phaseCupid')
	if (step === 'defender') return $t('werewolf.phaseDefender')
	if (step === 'wolves') return $t('werewolf.phaseWolves')
	if (step === 'witch') return $t('werewolf.phaseWitch')
	if (step === 'seer') return $t('werewolf.phaseSeer')
	return ''
}

const isNightlike = $derived(s.phase === 'night' || s.pendingHunter !== null)

const isMayorMoment = $derived(
	s.pendingMayor !== null || (s.phase === 'day' && s.daySubPhase === 'electing')
)

const centerState = $derived(
	s.phase === 'gameover'
		? 'gameover'
		: s.pendingMayor
			? 'mayor-succession'
			: s.pendingHunter
				? `hunter-${isMyTurn ? '1' : '0'}`
				: s.phase === 'night'
					? `night-${s.nightStep}-${isMyTurn ? '1' : '0'}`
					: s.daySubPhase === 'electing'
						? 'day-electing'
						: s.daySubPhase === 'talking'
							? 'day-talking'
							: 'day-voting'
)

const CenterIcon = $derived(
	s.phase === 'gameover'
		? null
		: isMayorMoment
			? Crown
			: isNightlike
				? isMyTurn
					? Eye
					: Moon
				: s.daySubPhase === 'talking'
					? Sun
					: Scale
)

const subPhaseLabel = $derived(
	s.phase === 'gameover'
		? ''
		: s.pendingMayor
			? $t('werewolf.mayorTurn')
			: s.pendingHunter
				? $t('werewolf.phaseHunter')
				: s.phase === 'night'
					? stepLabel(s.nightStep)
					: s.daySubPhase === 'electing'
						? $t('werewolf.phaseMayorElection')
						: s.daySubPhase === 'talking'
							? $t('werewolf.phaseTalking')
							: $t('werewolf.phaseVoting')
)

const winLabel = $derived(
	s.winTeam === 'werewolves'
		? $t('werewolf.winsWerewolves')
		: s.winTeam === 'lovers'
			? $t('werewolf.winsLovers')
			: $t('werewolf.winsVillagers')
)

// Timer disc progress (1 = full, 0 = empty)
const timerProgress = $derived.by(() => {
	if (!s.phaseEndTime || !s.phaseDurationMs || s.phase === 'gameover') return null
	// Between-turn pause: keep the disc full, like it's on standby.
	if (s.nightGap !== null) return 1
	return Math.max(0, s.phaseEndTime - now) / s.phaseDurationMs
})

const gameRoles = $derived.by(() => {
	const opts = s.options
	const result: Array<{ role: string; count: number }> = []
	const push = (role: string, count: number) => {
		if (count > 0) result.push({ role, count })
	}
	push('werewolf', opts.werewolfCount)
	push('seer', opts.seerCount)
	push('witch', opts.witchCount)
	push('hunter', opts.hunterCount)
	push('cupid', opts.cupidCount)
	push('defender', opts.defenderCount)
	push('elder', opts.elderCount)
	push('scapegoat', opts.scapegoatCount)
	push('village-idiot', opts.villageIdiotCount)
	push('villager', opts.villagerCount)
	return result
})
</script>

<!-- ── Revelation modal ── -->
{#if !revealDone}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
		<div class="flex flex-col items-center gap-5 rounded-xl border border-border bg-card p-6 shadow-xl">
			<h2 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
				{$t('werewolf.revealTitle')}
			</h2>

			<div
				onclick={() => !cardRevealed && (cardRevealed = true)}
				style="perspective: 600px; width: 128px; height: 128px; cursor: {cardRevealed ? 'default' : 'pointer'}"
				role="button"
				tabindex="0"
				onkeydown={(e) => e.key === 'Enter' && !cardRevealed && (cardRevealed = true)}
				aria-label={$t('werewolf.revealHint')}
			>
				<div style="position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.55s ease; transform: rotateY({cardRevealed ? 180 : 0}deg)">
					<div style="position: absolute; inset: 0; backface-visibility: hidden">
						<PlayingCard card={{ id: 'reveal-back', face: 'hidden', isHidden: true }} back {deckSlug} size="lg" />
					</div>
					<div style="position: absolute; inset: 0; backface-visibility: hidden; transform: rotateY(180deg)">
						<PlayingCard card={{ id: myRole + '-reveal', face: myRole, isHidden: false }} {deckSlug} size="lg" />
					</div>
				</div>
			</div>

			{#if !cardRevealed}
				<p class="text-xs text-muted-foreground">{$t('werewolf.revealHint')}</p>
			{:else}
				<div class="flex flex-col items-center gap-1 text-center">
					<p class="text-base font-bold {myRole === 'werewolf' ? 'text-red-500' : myRole === 'seer' ? 'text-purple-400' : 'text-foreground'}">
						{roleLabel(myRole)}
					</p>
					{#if showDesc}
						<p class="mt-1 max-w-[220px] text-xs text-muted-foreground">{roleDesc(myRole)}</p>
					{/if}
				</div>
				<div class="flex gap-3">
					<Button onclick={() => { revealDone = true; if (canPlayerReady) onAction({ type: 'PLAYER_READY', playerId: myPlayerId }) }}>{$t('common.close')}</Button>
					<Button variant="outline" onclick={() => (showDesc = !showDesc)}>
						{$t('werewolf.explanations')}
					</Button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- ── Composition sheet ── -->
{#if showComposition}
	<div
		class="fixed inset-0 z-40 flex items-end bg-black/50"
		role="button"
		tabindex="-1"
		onclick={(e) => { if (e.target === e.currentTarget) showComposition = false }}
		onkeydown={(e) => e.key === 'Escape' && (showComposition = false)}
		aria-label="Close composition"
	>
		<div
			class="max-h-[70vh] w-full overflow-y-auto rounded-t-2xl border-t border-border bg-card p-4 pb-10"
			in:fly={{ y: 200, duration: 250 }}
			out:fly={{ y: 200, duration: 200 }}
		>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-sm font-semibold">{$t('werewolf.composition')}</h2>
				<button onclick={() => (showComposition = false)} class="text-muted-foreground hover:text-foreground">
					<X size={18} />
				</button>
			</div>
			<div class="flex flex-col gap-4">
				{#each gameRoles as { role, count }}
					<div class="flex items-start gap-3">
						<div class="shrink-0">
							<PlayingCard card={{ id: `comp-${role}`, face: role, isHidden: false }} {deckSlug} size="sm" />
						</div>
						<div class="flex flex-1 flex-col gap-0.5">
							<span class="text-sm font-medium {role === 'werewolf' ? 'text-red-500' : role === 'seer' ? 'text-purple-400' : 'text-foreground'}">
								{roleLabel(role)}{count > 1 ? ` ×${count}` : ''}
							</span>
							<span class="text-xs leading-relaxed text-muted-foreground">{roleDesc(role)}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<!-- ── Main layout ── -->
<div class="flex h-svh flex-col bg-background">

	<!-- Header -->
	<header class="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-2">
		<div class="flex items-center gap-2">
			<span class="text-xs font-mono uppercase tracking-widest text-muted-foreground">{$t('werewolf.name')}</span>
			{#if subPhaseLabel}
				<span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase
					{isNightlike ? 'bg-indigo-900 text-indigo-200' : 'bg-amber-500/20 text-amber-300'}">
					{subPhaseLabel}
				</span>
			{/if}
		</div>
		<div class="flex items-center gap-1">
			<button
				onclick={() => ($settingsOpen = true)}
				class="flex items-center rounded p-2 text-muted-foreground transition-colors hover:text-foreground"
				aria-label={$t('settings.title')}
			>
				<SettingsIcon size={16} />
			</button>
			<RulesDrawer gameId="werewolf" size={16} />
		</div>
	</header>

	<!-- Banner: last eliminated -->
	{#if s.lastEliminated.length > 0}
		<div class="shrink-0 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
			{#each s.lastEliminated as id, i}{i > 0 ? ', ' : ''}{playerName(id)}{/each} — {$t('werewolf.eliminated')}
		</div>
	{/if}

	{#snippet center()}
		<div class="flex items-center gap-3">
			{#key centerState}
				<div
					in:fly={{ y: 8, duration: 250 }}
					out:fade={{ duration: 150 }}
					class="pointer-events-none relative flex items-center justify-center"
					style="width: 80px; height: 80px;"
				>
					{#if s.phase === 'gameover'}
						<p
							class="text-center text-sm font-bold {s.winTeam === 'werewolves'
								? 'text-red-500'
								: s.winTeam === 'lovers'
									? 'text-pink-400'
									: 'text-emerald-400'}"
						>
							{winLabel}
						</p>
					{:else}
						<div class="absolute inset-0 opacity-25">
							{#if timerProgress !== null}
								<div
									class="absolute inset-0 rounded-full"
									style="background: conic-gradient(white 0deg {timerProgress * 360}deg, transparent {timerProgress * 360}deg 360deg)"
								></div>
							{/if}
							<div
								class="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
							></div>
						</div>
						{#if CenterIcon}
							{@const Icon = CenterIcon}
							<Icon class="relative z-10 h-8 w-8 text-foreground" />
						{/if}
						{#if s.phase === 'day' && s.daySubPhase === 'voting'}
							<span
								class="absolute -bottom-5 tabular-nums text-xs font-medium text-muted-foreground"
								>{dayVoteCount}/{s.alive.length}</span
							>
						{/if}
					{/if}
				</div>
			{/key}
			{#if subPhaseLabel && s.phase !== 'gameover'}
				<div class="flex flex-col gap-0.5 md:hidden">
					<span class="text-sm font-semibold text-foreground">{subPhaseLabel}</span>
					{#if s.phase === 'day' && s.daySubPhase === 'voting'}
						<span class="text-xs text-muted-foreground">{dayVoteCount}/{s.alive.length}</span>
					{/if}
				</div>
			{/if}
		</div>
	{/snippet}

	{#snippet opponentTile(pid: string)}
		{@const alive = s.alive.includes(pid)}
		{@const sel = isSelected(pid)}
		{@const canTap = selectable(pid, alive)}
		{@const role = s.roles[pid]}
		{@const isSeerTarget = myRole === 'seer' && s.seerReveal?.target === pid}
		{@const faceUp =
			!alive ||
			s.phase === 'gameover' ||
			(isSeerTarget && !hidden) ||
			(s.roles[pid] === 'village-idiot' && s.idiotRevealed)}
		<button
			disabled={!canTap}
			onclick={() => {
				if (canTap) tapPlayer(pid)
			}}
			class="flex flex-col items-center gap-1 transition-opacity
				{!alive ? 'opacity-30' : ''}
				{canTap ? 'cursor-pointer' : 'cursor-default'}"
		>
			<div
				class="rounded-lg transition-transform duration-150 {sel
					? 'ring-4 ring-blue-500 scale-110'
					: s.mayor === pid
						? 'ring-4 ring-yellow-400'
						: ''}"
				style="perspective: 600px; width: 64px; height: 64px;"
			>
				<div
					style="position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.5s ease; transform: rotateY({faceUp
						? 180
						: 0}deg)"
				>
					<div style="position: absolute; inset: 0; backface-visibility: hidden">
						<PlayingCard
							card={{ id: `${pid}-back`, face: 'hidden', isHidden: true }}
							back
							{deckSlug}
							size="sm"
						/>
					</div>
					<div style="position: absolute; inset: 0; backface-visibility: hidden; transform: rotateY(180deg)">
						<PlayingCard
							card={{ id: `${pid}-role`, face: role, isHidden: false }}
							{deckSlug}
							size="sm"
						/>
					</div>
				</div>
			</div>
			<span class="max-w-[64px] truncate whitespace-nowrap text-[10px] leading-tight text-muted-foreground">
				{playerName(pid)}
			</span>
			{#if s.phase === 'day' && s.daySubPhase === 'voting' && s.dayVotes[pid] && alive}
				<div class="h-1.5 w-1.5 rounded-full bg-amber-400"></div>
			{/if}
		</button>
	{/snippet}

	<GameLayout opponents={others} {opponentTile} {center} />

	<!-- ── Footer: my card — compact floating card ── -->
	<div class="shrink-0 flex justify-center mb-4">
	<div class="w-52 rounded-2xl border border-border bg-card/95 shadow-lg overflow-hidden" style="backdrop-filter: blur(8px)">
		<div class="flex flex-col items-center gap-2 px-4 py-3">

			<!-- 3D flip card -->
			<div
				onclick={() => (hidden = !hidden)}
				class="rounded-lg {s.mayor === myPlayerId ? 'ring-4 ring-yellow-400' : ''}"
				style="perspective: 600px; width: 96px; height: 96px; cursor: pointer;"
				role="button"
				tabindex="0"
				onkeydown={(e) => e.key === 'Enter' && (hidden = !hidden)}
				aria-label={hidden ? $t('werewolf.showCards') : $t('werewolf.hideCards')}
			>
				<div style="position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.4s ease; transform: rotateY({hidden ? 0 : 180}deg)">
					<div style="position: absolute; inset: 0; backface-visibility: hidden">
						<PlayingCard card={{ id: 'me-back', face: 'hidden', isHidden: true }} back {deckSlug} size="md" />
					</div>
					<div style="position: absolute; inset: 0; backface-visibility: hidden; transform: rotateY(180deg)">
						<PlayingCard card={{ id: 'me-role', face: myRole, isHidden: false }} {deckSlug} size="md" />
					</div>
				</div>
			</div>

			<!-- 2 icon buttons -->
			<div class="flex gap-2">
				<button
					onclick={() => (hidden = !hidden)}
					class="flex items-center rounded-lg p-1.5 transition-colors
						{hidden ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
					aria-label={hidden ? $t('werewolf.showCards') : $t('werewolf.hideCards')}
				>
					{#if hidden}<EyeOff size={18} />{:else}<Eye size={18} />{/if}
				</button>
				<button
					onclick={() => (showComposition = !showComposition)}
					class="flex items-center rounded-lg p-1.5 transition-colors
						{showComposition ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
					aria-label={$t('werewolf.composition')}
				>
					<LayoutList size={18} />
				</button>
			</div>

			{#if myLover && !hidden}
				<div class="flex items-center gap-1.5 rounded-full bg-pink-500/15 px-3 py-1 text-xs font-medium text-pink-400">
					<Heart size={13} class="fill-current" />
					<span>{$t('werewolf.inLove', { name: playerName(myLover) })}</span>
				</div>
			{/if}

			<!-- Actions -->
			{#if !allReady}
				<p class="text-center text-xs text-muted-foreground animate-pulse">
					{$t('werewolf.waitingReady', { n: s.players.length - s.readyPlayers.length })}
				</p>
			{:else if isCupidTurn}
				<Button disabled={selectedLovers.length !== 2} onclick={submitCupid} class="w-full">
					{selectedLovers.length === 2 ? $t('werewolf.linkLovers') : $t('werewolf.selectLovers')}
				</Button>
			{:else if isWitchTurn}
				<p class="text-center text-xs text-muted-foreground">
					{witchVictim ? $t('werewolf.witchVictim', { name: playerName(witchVictim) }) : $t('werewolf.witchNoVictim')}
				</p>
				<div class="flex w-full gap-2">
					{#if !s.witchSaveUsed}
						<Button variant={witchSave ? 'default' : 'outline'} disabled={!witchVictim} onclick={() => (witchSave = !witchSave)} class="flex-1">
							{$t('werewolf.witchSave')}
						</Button>
					{/if}
					{#if !s.witchKillUsed}
						<Button variant={witchPoison ? 'default' : 'outline'} onclick={() => { witchPoison = !witchPoison; if (!witchPoison) selectedTarget = null }} class="flex-1">
							{$t('werewolf.witchPoison')}
						</Button>
					{/if}
				</div>
				<Button onclick={submitWitch} class="w-full">{$t('werewolf.witchDone')}</Button>
			{:else if myActionType === 'PROTECT'}
				<Button disabled={!selectedTarget && s.defenderLast === myPlayerId} onclick={submitProtect} class="w-full">
					{selectedTarget ? $t('werewolf.protectName', { name: playerName(selectedTarget) }) : $t('werewolf.protectMyself')}
				</Button>
			{:else if myActionType === 'MAYOR_VOTE'}
				<Button onclick={submitMayorVote} class="w-full">
					{selectedTarget ? $t('werewolf.electMayor', { name: playerName(selectedTarget) }) : $t('werewolf.electMyself')}
				</Button>
			{:else if myActionType === 'MAYOR_SUCCESSOR'}
				<Button disabled={!selectedTarget} onclick={submitSingle} class="w-full">
					{selectedTarget ? $t('werewolf.appointMayor', { name: playerName(selectedTarget) }) : $t('werewolf.selectMayor')}
				</Button>
			{:else if isSingleTarget}
				<Button disabled={!selectedTarget} onclick={submitSingle} class="w-full">
					{selectedTarget ? actionLabel : $t('werewolf.selectTarget')}
				</Button>
			{:else if s.pendingMayor}
				<p class="text-center text-xs text-muted-foreground animate-pulse">{$t('werewolf.mayorTurn')}</p>
			{:else if s.pendingHunter}
				<p class="text-center text-xs text-muted-foreground animate-pulse">{$t('werewolf.hunterTurn')}</p>
			{:else if s.phase === 'day' && s.daySubPhase === 'talking' && isAlive}
				<p class="text-xs text-muted-foreground animate-pulse">{$t('werewolf.phaseTalking')}…</p>
			{:else if s.phase !== 'gameover' && isAlive}
				<p class="text-xs text-muted-foreground animate-pulse">{$t('werewolf.waitingVotes')}</p>
			{/if}
			{#if canNextPhase}
				<Button variant="outline" onclick={() => onAction({ type: 'NEXT_PHASE', playerId: myPlayerId })} class="w-full">
					{$t('werewolf.nextPhase')}
				</Button>
			{/if}
		</div>
	</div>
	</div>

</div>
