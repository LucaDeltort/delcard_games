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
| `/lab/sound` | audio engine | Play/loop every registered sound, per-sound gain, locale switch, missing-file flags |
| `/lab/sandbox` | menu | Game sandbox picker (`/lab/sandbox/<game>`) |

## Sandbox (`/lab/sandbox/<game>`)

Develop and debug game views without spinning up a multi-tab P2P session. Each sandbox page mounts the real game view against a local, fully-editable state — no network, no host.

Shared shell: `src/lib/sandbox/SandboxShell.svelte`. Per-game wiring lives under `src/routes/lab/sandbox/<game>/+page.svelte` and is intentionally thin (~15 lines).

What the shell gives you:

- Seat switcher to view the game as any player.
- A live JSON editor of the current state — edit, click **Apply JSON**, the state updates.
- Optional **Controls** component slot for game-specific buttons (e.g. kill/revive a player, jump to a night step). See `WerewolfControls.svelte`.
- Action log and "you are about to send" preview.

To add a new game sandbox:

1. Create `src/lib/sandbox/<game>-sandbox.ts` exporting `createSandboxState(count, options?)`.
2. (Optional) Create `src/lib/sandbox/<Game>Controls.svelte` for game-specific buttons.
3. Create `src/routes/lab/sandbox/<game>/+page.svelte` wiring `SandboxShell` to the view, the state factory, and the controls component.
4. Add the route to the picker (`src/routes/lab/sandbox/+page.svelte`).
