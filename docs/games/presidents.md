# Presidents

**Players:** 3–6 · **Deck:** Standard 52-card (no jokers)

---

## Rules

### Setup

Deal all 52 cards as evenly as possible. The holder of Q♥ leads the first trick of the first game.

### On your turn

Play a **combo** that beats the last play, or **pass**.

A combo is 1–4 cards of the **same face value**:

| Name   | Size |
| ------ | ---- |
| Single | 1    |
| Pair   | 2    |
| Triple | 3    |
| Quad   | 4    |

To beat the last play: match the combo type (e.g. pair on pair) and play a higher value. **Exception: a quad beats any non-quad combo regardless of value.**

### Card values

Low → high: `3 4 5 6 7 8 9 10 J Q K A 2`

2 is the highest card.

### Special rules

**Playing a 2** ends the trick immediately — the player who played it leads the next trick.

**Square rule** — if 4 cards of the same value are played across a trick (passes allowed in between), the trick ends and the last player to play leads the next one. Example: P1 plays a pair of 9s, P2 passes, P3 plays a pair of 9s → square complete, P3 leads next.

**Same-value chain** — if you play the same value as the previous play, the next player is locked: they must match that value or pass. A pass breaks the lock, but the square count is preserved.

**All-pass rule** — if all other players pass, you get one extra turn. Passing that extra turn ends the trick and you lead the next one.

### Finishing

When your hand is empty you are done — you cannot play further. Players finish one by one:

- **1st** — President
- **2nd** (4+ players) — Vice-President
- Middle players — Citizens
- **2nd-to-last** (4+ players) — Vice-Asshole
- **Last** — Asshole

**Finishing on a 2** makes you Asshole regardless of finish order.

### Exchange (2nd game onwards)

Before play begins, cards are exchanged based on the previous game's results:

| Giver | Auto-gives | Manual give |
| ----- | ---------- | ----------- |
| Asshole | 2 best cards → President | — |
| President | — | 2 cards of choice → Asshole |
| Vice-Asshole | best card → Vice-President | — |
| Vice-President | — | 1 card of choice → Vice-Asshole |

After the exchange, **Asshole leads** the first trick.

---

## Implementation notes

Source: [`src/lib/games/presidents.ts`](../../src/lib/games/presidents.ts)

**Zones:** `hand_<pid>` (fan, private) per player + `pile` (public).

**Phases:** `exchanging` → `playing` → `gameover`.

**Exchange flow.** President exchange runs first via `pendingExchange`. If 4+ players, VP exchange is queued in `pendingVpExchange` and activates after president completes. Both use the same `GIVE_CARDS` action type; `getValidActions` generates pair combinations for count=2 and single-card actions for count=1.

**Same-value tracking.** `sameValueCount` accumulates across plays even through passes. `sameValueLock` is set when a player chains the same value and cleared on pass or trick end. A pass resets the lock but not the count, enabling cross-pass square detection.

**Finish-on-2 penalty.** Players who empty their hand on a 2 are placed in `scumPenalties` instead of `finishOrder`. At gameover they are appended to the end of `finishOrder`.

**`leaderCanPlay`.** When all other players pass, the last player to play gets `leaderCanPlay = true` — one extra turn. If they pass again, the trick resets and they lead.
