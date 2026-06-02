<script lang="ts">
import ColorView from '$lib/components/games/ColorView.svelte'
import { color } from '$lib/games/color/color'
import { makePlayers, nameFor } from '$lib/sandbox/players'
import SandboxShell from '$lib/sandbox/SandboxShell.svelte'

const createState = (count: number) => color.setup(makePlayers(count).map((p) => p.id))
</script>

<SandboxShell
	def={color as never}
	View={ColorView}
	createState={createState as never}
	initialCount={3}
	{nameFor}
	deckSlug="color-deck"
/>
