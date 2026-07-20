<script lang="ts">
const entries = [
	{
		label: 'Dice',
		href: '/lab/dice',
		description: 'CSS 3D dice cube with roll animation, pip faces, held state'
	},
	{
		label: 'GameTitle',
		href: '/lab/game-title',
		description: 'Entry / exit / rotation / size / color animations for game title screens'
	},
	{
		label: 'Sandbox',
		href: '/lab/sandbox',
		description: 'Preview a game UI with live, editable state — no host, no peers'
	},
	{
		label: 'Sound',
		href: '/lab/sound',
		description: 'Play every registered sound effect and voice cue; flags missing files'
	}
].sort((a, b) => a.label.localeCompare(b.label))
</script>

<style>
.cursor {
	display: inline-block;
	animation: cursor-blink 1s step-end infinite;
}

@keyframes cursor-blink {
	0%, 100% { opacity: 1; }
	50% { opacity: 0; }
}

.entry {
	opacity: 0;
	animation: entry-in 0.35s ease-out forwards;
}

.entry:nth-child(1) { animation-delay: 0.08s; }
.entry:nth-child(2) { animation-delay: 0.16s; }
.entry:nth-child(3) { animation-delay: 0.24s; }
.entry:nth-child(4) { animation-delay: 0.32s; }

@keyframes entry-in {
	from { opacity: 0; transform: translateY(12px); }
	to   { opacity: 1; transform: translateY(0); }
}

.entry-link {
	position: relative;
}

.entry-link::before {
	content: '';
	position: absolute;
	left: 0;
	top: 0;
	bottom: 0;
	width: 2px;
	background: var(--color-primary);
	transform: scaleY(0);
	transform-origin: bottom;
	transition: transform 0.18s ease;
}

.entry-link:hover::before {
	transform: scaleY(1);
}

.arrow {
	transition: transform 0.18s ease, opacity 0.18s ease;
}

.entry-link:hover .arrow {
	transform: translateX(5px);
	opacity: 1;
}

.header-glow {
	background: radial-gradient(ellipse 60% 80% at 0% 50%, oklch(0.37 0.222 264 / 8%) 0%, transparent 70%);
}
</style>

<main class="min-h-dvh text-foreground">
	<!-- Header -->
	<header class="header-glow border-b border-border px-6 pb-10 pt-6 sm:px-12">
		<h1 class="font-heading text-[clamp(4.5rem,14vw,11rem)] leading-none tracking-tight">
			LAB<span class="cursor text-primary">_</span>
		</h1>

		<div class="mt-4 flex items-center gap-4">
			<span class="font-mono text-[10px] tracking-[0.15em] text-muted-foreground">
				{entries.length}&nbsp;EXPERIMENT{entries.length !== 1 ? 'S' : ''}
			</span>
			<span class="h-px flex-1 max-w-24 bg-border"></span>
			<span class="font-mono text-[10px] tracking-[0.15em] text-muted-foreground/40">
				INTERACTIVE&nbsp;·&nbsp;COMPONENT&nbsp;SHOWCASES
			</span>
		</div>
	</header>

	<!-- Experiment list -->
	<section class="divide-y divide-border">
		{#each entries as entry, i}
			<div class="entry">
				<a href={entry.href} class="entry-link group flex items-center gap-5 px-6 py-7 transition-colors hover:bg-card sm:gap-8 sm:px-12">
					<!-- Index -->
					<span class="w-10 shrink-0 font-mono text-[11px] tabular-nums text-accent">
						E&#8209;{String(i + 1).padStart(2, '0')}
					</span>

					<!-- Label + description -->
					<div class="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-10">
						<span class="w-40 shrink-0 font-heading text-[1.75rem] leading-none tracking-wide text-foreground transition-colors group-hover:text-primary sm:text-[2rem]">
							{entry.label}
						</span>
						<span class="font-mono text-[11px] leading-relaxed text-muted-foreground">
							{entry.description}
						</span>
					</div>

					<!-- Arrow -->
					<span class="arrow shrink-0 font-mono text-sm text-muted-foreground opacity-40 group-hover:opacity-100">
						→
					</span>
				</a>
			</div>
		{/each}
	</section>

	<!-- Hint -->
	<footer class="px-6 py-10 sm:px-12">
		<p class="font-mono text-[10px] text-muted-foreground/35">
			// new experiment → <span class="text-muted-foreground/55">src/routes/lab/&lt;name&gt;/+page.svelte</span>
		</p>
	</footer>
</main>
