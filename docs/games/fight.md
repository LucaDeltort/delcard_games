# The Fight (La Bagarre)

**Players:** 3–6 · **Deck:** Standard 52 cards · **Duration:** ~10 min

_Original game by Marty · Fef · Tino Chaumont — [la-bagarre.com](https://la-bagarre.com)_

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

Place the drawn card **face down** in front of you without looking at it. On your next attack, reveal and discard your charge, then draw your attack card. The **charge value adds to the attack**.

**Charge rules:**

- If you take HP damage while holding a charge, you **must discard it**.
- You are **not forced to attack** while charged, but if you do attack, you **must** use the charge.
- You can hold only **one charge** at a time.

---

### End of game

When a player's HP reaches **zero**, they are **eliminated** and their cards are discarded.

**The last player standing wins.**

---

### Special rules

#### Murder

When you eliminate a player, **immediately take one extra action**.

#### Clairvoyance

While you have **exactly 1 HP**, you may **look at the top card of the draw pile** before choosing your action (including deciding whether to charge).

#### Dragon's Awakening

When the draw pile runs out, reform it by shuffling the discard. Finish the current action, then **each player is attacked by the deck** in turn order starting from the next player.

---

## Implementation notes

Source: [`src/lib/games/fight.ts`](../../src/lib/games/fight.ts)

**HP tracking.** HP is stored as a plain number in `state.hp` rather than as cards in a zone. The physical card-based HP display is a tabletop token mechanic; digitally, the number is sufficient.

**Zones per player:** `shield_<pid>` (public, 1 card), `charge_<pid>` (hidden, 0–1 card).

**Global zones:** `draw` (hidden), `discard` (public).

**Turn model.** `state.pendingBonusAction` holds the player ID when a bonus action (Murder) is pending. `getValidActions` uses `pendingBonusAction ?? turnPlayerId` as the acting player. Bonus actions do not chain.

**Clairvoyance.** Not modelled in the engine — it is a visibility permission (`state.hp[pid] === 1` → the UI layer may reveal the top draw card to that player). No engine action needed.

**Dragon's Awakening.** Fires at the end of the current player's turn if the draw pile became empty during that turn (before or after their draw). The discard is reshuffled and all active players are attacked in order. Dragon attacks do not grant bonus actions.
