# War

**Players:** 2 · **Deck:** Standard 52-card

---

## Rules

1. Shuffle and deal the deck evenly — 26 cards face-down to each player.
2. Each turn, both players reveal the top card of their deck.
3. The player with the higher card takes both cards and adds them to their won pile.
4. On a tie, both cards are discarded.
5. The game ends when any player's deck runs out.
6. The player with the most cards (deck + won pile) wins.

### Card values

| Card | Value      |
| ---- | ---------- |
| 2–10 | Face value |
| J    | 11         |
| Q    | 12         |
| K    | 13         |
| A    | 14         |

---

## Implementation notes

Source: [`src/lib/games/war.ts`](../../src/lib/games/war.ts)

**Zones per player:** `deck_<pid>` (hidden), `played_<pid>` (public), `won_<pid>` (hidden).

**Turn model.** Both players reveal sequentially rather than simultaneously. Player 1 plays `REVEAL`, then player 2 plays `REVEAL`. When both `played_` zones are non-empty, the round resolves automatically inside `applyAction`.

**Win condition.** Checked after each round — triggered when any deck is empty.

War is the simplest game in the codebase and is the recommended starting point for understanding the engine. See [docs/engine.md](../engine.md) for a full walkthrough.
