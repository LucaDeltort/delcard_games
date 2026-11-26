# SEO audit — 2026-11-26

Audit of https://delcard.fun (live SSR HTML + codebase). Score: 58/100.

## Critical

Fixed: SSR locale from URL (`/` = fr, `?lang=en` = en), self-canonical variants, both listed in sitemap.

- [x] **Language mismatch** — `<html lang="en">` + English meta, but SSR body always French (`getStored()` returns `'fr'` when `!browser`). `src/lib/i18n/index.ts`, `src/app.html`
- [x] **Broken hreflang** — `?lang=fr` serves the same SSR HTML as `/` (query ignored server-side) and its canonical points to `/`, so alternates are ignored. `src/lib/components/Seo.svelte`
- [x] **Wrong `<title>` on `/` and `/join`** — layout `<title>` overrides the page SEO title. `src/routes/+layout.svelte`

## Warnings

- [ ] No `og:image`; `twitter:card="summary"` without image — no rich link previews. `Seo.svelte`
- [ ] No JSON-LD (`WebSite`, `WebApplication`/`VideoGame` on home)
- [ ] Titles/descriptions too short, no target keywords (`Dice | Delcard` 14 chars, descriptions 65–90 chars vs 150–160). `decks`, `dice`, `decks/[type]`, `dice/[slug]` pages
- [ ] `/stats`: no description, no canonical, not noindexed, orphan page. `src/routes/stats/+page.svelte`
- [ ] Home + `/join` `<h1>` = "DELCARD" (brand only, no keyword)
- [ ] Game page canonical `/game` points to a 404. `src/routes/game/[id]/+page.svelte`

## Opportunities

- [ ] No indexable per-game pages (War, Presidents, Werewolf, Yams, Blackjack…) — rules already exist in `RulesDrawer`; target "how to play X online"
- [ ] Non-standard `<meta name="description-fr">` — ignored by engines. `Seo.svelte`
- [ ] Dice previews `alt=""` on `/dice/[slug]`
- [ ] Sitemap has no `<lastmod>`
- [ ] Cloudflare-managed robots.txt blocks GPTBot, ClaudeBot, Google-Extended, GoogleOther… (`ai-train=no`) — no AI citations; classic search unaffected. Owner's choice
- [ ] Duplicate favicon links (`app.html` + layout); `theme-color` `#222222` vs manifest `#002fa7`
- [ ] Settings button ~42×34px, under 44px touch target. `src/routes/+layout.svelte`

## Passing

- SSR on: content crawlable without JS
- `robots.txt` blocks `/lab/`, references sitemap; sitemap prerendered from registries, all URLs 200
- Centralized `Seo.svelte` (canonical, OG, Twitter); game page and unknown slugs noindexed
- Real 404 status, viewport meta, manifest, apple-touch-icon
- Lightweight SVG assets, analytics script `defer`
