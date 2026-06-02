<script lang="ts">
import type { Snippet } from 'svelte'
import { computeArcPositions } from './arcPositions.js'

let {
	opponents,
	opponentTile,
	center
}: {
	opponents: string[]
	opponentTile: Snippet<[pid: string]>
	center: Snippet
} = $props()

let arcW = $state(0)
let arcH = $state(0)
const arcPositions = $derived(computeArcPositions(opponents, arcW, arcH))
</script>

<!-- Mobile: center above, opponents as vertical list -->
<div class="flex flex-col gap-3 md:hidden">
	<div class="flex justify-center px-4 pt-3">
		{@render center()}
	</div>
	<div class="flex flex-col gap-2 px-4 pb-3">
		{#each opponents as pid (pid)}
			{@render opponentTile(pid)}
		{/each}
	</div>
</div>

<!-- Desktop: arc layout -->
<div
	class="relative hidden flex-1 md:block"
	style="min-height: 280px"
	bind:clientWidth={arcW}
	bind:clientHeight={arcH}
>
	<div class="absolute" style="left: 50%; top: 62%; transform: translate(-50%, -50%)">
		{@render center()}
	</div>
	{#each arcPositions as { pid, left, top } (pid)}
		<div class="absolute" style="left: {left}; top: {top}; transform: translate(-50%, -50%)">
			{@render opponentTile(pid)}
		</div>
	{/each}
</div>
