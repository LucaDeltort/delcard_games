# Blackjack

**Players:** 1-6 vs. dealer · **Deck:** 4×52-card shoe (French deck, no jokers)

---

## Rules

1. Shuffle the shoe and deal two cards to each player and to the dealer.
2. Each player's goal is to beat the dealer by getting closer to 21 than them - without going over.
3. On your turn, choose an action:
   - **Hit** - draw a card.
   - **Stand** - keep your hand and end your turn.
   - **Double** - match your current bet, draw exactly one card, then stand _(first two cards only)_.
   - **Split** - if your first two cards share the same value (a pair, or any two ten-value cards like K|Q), split them into two independent hands that each draw a fresh second card _(primary hand only, once per round)_. Split Aces receive just one card each and auto-stand.
4. Going over 21 is a **bust** - that hand loses immediately.
5. Once every player has acted, the dealer draws automatically until its total reaches 17 or more.
6. If the dealer busts, every remaining (non-busted) player wins.
7. Otherwise, each surviving hand is compared to the dealer: higher wins, equal is a **push**, lower loses.

### Card values

| Card | Value                  |
| ---- | ---------------------- |
| 2-10 | Face value             |
| J / Q / K | 10                |
| A    | 1 or 11 (whichever helps avoid a bust) |

A two-card 21 (an Ace + a ten-value card) is a **natural blackjack**.

---

## Betting (optional)

When betting is enabled, each player starts with a set stack of coins (_default 500_).

- Place a bet before each round; stake is deducted up front.
- A win pays **1:1**; a natural blackjack pays **3:2**.
- A push returns the original bet unchanged.
- Double and Split each commit a matching additional bet.
- Run out of coins → you are topped back up to the starting stack automatically.

---

## Win condition

- **Without betting** - after a single round, the winner is the player whose best non-bust hand beats the dealer (or any of them if the dealer busts). Everyone busting or tying the dealer yields no winner.
- **With betting** - rounds repeat until a player ends the game. The winner is the player holding the most coins at that point.

---

## Options

| Option          | Type    | Default | Range        | Notes                                  |
| --------------- | ------- | ------- | ------------ | -------------------------------------- |
| `betting`       | boolean | `false` | -            | Enables coin bets between rounds.      |
| `startingCoins` | number  | 500     | 100 - 5000 (step 100) | Only relevant when `betting` is on. |

---

## Implementation notes

Source: [`src/lib/games/blackjack/blackjack.ts`](../../src/lib/games/blackjack/blackjack.ts)

**Zones.** One hidden `deck`, a public `hand_dealer` fan, plus a `hand_<pid>` fan per player. When a player splits, an extra `hand_<pid>__split` fan is created for their second hand.

**Phase machine.** `betting → playing → scoring → gameover`. With betting disabled, the game skips straight from setup to `playing` (and from `scoring` to `gameover`). Players with a natural blackjack auto-stand during the deal; if the dealer also has blackjack, the round resolves immediately in `scoring`.

**Turn order.** Players act in array order. After a player stands/busts on their primary hand, if they've split and their second hand is still live (`activeHand[pid]` flips to `1`), play continues there before moving on. Once all players are done, control passes to the dealer, which draws to 17 inside `resolveDealerTurn`.

**Scoring & payout.** `enterScoring` walks each player's primary and (if any) split hand against the dealer's total, applying `betNet` - losses forfeit the stake, naturals pay 3:2, other wins pay 1:1, pushes refund.

**Disconnect handling.** Removing a mid-turn player promotes the next still-playing participant or, if none remain, triggers the dealer turn. In the betting phase, dealing kicks off as soon as all remaining players have placed their bets.
