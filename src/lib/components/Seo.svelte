<script lang="ts">
import { SITE_ORIGIN } from '$lib/seo/config'

interface Props {
	title: string
	description: string
	canonical: string
	noindex?: boolean
	/** Optional French translation for client-side locale switching */
	titleFr?: string
	descriptionFr?: string
}

const { title, description, canonical, noindex = false, titleFr, descriptionFr }: Props = $props()

const url = $derived(SITE_ORIGIN + canonical)
const urlFr = $derived(`${url}?lang=fr`)
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	{#if noindex}
		<meta name="robots" content="noindex,follow" />
	{/if}
	<!-- hreflang alternates -->
	<link rel="alternate" hreflang="en" href={url} />
	<link rel="alternate" hreflang="fr" href={urlFr} />
	<link rel="alternate" hreflang="x-default" href={url} />
	<!-- Open Graph -->
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Delcard" />
	<!-- Twitter -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<!-- French alternates rendered for indexing -->
	{#if titleFr}
		<meta property="og:locale:alternate" content="fr_FR" />
	{/if}
	{#if descriptionFr}
		<meta name="description-fr" content={descriptionFr} />
	{/if}
</svelte:head>
