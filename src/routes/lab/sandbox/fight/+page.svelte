<script lang="ts">
import FightView from '$lib/components/games/FightView.svelte'
import { fight } from '$lib/games/fight/fight'
import { makePlayers, nameFor } from '$lib/sandbox/players'
import SandboxShell from '$lib/sandbox/SandboxShell.svelte'

const createState = (count: number) => fight.setup(makePlayers(count).map((p) => p.id))
</script>

<SandboxShell
	def={fight as never}
	View={FightView}
	createState={createState as never}
	initialCount={3}
	{nameFor}
	deckSlug="french-deck"
/>
