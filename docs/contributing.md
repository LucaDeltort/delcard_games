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

### Examples

```
feat(dev): add game lobby UI
fix(dev): correct card shuffle distribution
docs(main): update deployment guide
refactor(dev): move French card defs to deck folder
```
