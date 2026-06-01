<script lang="ts">
import { SITE_ORIGIN } from '$lib/seo/config'

interface Props {
	title: string
	description: string
	canonical: string
	noindex?: boolean
}

const { title, description, canonical, noindex = false }: Props = $props()

const url = $derived(SITE_ORIGIN + canonical)
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	{#if noindex}
		<meta name="robots" content="noindex,follow" />
	{/if}
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
</svelte:head>
