# /lab — Component Showcase

Developer-facing pages for tweaking and inspecting components in isolation.
Not linked from the main app, but always accessible at `/lab`.

## Adding a new showcase

1. Create `src/routes/lab/<name>/+page.svelte`
2. Add a back-link: `<a href="/lab">← lab</a>`
3. Add an entry to the `<ul>` in `src/routes/lab/+page.svelte`

### Conventions

- Interactive section first: all props exposed as dropdowns/inputs, a preview box, and a **Copy** button that writes the ready-to-paste `<Component .../>` snippet.
- Then a static grid section for each animation axis / variant, labelled with the prop value.
- Use `{#key someKey}` to re-mount components for replay.
- Keep the page self-contained — no shared state with the rest of the app.

## Current pages

| Route | Component | What it shows |
|-------|-----------|---------------|
| `/lab/game-title` | `GameTitle.svelte` | Entry, exit, rotation, size, color animations |
