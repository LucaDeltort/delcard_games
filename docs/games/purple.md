# Purple

**Players:** 2–8 · **Deck:** French Deck without Jokers (52 cards)

---

## Rules

### Setup

1. Shuffle a standard 52-card deck (no Jokers).
2. Initialize an empty **Playing Bank** and a **Penalty Bank** for each player.

### Turn

On your turn, you bet on the color of the next card(s) drawn from the deck.

- **Red Bet**: Bet the next card is red. If successful, you gain **1 bet**.
- **Black Bet**: Bet the next card is black. If successful, you gain **1 bet**.
- **Purple Bet**: Bet the next two cards have different colors. If successful, you gain **2 bets**.

#### Failure
If a bet fails:
1. The card(s) that caused the failure and all cards currently in the **Playing Bank** are moved to your **Penalty Bank**.
2. Your current bet count is reset to 0.
3. You remain the active player and must start betting again.

#### Stopping

Once you have won **3 or more bets**, you may choose to **STOP**.
1. All cards currently in your **Penalty Bank** are added to your permanent total score.
2. All **Penalty Banks** (for all players) and the **Playing Bank** are cleared.
3. A fresh, shuffled 52-card deck is generated.
4. The turn passes to the next player.

### Other Actions

When it is **not** your turn, you may perform a **Decrease** action (if enabled in settings). This reduces your own permanent score by 1 (minimum 0).

### Special Rules


#### Empty Deck
If the deck runs out of cards during a turn:
1. The active player's penalty bank is cleared and added to their permanent score.
2. All other players' penalty banks are cleared and their cards are returned to the deck.
3. The deck is refilled and reshuffled using all available cards.
4. **Setting**: If "End the player's turn at the end of the deck" is enabled, the turn ends immediately and passes to the next player. Otherwise, the current player continues their turn with the new deck.

### Winning
The goal is to have the **lowest** permanent score when the game ends.

---

## Implementation notes

Source: [`src/lib/games/purple.ts`](../../src/lib/games/purple.ts)

### State type

```typescript
type PurpleState = GameStateGeneric & {
  phase: 'betting' | 'decision' | 'gameover' | 'failing';
  scores: Record<string, number>;
  turnBets: number;
  lastFlipped: Card[];
  options: Record<string, unknown>;
}
```

### Zones

| Zone | Type | Contents |
| ---- | ---- | -------- |
| `deck` | `hidden` | Draw pile |
| `playingBank` | `public` | Cards currently being risked during the turn |
| `penaltyBank_<pid>` | `public` | Cards accumulated as penalties for the specific player |

### Actions

| Action | Payload | Description |
| ------ | ------- | ----------- |
| `BET_RED` | — | Bet the next card is red. |
| `BET_BLACK` | — | Bet the next card is black. |
| `BET_PURPLE` | — | Bet the next two cards have different colors. |
| `STOP` | — | Bank current penalties, reset deck, and end turn. |
| `DECREASE_SCORE` | — | Reduce the active player's score by 1. |
| `FINALIZE_FAILURE` | — | Internal action to move cards to the penalty bank after a delay. |

### View

`PurpleView.svelte` implements a three-zone layout (Deck, Playing Bank, Penalty Zone) with `crossfade` transitions to smoothly animate cards moving from the middle bank to the penalty zone on failure. It also features a white "emanating" circle animation when a player reaches 3+ bets.
