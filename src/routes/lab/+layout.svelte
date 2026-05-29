<script lang="ts">
let { children } = $props()
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
	{@render children()}
</div>
