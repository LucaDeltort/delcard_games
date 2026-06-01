<script lang="ts">
import WarView from '$lib/components/games/WarView.svelte'
import { war } from '$lib/games/war/war'
import { makePlayers, nameFor } from '$lib/sandbox/players'
import SandboxShell from '$lib/sandbox/SandboxShell.svelte'

const createState = (count: number) => war.setup(makePlayers(count).map((p) => p.id))
</script>

<SandboxShell
	def={war as never}
	View={WarView}
	createState={createState as never}
	initialCount={2}
	{nameFor}
	deckSlug="french-deck"
/>
