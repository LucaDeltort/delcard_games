<script lang="ts">
import { page } from '$app/stores'

let { children } = $props()

const crumbs = $derived(
	$page.url.pathname
		.split('/')
		.filter(Boolean)
		.reduce(
			(acc, part) => {
				const href = acc[acc.length - 1].href + '/' + part
				return [...acc, { label: part.toUpperCase().replace(/-/g, '‑'), href }]
			},
			[{ label: 'HOME', href: '' }]
		)
		.map((c, i, arr) => ({ ...c, href: c.href || '/', current: i === arr.length - 1 }))
)
</script>

<style>
:global(.lab-grid-layout) {
	background-image:
		linear-gradient(oklch(1 0 0 / 3.5%) 1px, transparent 1px),
		linear-gradient(90deg, oklch(1 0 0 / 3.5%) 1px, transparent 1px);
	background-size: 48px 48px;
	background-attachment: fixed;
}
</style>

<div class="lab-grid-layout min-h-dvh bg-background">
	<nav class="px-6 pt-5 font-mono text-[10px] tracking-[0.2em] text-muted-foreground sm:px-12">
		{#each crumbs as crumb, i}
			{#if i > 0}<span class="mx-2 opacity-40">/</span>{/if}
			{#if crumb.current}
				<span class="text-foreground">{crumb.label}</span>
			{:else}
				<a href={crumb.href} class="transition-colors hover:text-foreground">{crumb.label}</a>
			{/if}
		{/each}
	</nav>
	{@render children()}
</div>
