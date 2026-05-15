# Uno

**Players:** 2–8 · **Deck:** Uno (108 cards) · **Duration:** ~15 min

---

## Rules

### Card types

| Card | Description |
| ---- | ----------- |
| 0–9 (colored) | Number cards. One `0` and two each of `1`–`9` per color. |
| Skip | Next player loses their turn. |
| Reverse | Play direction reverses. With 2 players, acts as Skip. |
| Draw Two | Next player draws 2 cards and loses their turn. |
| Wild | Play on any card. You choose the new active color. |
| Wild Draw Four | Next player draws 4 and loses their turn. You choose color. |

Colors: **red**, **yellow**, **green**, **blue**.

### Setup

1. Shuffle the 108-card deck.
2. Deal **7 cards** to each player face down.
3. Flip the top remaining card face-up — this starts the **discard pile**. The first flip is always a number card (0–9); action and wild cards are returned to the draw pile until a number card comes up.
4. The active color is the color of the initial discard card.

### Turn

On your turn, do one of the following:

- **Play a card** from your hand that matches the active color, OR matches the face of the top discard card, OR is a Wild/Wild Draw Four.
- **Draw a card** from the draw pile. Your turn ends immediately after drawing (you do not play the drawn card).

### Wild cards

When you play a **Wild** or **Wild Draw Four**, you must choose the new active color before the next player acts.

### Draw pile empty

If the draw pile runs out, the discard pile (minus the top card) is reshuffled and becomes the new draw pile.

### Winning

The first player to empty their hand wins.

---

## Implementation notes

Source: [`src/lib/games/uno.ts`](../../src/lib/games/uno.ts)

### State type

```typescript
type UnoState = GameStateGeneric & {
  phase: 'playing' | 'gameover';
  direction: 1 | -1;          // 1 = clockwise, -1 = counter-clockwise
  currentColor: UnoColor;     // 'red' | 'yellow' | 'green' | 'blue'
}
```

### Zones

| Zone | Type | Contents |
| ---- | ---- | -------- |
| `draw` | `hidden` | Draw pile — `cards[0]` is the top card |
| `discard` | `public` | Discard pile — `cards[cards.length - 1]` is the top card |
| `hand_<pid>` | `hidden` | Each player's hand, `ownerId = pid` |

### Actions

| Action | Payload | Description |
| ------ | ------- | ----------- |
| `PLAY_CARD` | `{ cardId: string, chosenColor?: UnoColor }` | Play a card. `chosenColor` required for Wild and Wild Draw Four. |
| `DRAW_CARD` | — | Draw the top card from the draw pile. Ends the player's turn. |

`getValidActions` returns one `PLAY_CARD` per playable card (without `chosenColor`), plus one `DRAW_CARD`. The `UnoView` adds `chosenColor` via a color picker before dispatching wild actions.

### Direction and skip mechanics

`nextInDir(players, current, direction)` is a file-local helper that wraps `nextPlayer` with direction support. Skip and action-card effects are computed by calling it once or twice:

- **Skip**: advance 2 steps (skip the immediate next player).
- **DrawTwo / WildDrawFour**: call `drawCards` for the next player, then advance 2 steps.
- **Reverse (2 players)**: flip direction, then advance 2 steps (acts as Skip).
- **Reverse (3+ players)**: flip direction, advance 1 step in the new direction.

### Reshuffle

`reshuffleDiscard(zones)` keeps the top discard card in place and shuffles the rest back into the draw pile. Called automatically by `drawCards` when the draw pile is empty.

### View

`UnoView.svelte` renders Uno-specific card images (no `PlayingCard.svelte`). It uses a local `cardSrc` function:

```typescript
function cardSrc(card: Card, showBack = false): string {
  const ext = pack.ext ?? '.png'
  if (showBack || card.isHidden) return `${pack.basePath}/card_back${ext}`
  if (!card.suit) return `${pack.basePath}/card_${card.face.toLowerCase()}${ext}`
  return `${pack.basePath}/card_${card.suit}_${card.face.toLowerCase()}${ext}`
}
```

Wild card color selection is handled client-side: clicking a Wild sets `pendingCardId`, which opens an overlay. Picking a color dispatches the action with `chosenColor` appended.

Image assets go in `static/cards/UnoDeck/default/`. See [card-pack.md](../card-pack.md#creating-a-pack-for-the-uno-deck) for the full file list.
