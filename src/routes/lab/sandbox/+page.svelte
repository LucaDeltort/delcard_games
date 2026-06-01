<script lang="ts">
const games = [
	{ id: 'war', name: 'War', ready: true },
	{ id: 'werewolf', name: 'Werewolf', ready: true },
	{ id: 'purple', name: 'Purple', ready: true }
]
</script>

<div class="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
	<div>
		<h1 class="text-xl font-bold">Sandbox</h1>
		<p class="text-sm text-muted-foreground">Preview a game UI with live, editable state — no host, no peers.</p>
	</div>

	<ul class="flex flex-col gap-2">
		{#each games as g}
			{#if g.ready}
				<a href="/lab/sandbox/{g.id}" class="rounded-lg border border-border bg-card px-4 py-3 text-sm hover:border-primary">
					{g.name}
				</a>
			{:else}
				<span class="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
					{g.name} — soon
				</span>
			{/if}
		{/each}
	</ul>
</div>
