<script lang="ts">
import PurpleView from '$lib/components/games/PurpleView.svelte'
import type { PurpleState } from '$lib/games/purple/purple'
import { purple } from '$lib/games/purple/purple'
import { makePlayers, nameFor } from '$lib/sandbox/players'
import SandboxShell from '$lib/sandbox/SandboxShell.svelte'

const createState = (count: number) => purple.setup(makePlayers(count).map((p) => p.id))
</script>

<SandboxShell
	def={purple as never}
	View={PurpleView}
	createState={createState as never}
	initialCount={4}
	{nameFor}
	deckSlug="french-deck"
	seatBadge={(s, id) => String((s as unknown as PurpleState).scores[id] ?? 0)}
/>
