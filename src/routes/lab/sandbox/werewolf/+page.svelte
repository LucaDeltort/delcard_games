<script lang="ts">
import WerewolfView from '$lib/components/games/WerewolfView.svelte'
import type { WerewolfState } from '$lib/games/werewolf/werewolf'
import { werewolf } from '$lib/games/werewolf/werewolf'
import SandboxShell from '$lib/sandbox/SandboxShell.svelte'
import WerewolfControls from '$lib/sandbox/WerewolfControls.svelte'
import { createSandboxState, nameFor } from '$lib/sandbox/werewolf-sandbox'
</script>

<SandboxShell
	def={werewolf as never}
	View={WerewolfView}
	Controls={WerewolfControls as never}
	createState={createSandboxState as never}
	initialCount={6}
	{nameFor}
	seatBadge={(s, id) => (s as unknown as WerewolfState).roles[id]}
	isAlive={(s, id) => (s as unknown as WerewolfState).alive.includes(id)}
/>
