# Contributing

## Branching convention

| Branch | Role |
| -------------- | ---------------------------------------------------- |
| `main`         | Stable, production                                   |
| `dev`          | Integration — always deployable                      |
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

Auto-fixed files are re-staged before the commit completes. If Biome reports unfixable errors, the commit is blocked — fix them first.

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
