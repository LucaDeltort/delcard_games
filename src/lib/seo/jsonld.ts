import type { Locale } from '$lib/i18n'
import { SITE_ORIGIN } from './config'

/** Absolute URL of a page in a locale variant (fr = bare URL, en = ?lang=en) */
export function absUrl(path: string, lang: Locale): string {
	return `${SITE_ORIGIN}${path}${lang === 'en' ? '?lang=en' : ''}`
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((it, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: it.name,
			item: it.url
		}))
	}
}

export function faqLd(faq: { q: string; a: string }[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faq.map((f) => ({
			'@type': 'Question',
			name: f.q,
			acceptedAnswer: { '@type': 'Answer', text: f.a }
		}))
	}
}
