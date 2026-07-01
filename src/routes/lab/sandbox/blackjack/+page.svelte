<script lang="ts">
import BlackjackView from '$lib/components/games/BlackjackView.svelte'
import { blackjack } from '$lib/games/blackjack/blackjack'
import { makePlayers, nameFor } from '$lib/sandbox/players'
import SandboxShell from '$lib/sandbox/SandboxShell.svelte'

const createState = (count: number) =>
	blackjack.setup(
		makePlayers(count).map((p) => p.id),
		{ betting: true, startingCoins: 500 }
	)
</script>

<SandboxShell
	def={blackjack as never}
	View={BlackjackView}
	createState={createState as never}
	initialCount={2}
	{nameFor}
	deckSlug="french-deck"
/>
