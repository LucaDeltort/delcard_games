# The Fight (La Bagarre)

**Players:** 3–6 · **Deck:** Standard 52 cards · **Duration:** ~10 min

---

## Rules

### Card values

| Card  | Value      |
| ----- | ---------- |
| A     | 1          |
| 2–10  | Face value |
| J     | 11         |
| Q     | 12         |
| K     | 13         |

### Setup

1. Shuffle the 52-card deck and deal **3 cards to each player**, face up:
   - The **2 highest cards** are placed vertically — these are the player's **HP**.
   - The **lowest card** is placed horizontally in front — this is the **Shield**.

2. The remaining cards form the **draw pile** in the center. Place a **discard pile** next to it.

3. **If the sum of all 3 cards is ≤ 15**, discard those cards and draw 3 new ones. Repeat until every player has a valid hand (sum > 15). Discarded cards are then shuffled back into the draw pile.

4. The player with the **lowest total** (sum of all 3 starting cards) goes first. Tiebreak: lowest Shield. Second tiebreak: random.

---

### Turn

On your turn, choose **one action**. Announce the action and target, reveal the top card of the draw pile, apply the action, then discard the card.

#### Attack

- If the drawn card's value is **≤ the target's Shield** → nothing happens.
- If it is **greater** → the target loses HP equal to the **difference** (drawn value − Shield value).

> **Example:** You draw a J (11). The target's Shield is 7. They lose 4 HP.

The target updates their HP cards: discard the lowest HP card first, then retrieve a card matching the new total from the discard pile (or the draw pile if unavailable).

The Shield is **not affected** by an attack.

#### Change a Shield

Discard the targeted Shield (yours or another player's) and replace it with the drawn card.

#### Charge

Place the drawn card **face down** in front of you without looking at it. On your next attack, reveal and discard all your charges, then draw your attack card. The **combined charge value adds to the attack**.

**Charge rules:**

- If you take HP damage while holding charges, you **must discard them all**.
- You are **not forced to attack** while charged, but if you do attack, you **must** use all charges.
- You can hold up to **two charges** at a time.

---

### End of game

When a player's HP reaches **zero**, they are **eliminated** and their cards are discarded.

**The last player standing wins.**

---

### Special rules

#### Murder

When you eliminate a player, **immediately take one extra action**.

---

## Implementation notes

Source: [`src/lib/games/fight.ts`](../../src/lib/games/fight.ts)

**HP tracking.** HP is stored as a plain number in `state.hp` rather than as cards in a zone. The physical card-based HP display is a tabletop token mechanic; digitally, the number is sufficient.

**Zones per player:** `shield_<pid>` (public, 1 card), `charge_<pid>` (hidden, 0–2 cards).

**Global zones:** `draw` (hidden), `discard` (public).

**Turn model.** `state.pendingBonusAction` holds the player ID when a bonus action (Murder) is pending. `getValidActions` uses `pendingBonusAction ?? turnPlayerId` as the acting player. Bonus actions do not chain.

