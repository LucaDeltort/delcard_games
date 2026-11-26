<script lang="ts">
import { page } from '$app/stores'
import { locale, urlLocale } from '$lib/i18n'
import { SITE_ORIGIN } from '$lib/seo/config'

interface Props {
	/** English title, served on `?lang=en` */
	title: string
	/** English description, served on `?lang=en` */
	description: string
	canonical: string
	noindex?: boolean
	/** French title (default locale); falls back to `title` */
	titleFr?: string
	/** French description (default locale); falls back to `description` */
	descriptionFr?: string
}

const { title, description, canonical, noindex = false, titleFr, descriptionFr }: Props = $props()

// French is served at the bare URL, English at ?lang=en. Each variant is self-canonical.
const urlFr = $derived(SITE_ORIGIN + canonical)
const urlEn = $derived(`${urlFr}?lang=en`)
const url = $derived(urlLocale($page.url) === 'en' ? urlEn : urlFr)

const isFr = $derived($locale === 'fr')
const metaTitle = $derived(isFr ? (titleFr ?? title) : title)
const metaDescription = $derived(isFr ? (descriptionFr ?? description) : description)
</script>

<svelte:head>
	<title>{metaTitle}</title>
	<meta name="description" content={metaDescription} />
	{#if noindex}
		<meta name="robots" content="noindex,follow" />
	{:else}
		<link rel="canonical" href={url} />
		<!-- hreflang alternates -->
		<link rel="alternate" hreflang="fr" href={urlFr} />
		<link rel="alternate" hreflang="en" href={urlEn} />
		<link rel="alternate" hreflang="x-default" href={urlFr} />
		<meta property="og:url" content={url} />
	{/if}
	<!-- Open Graph -->
	<meta property="og:title" content={metaTitle} />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Delcard" />
	<meta property="og:locale" content={isFr ? 'fr_FR' : 'en_US'} />
	<meta property="og:locale:alternate" content={isFr ? 'en_US' : 'fr_FR'} />
	<meta property="og:image" content="{SITE_ORIGIN}/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Delcard" />
	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={metaTitle} />
	<meta name="twitter:description" content={metaDescription} />
	<meta name="twitter:image" content="{SITE_ORIGIN}/og.png" />
</svelte:head>
