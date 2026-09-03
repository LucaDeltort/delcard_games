# Contributing

## Setup

```bash
git clone git@github.com:LucaDeltort/delcard_games.git
cd delcard_games
npm install
```

Requirements:

- Node 18+
- npm 10+

### Commands

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start dev server (Vite) |
| `npm run build` | Production build |
| `npm run check` | TypeScript type-check (`svelte-check`) |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run format` | Format code (Biome) |
| `npm run lint` | Lint and auto-fix (Biome) |

---

## Project structure

```
src/lib/
  engine/     # pure utilities (shuffle, deal, zones)
  games/      # one folder per game definition
  decks/      # deck types and visual themes (card packs)
  dice/       # dice types and visual packs
  network/    # PeerJS host/client wrappers, messages, TURN config
  audio/      # sound engine (preloading, gain control, narration)
  stores/     # Svelte stores (session, settings, game options)

src/routes/
  /           # home - create a game
  /join       # join via code
  /game/[id]  # game room (lobby + gameplay)
  /decks      # card pack browser
  /dice       # dice pack browser
  /lab        # developer component sandbox (not linked in production)
```

See [docs/engine.md](engine.md) for how to build a new game.

---

## Branching convention

| Branch | Role |
| -------------- | ---------------------------------------------------- |
| `main`         | Stable, production                                   |
| `dev`          | Integration - always deployable                      |
| `<feature>`    | Short kebab-case feature branch off `dev` (e.g. `tarot-deck`, `lobby-ui`) |
| `fix/<name>`   | Hotfix off `main` when production is broken          |

Flow: `<feature>` → PR → `dev` → PR → `main`

---

## Code style

This project uses [Biome](https://biomejs.dev/) for formatting and linting.

A pre-commit hook runs automatically on every `git commit`:

```bash
npm run format   # biome format --write
npm run lint     # biome check --write
```

Auto-fixed files are re-staged before the commit completes. If Biome reports unfixable errors, the commit is blocked - fix them first.

To run manually:

```bash
npm run format
npm run lint
```

---

## Commit convention

Format: `type(scope): subject`

- **scope** = branch name
- **subject** = lowercase, imperative, no period

### Types

| Type       | When to use                              |
| ---------- | ---------------------------------------- |
| `feat`     | New feature                              |
| `fix`      | Bug fix                                  |
| `chore`    | Tooling, dependencies, config            |
| `docs`     | Documentation only                       |
| `refactor` | Code change with no behaviour change     |
| `test`     | Tests only                               |
| `init`     | Initial commit or bootstrap              |
| 'remove'   | Removing code or files                   |

### Examples

```
feat(dev): add game lobby UI
fix(dev): correct card shuffle distribution
docs(main): update deployment guide
refactor(dev): move French card defs to deck folder
```

---

## Pull request process

1. Create a feature branch off `dev`: `git checkout -b <feature> dev`
2. Commit using the convention above. The pre-commit hook (Biome + Husky) runs automatically.
3. Push and open a PR targeting `dev`.
4. Ensure CI passes: type-check (`npm run check`), tests (`npm test`), lint (`npm run lint`).
5. Request review. At least one approval required before merge.
6. Squash-merge into `dev`.

### Release flow

When `dev` is ready for production:

1. Open a release PR `dev` → `main` titled `Release vX.Y`.
2. Bump `package.json` version, add changelog entry in `src/lib/changelog.ts`.
3. After merge, tag `vX.Y` on `main` and deploy via Netlify.

---

## Testing

Unit tests use [Vitest](https://vitest.dev/) with jsdom environment.

```bash
npm test              # run all tests
npm run test:coverage # with coverage report
```

Coverage thresholds: ≥ 80% engine, ≥ 70% games.

Test files live alongside source code:

- `*.test.ts` - core logic tests
- `*.edge.test.ts` - edge case and integration tests
