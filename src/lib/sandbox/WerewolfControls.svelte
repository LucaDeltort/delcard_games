<script lang="ts">
import type { WerewolfState } from '$lib/games/werewolf/werewolf'
import { nameFor } from '$lib/sandbox/werewolf-sandbox'

let {
	gs,
	onChange,
	viewSeat
}: {
	gs: WerewolfState
	onChange: (next: WerewolfState) => void
	viewSeat: string
} = $props()

// svelte-ignore state_referenced_locally
let target = $state(viewSeat)
$effect(() => {
	if (!gs.players.includes(target)) target = gs.players[0]
})

const NIGHT_STEPS = ['cupid', 'defender', 'wolves', 'witch', 'seer'] as const

function kill(pid: string) {
	onChange({ ...gs, alive: gs.alive.filter((p) => p !== pid), lastEliminated: [pid] })
}
function revive(pid: string) {
	if (gs.alive.includes(pid)) return
	onChange({ ...gs, alive: [...gs.alive, pid] })
}
function setPhase(phase: WerewolfState['phase'], nightStep: WerewolfState['nightStep'] = null) {
	onChange({ ...gs, phase, nightStep })
}
function setStep(nightStep: WerewolfState['nightStep']) {
	onChange({ ...gs, phase: 'night', nightStep })
}
function setDaySub(daySubPhase: WerewolfState['daySubPhase']) {
	onChange({ ...gs, phase: 'day', nightStep: null, daySubPhase })
}
function clearLovers() {
	onChange({ ...gs, lovers: null })
}
</script>

<div class="flex flex-col gap-2">
	<div class="font-medium text-muted-foreground">Werewolf controls</div>

	<div class="rounded bg-muted/50 p-2 leading-relaxed">
		<div>night step: <b>{gs.nightStep ?? '—'}</b></div>
		<div>day: {gs.phase === 'day' ? gs.daySubPhase : '—'} · round {gs.round}</div>
		<div>alive: {gs.alive.length}/{gs.players.length}</div>
		{#if gs.lovers}<div>lovers: {nameFor(gs.lovers[0])} ♥ {nameFor(gs.lovers[1])}</div>{/if}
		{#if gs.winTeam}<div>winner: <b>{gs.winTeam}</b></div>{/if}
	</div>

	<!-- kill / revive -->
	<div class="flex items-center gap-1">
		<select bind:value={target} class="flex-1 rounded border border-border bg-background px-1 py-1">
			{#each gs.players as pid}
				<option value={pid}>{nameFor(pid)} ({gs.roles[pid]})</option>
			{/each}
		</select>
		<button onclick={() => kill(target)} class="rounded bg-destructive px-2 py-1 font-medium text-white">Kill</button>
		<button onclick={() => revive(target)} class="rounded bg-secondary px-2 py-1 font-medium">Revive</button>
	</div>

	<!-- phase jumps -->
	<div class="flex flex-wrap gap-1">
		{#each NIGHT_STEPS as step}
			<button
				onclick={() => setStep(step)}
				class="rounded px-2 py-1 {gs.phase === 'night' && gs.nightStep === step ? 'bg-primary text-primary-foreground' : 'bg-secondary'}"
			>{step}</button>
		{/each}
	</div>
	<div class="flex gap-1">
		<button onclick={() => setDaySub('talking')} class="flex-1 rounded px-2 py-1 {gs.phase === 'day' && gs.daySubPhase === 'talking' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}">Day talk</button>
		<button onclick={() => setDaySub('voting')} class="flex-1 rounded px-2 py-1 {gs.phase === 'day' && gs.daySubPhase === 'voting' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}">Day vote</button>
		<button onclick={() => setPhase('gameover')} class="flex-1 rounded bg-secondary px-2 py-1">Game over</button>
	</div>

	{#if gs.lovers}
		<button onclick={clearLovers} class="rounded bg-secondary px-2 py-1 font-medium">Clear lovers</button>
	{/if}
</div>
