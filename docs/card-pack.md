# Card Packs

Card assets are stored in `static/cards/`. Structure:

```
static/cards/
  FrenchDeck/
    default/       ← included pack
    <your-pack>/   ← your custom pack
```

Each player picks their pack locally — it is not synchronized over the network.

## Creating a pack for the French deck

1. Create a folder: `static/cards/FrenchDeck/<your-pack>/`
2. Provide the 55 files listed below
3. SVG format is preferred, but PNG is also accepted (must be 500x700px)
4. Register your pack in `src/lib/decks/FrenchDeck/packs.ts`

```ts
{
  id: 'your-pack',
  name: 'Display name',
  author: 'Your name',
  authorUrl: 'https://your-site.com',  // optional
  license: 'CC BY 4.0',               // optional
  basePath: '/cards/FrenchDeck/your-pack',
  ext: '.svg'  // omit for PNG (default), set to '.svg' for SVG packs
}
```

## File list

Total: **55 files** (52 standard cards + 1 back + 2 jokers)

File names use the extension matching your `ext` field (`.svg` or `.png`).

**Standard cards (52)**

`card_<suit>_<face>.<ext>`

- `<suit>`: `clubs`, `diamonds`, `hearts`, `spades`
- `<face>`: `02`–`10`, `J`, `Q`, `K`, `A` (digits 2–9 zero-padded: `02`…`09`)

Examples: `card_hearts_A.svg`, `card_spades_10.svg`, `card_clubs_07.svg`, `card_diamonds_J.svg`

**Special (required)**

| File                    | Description  |
| ----------------------- | ------------ |
| `card_back.<ext>`        | Card back    |
| `card_joker_black.<ext>` | Black joker (always included; usage depends on game) |
| `card_joker_red.<ext>`   | Red joker (always included; usage depends on game) |

---

## Creating a new deck type

A deck type defines which cards exist. Adding one requires four steps.

### 1 — Register the type name

Add your type to the `DeckType` union in `src/lib/core/types.ts`:

```typescript
export type DeckType = 'FrenchDeckWithJoker' | 'FrenchDeckWithoutJoker' | 'YourDeckType'
```

### 2 — Define the cards

Create `src/lib/decks/<YourDeckType>/cards.ts` and export a function that returns the full unshuffled card list:

```typescript
import { createCard } from '$lib/engine/cards'
import type { Card } from '$lib/core/types'

export function createYourDeck(): Card[] {
  return [
    createCard('face', 'suit'),
    // ...
  ]
}
```

`createCard(face, suit?, isHidden?)` — `suit` is optional for suitless cards (e.g. jokers, trumps).

### 3 — Add to the engine registry

Open `src/lib/engine/decks.ts` and add one entry:

```typescript
import { createYourDeck } from '$lib/decks/YourDeckType/cards'

const registry: Record<DeckType, () => Card[]> = {
  FrenchDeckWithJoker:    () => createFrenchDeck(true),
  FrenchDeckWithoutJoker: () => createFrenchDeck(false),
  YourDeckType:           () => createYourDeck(),   // ← add this
}
```

### 4 — Add visual assets

Follow the same structure as the French deck:

```
static/cards/YourDeckType/
  default/
    card_<...>.<ext>
    card_back.<ext>
```

Then create `src/lib/decks/<YourDeckType>/packs.ts`:

```typescript
import type { CardPack } from '$lib/decks/types'

export const yourDeckPacks: CardPack[] = [
  {
    id: 'default',
    name: 'Default',
    author: 'Your name',
    basePath: '/cards/YourDeckType/default',
    ext: '.svg',
  },
]
```

File naming is free-form — just be consistent within a pack so the UI can resolve card paths.
