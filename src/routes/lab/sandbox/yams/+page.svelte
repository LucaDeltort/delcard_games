<script lang="ts">
import YamsView from '$lib/components/games/YamsView.svelte'
import { yams } from '$lib/games/yams/yams'
import { makePlayers, nameFor } from '$lib/sandbox/players'
import SandboxShell from '$lib/sandbox/SandboxShell.svelte'

const createState = (count: number) => yams.setup(makePlayers(count).map((p) => p.id))
</script>

<SandboxShell
	def={yams as never}
	View={YamsView}
	createState={createState as never}
	initialCount={2}
	{nameFor}
/>
