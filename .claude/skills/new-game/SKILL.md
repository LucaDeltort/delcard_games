---
name: new-game
description: Scaffold all files needed for a new card game in delcard_games
disable-model-invocation: true
---

Scaffold a new card game named `$ARGUMENTS`.

## Files to create

### 1. `src/lib/games/<name>.ts`
Game logic. Use `war.ts` as the simplest reference.

Required `GameDefinition<State>` fields:
- `id` — string matching `<name>`
- `name` — display name
- `deckType` — one of `'FrenchDeckWithJoker' | 'FrenchDeckWithoutJoker' | 'ColorDeck'`
- `minPlayers` / `maxPlayers`
- `setup(players, options?)` — returns initial state, must include `{ players, zones, turnPlayerId, phase, activeGameId: '<name>' }`
- `getValidActions(state, playerId)` — returns `Action[]`, never null/undefined
- `applyAction(state, action)` — returns NEW state, never mutates
- `isOver(state)` — returns true iff `phase === 'gameover'` (or equivalent)
- `getWinner(state)` — returns player ID or null; must return null if `!isOver(state)`
- `onPlayerDisconnect(state, playerId)` — optional but recommended; set phase to `'gameover'`

State type must extend `GameStateGeneric` (imported from `$lib/core/types`).

### 2. `src/lib/games/<name>.test.ts`
Vitest tests. Pattern from `war.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { <name> } from './<name>'

const P1 = 'p1'
const P2 = 'p2'
const PLAYERS = [P1, P2]

function setup() { return <name>.setup(PLAYERS) }

describe('<name>.setup', () => {
  it('initialises with correct player count', () => { ... })
  it('starts in correct phase', () => { ... })
})

describe('<name>.getValidActions', () => {
  it('returns empty array when not player turn', () => { ... })
})

describe('<name>.applyAction', () => {
  it('does not mutate input state', () => {
    const state = setup()
    const frozen = Object.freeze({ ...state })
    expect(() => <name>.applyAction(frozen, ...)).not.toThrow()
  })
})

describe('<name>.isOver / getWinner', () => {
  it('getWinner returns null while game in progress', () => {
    expect(<name>.getWinner(setup())).toBeNull()
  })
})
```

### 3. `src/lib/games/rules/<name>.json`
```json
{ "en": "Rules in English.", "fr": "Règles en français." }
```

### 4. Register in `src/lib/games/index.ts`
Add alongside existing imports:
```typescript
import <name>Rules from './rules/<name>.json'
import { <name> } from './<name>'
```
Add to `games` object and `gameRules` record.

### 5. `src/lib/components/games/<Name>View.svelte` (skeleton)
Minimal Svelte 5 component. Use `WarView.svelte` as the simplest reference.

Props:
```typescript
const { state, validActions, onAction, currentPlayerId } = $props<{
  state: <Name>State
  validActions: Action[]
  onAction: (action: Action) => void
  currentPlayerId: string
}>()
```

## Checklist before finishing
- [ ] `applyAction` uses spread (`{ ...state }`) not mutation
- [ ] `getValidActions` returns `[]` (not null) for inactive players
- [ ] `getWinner` returns null when `!isOver(state)`
- [ ] `activeGameId` set to `'<name>'` in setup
- [ ] All 4 logic files created + registered in index
