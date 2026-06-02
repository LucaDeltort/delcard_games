<script lang="ts">
import PresidentsView from '$lib/components/games/PresidentsView.svelte'
import { presidents } from '$lib/games/presidents/presidents'
import { makePlayers, nameFor } from '$lib/sandbox/players'
import SandboxShell from '$lib/sandbox/SandboxShell.svelte'

const createState = (count: number) => presidents.setup(makePlayers(count).map((p) => p.id))
</script>

<SandboxShell
	def={presidents as never}
	View={PresidentsView}
	createState={createState as never}
	initialCount={3}
	{nameFor}
	deckSlug="french-deck"
/>
