<main class="min-h-dvh bg-background p-8 text-foreground">
	<h1 class="font-heading mb-2 text-4xl">Lab</h1>
	<p class="mb-12 text-sm text-muted-foreground">
		<a href="/" class="underline">← home</a>
	</p>

	<p class="mb-8 max-w-prose text-sm text-muted-foreground">
		Component showcases. Each page lets you tweak props interactively and copy the resulting snippet.
		Add a new page under <code class="rounded bg-card px-1 py-0.5 font-mono">src/routes/lab/&lt;name&gt;/+page.svelte</code>
		and link it below.
	</p>

	<ul class="flex flex-col gap-3">
		<li>
			<a
				href="/lab/game-title"
				class="group flex items-baseline gap-3 text-sm"
			>
				<span class="font-mono text-primary transition-colors group-hover:text-foreground"
					>GameTitle</span
				>
				<span class="text-muted-foreground"
					>Entry / exit / rotation / size / color animations for game title screens</span
				>
			</a>
		</li>
		<li>
			<a href="/lab/sandbox" class="group flex items-baseline gap-3 text-sm">
				<span class="font-mono text-primary transition-colors group-hover:text-foreground">Sandbox</span>
				<span class="text-muted-foreground">Preview a game UI with live, editable state — no host, no peers</span>
			</a>
		</li>
		<li>
			<a href="/lab/dice" class="group flex items-baseline gap-3 text-sm">
				<span class="font-mono text-primary transition-colors group-hover:text-foreground"
					>Dice</span
				>
				<span class="text-muted-foreground">CSS 3D dice cube with roll animation, pip faces, held state</span>
			</a>
		</li>
		<li>
			<a href="/lab/dice-viewer" class="group flex items-baseline gap-3 text-sm">
				<span class="font-mono text-primary transition-colors group-hover:text-foreground"
					>DiceViewer</span
				>
				<span class="text-muted-foreground">Browse registered dice types and packs</span>
			</a>
		</li>
	</ul>
</main>
