# Yams

**Players:** 2–6 · **Dice:** 5 × D6

---

## Rules

1. Players take turns. On your turn, roll all 5 dice (mandatory first roll).
2. After rolling, you may hold any dice and roll the remaining ones again — up to 2 more times (3 rolls total per turn).
3. After at least one roll, you must assign your result to one of the 13 scoring categories.
4. Each category can only be used once per player. A score of 0 is valid and still locks the category.
5. After all players have filled all 13 categories, the game ends.
6. The player with the highest grand total wins.

### Scoring categories

#### Upper section

| Category | Score                          |
| -------- | ------------------------------ |
| Ones     | Sum of all 1s                  |
| Twos     | Sum of all 2s                  |
| Threes   | Sum of all 3s                  |
| Fours    | Sum of all 4s                  |
| Fives    | Sum of all 5s                  |
| Sixes    | Sum of all 6s                  |
| **Bonus**| +35 if upper total ≥ 63        |

#### Lower section

| Category       | Score                                               |
| -------------- | --------------------------------------------------- |
| Three of a Kind| Sum of all dice (if ≥ 3 dice show the same value)  |
| Four of a Kind | Sum of all dice (if ≥ 4 dice show the same value)  |
| Full House     | 25 pts — exactly one pair + one triple (five-of-a-kind does **not** qualify) |
| Small Straight | 30 pts — 4 consecutive values present              |
| Large Straight | 40 pts — 5 consecutive values (1–5 or 2–6)         |
| Yams           | 50 pts — all 5 dice show the same value            |
| Chance         | Sum of all dice (always valid)                     |

---

## Implementation notes

Source: [`src/lib/games/yams/yams.ts`](../../src/lib/games/yams/yams.ts)

**No card zones.** `zones: {}` — the game uses no card infrastructure.

**Dice system.** Uses `diceSlug: 'd6'`. The lobby shows `DicePackPicker` instead of `DeckPackPicker` when `diceSlug` is set on `GameDefinition` (wired in `src/routes/game/[id]/+page.svelte`).

**State shape.**

```typescript
type YamsState = GameStateGeneric & {
  phase: 'rolling' | 'gameover'
  dice: number[]           // length 5, values 1–6
  held: boolean[]          // length 5
  rollsRemaining: number   // 3 at turn start → 0 after three rolls
  scores: Record<string, YamsScores>  // null = unfilled
}
```

**Turn model.** Three actions: `ROLL` (decrement `rollsRemaining`, re-roll unheld dice), `TOGGLE_HOLD` (flip `held[i]`, only valid after at least one roll and before the last roll), `SCORE` (write computed value, reset dice/held/rollsRemaining, advance `turnPlayerId`).

**Scoring functions** (`scoreCategory`, `upperBonus`, `grandTotal`) are exported pure functions — used by both `applyAction` and `YamsView` for live hypothetical score preview.

**Randomness.** `applyAction` calls `Math.random()` for `ROLL`. This is safe: `applyAction` runs exclusively on the host, and the resulting state is broadcast to clients.

**Win condition.** Triggered inside `SCORE` when every player's scorecard has no `null` entries. `getWinner` returns the player with the highest `grandTotal`.
