<script lang="ts">
import type { Component } from 'svelte'
import type { GameStateGeneric } from '$lib/core/types'
import type { Action, GameDefinition } from '$lib/engine'

type S = GameStateGeneric & Record<string, unknown>

let {
	def,
	View,
	Controls,
	createState,
	initialCount = 6,
	nameFor = (id: string) => id,
	seatBadge = (_s: S, _id: string) => '',
	isAlive = (_s: S, _id: string) => true,
	deckSlug
}: {
	def: GameDefinition<S>
	// biome-ignore lint/suspicious/noExplicitAny: game views have heterogeneous prop shapes
	View: Component<any>
	Controls?: Component<{ gs: S; onChange: (next: S) => void; viewSeat: string }>
	createState: (count: number) => S
	initialCount?: number
	nameFor?: (id: string) => string
	seatBadge?: (state: S, id: string) => string
	isAlive?: (state: S, id: string) => boolean
	deckSlug?: string
} = $props()

// svelte-ignore state_referenced_locally
let playerCount = $state(initialCount)
// svelte-ignore state_referenced_locally
let gs = $state<S>(createState(initialCount))
let viewSeat = $state('p1')
let autoTick = $state(false)
let panelOpen = $state(true)
let now = $state(Date.now())

let jsonText = $state('')
let jsonError = $state<string | null>(null)
let editing = $state(false)

const players = $derived(gs.players.map((id) => ({ id, name: nameFor(id) })))
const validActions = $derived(def.getValidActions(gs, viewSeat))
const log = $state<string[]>([])

function setState(next: S) {
	gs = next
}

function rebuild(n: number) {
	playerCount = n
	gs = createState(n)
	viewSeat = 'p1'
	log.length = 0
}

function onAction(action: Action) {
	gs = def.applyAction(gs, action)
	log.unshift(
		`${action.playerId} → ${action.type}${action.payload ? ' ' + JSON.stringify(action.payload) : ''}`
	)
}

function applyJson() {
	try {
		gs = JSON.parse(jsonText) as S
		jsonError = null
	} catch (e) {
		jsonError = (e as Error).message
	}
}

// Mirror state into the editor unless the user is mid-edit.
$effect(() => {
	const snap = JSON.stringify(gs, null, 2)
	if (!editing) jsonText = snap
})

// Optional timer auto-advance (mimics the host's scheduleAction loop).
$effect(() => {
	const id = setInterval(() => {
		now = Date.now()
		if (!autoTick || !def.scheduleAction) return
		const end = gs.phaseEndTime as number | null | undefined
		if (end && now >= end) {
			const sched = def.scheduleAction(gs)
			if (sched) onAction(sched.action)
		}
	}, 300)
	return () => clearInterval(id)
})

const end = $derived(gs.phaseEndTime as number | null | undefined)
const timeLeft = $derived(end ? Math.max(0, Math.round((end - now) / 1000)) : null)
</script>

<div class="relative min-h-dvh">
	<View
		state={gs as never}
		myPlayerId={viewSeat}
		{players}
		{validActions}
		{onAction}
		{deckSlug}
	/>

	<button
		onclick={() => (panelOpen = !panelOpen)}
		class="fixed right-3 top-3 z-[200] rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-lg"
	>
		{panelOpen ? 'Hide' : 'Sandbox'}
	</button>

	{#if panelOpen}
		<div class="fixed right-3 top-12 z-[200] flex max-h-[88vh] w-80 flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-card/95 p-3 text-xs shadow-xl" style="backdrop-filter: blur(8px)">
			<div class="flex items-center justify-between">
				<span class="font-bold">{def.name} sandbox</span>
				<a href="/lab/sandbox" class="text-muted-foreground hover:text-foreground">← games</a>
			</div>

			<!-- player count -->
			<label class="flex items-center justify-between gap-2">
				<span>Players: {playerCount}</span>
				<input type="range" min={def.minPlayers} max={def.maxPlayers} value={playerCount} oninput={(e) => rebuild(+e.currentTarget.value)} class="flex-1" />
			</label>
			<button onclick={() => rebuild(playerCount)} class="rounded bg-secondary px-2 py-1 font-medium">Reshuffle / reset</button>

			<!-- generic phase summary -->
			<div class="rounded bg-muted/50 p-2 leading-relaxed">
				<div>phase: <b>{gs.phase}</b></div>
				<div>players: {gs.players.length} · timer: {timeLeft === null ? 'off' : `${timeLeft}s`}</div>
			</div>

			<label class="flex items-center gap-2">
				<input type="checkbox" bind:checked={autoTick} />
				<span>Auto-advance on timer</span>
			</label>

			<!-- seat switcher -->
			<div>
				<div class="mb-1 font-medium text-muted-foreground">View as seat</div>
				<div class="flex flex-col gap-1">
					{#each gs.players as pid}
						{@const alive = isAlive(gs, pid)}
						<button
							onclick={() => (viewSeat = pid)}
							class="flex items-center justify-between rounded px-2 py-1 text-left
								{viewSeat === pid ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:opacity-80'}
								{alive ? '' : 'opacity-50 line-through'}"
						>
							<span>{nameFor(pid)}</span>
							<span class="opacity-70">{seatBadge(gs, pid)}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- game-specific controls -->
			{#if Controls}
				<div class="rounded-lg border border-border p-2">
					<Controls gs={gs} onChange={setState} {viewSeat} />
				</div>
			{/if}

			<!-- raw state editor (always available) -->
			<div>
				<div class="mb-1 font-medium text-muted-foreground">Raw state (editable)</div>
				<textarea
					bind:value={jsonText}
					onfocus={() => (editing = true)}
					onblur={() => (editing = false)}
					spellcheck="false"
					class="h-48 w-full resize-y rounded border border-border bg-background p-2 font-mono text-[10px] leading-tight"
				></textarea>
				{#if jsonError}<p class="text-destructive">{jsonError}</p>{/if}
				<button onmousedown={(e) => e.preventDefault()} onclick={applyJson} class="mt-1 w-full rounded bg-primary px-2 py-1 font-medium text-primary-foreground">Apply JSON</button>
			</div>

			<!-- action log -->
			{#if log.length}
				<div>
					<div class="mb-1 font-medium text-muted-foreground">Actions</div>
					<div class="flex flex-col gap-0.5 font-mono text-[10px]">
						{#each log.slice(0, 12) as line}<div>{line}</div>{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
