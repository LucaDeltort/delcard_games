# Card Packs

Card assets are stored in `static/cards/`. Structure:

```
static/cards/
  standard/
    default/       ← included pack (Kenney, CC0)
    <your-pack>/   ← your custom pack
```

Each player picks their pack locally — it is not synchronized over the network.

## Creating a pack for the standard deck

1. Create a folder: `static/cards/standard/<your-pack>/`
2. Provide the 60 PNG files listed below
3. Canonical size: **200 × 280 px**
4. Register your pack in `src/lib/decks/standard/packs.ts`

```ts
{
  id: 'your-pack',
  name: 'Display name',
  author: 'Your name',
  authorUrl: 'https://your-site.com',  // optional
  license: 'CC BY 4.0',               // optional
  basePath: '/cards/standard/your-pack'
}
```

## File list

**Cards (52)**

`card_<suit>_<face>.png`

- `<suit>`: `clubs`, `diamonds`, `hearts`, `spades`
- `<face>`: `02`–`10`, `J`, `Q`, `K`, `A` (digits 2–9 zero-padded: `02`…`09`)

Examples: `card_hearts_A.png`, `card_spades_10.png`, `card_clubs_07.png`

**Special (required)**

| File                   | Description  |
| ---------------------- | ------------ |
| `card_back.png`        | Card back    |
| `card_joker_black.png` | Black joker  |
| `card_joker_red.png`   | Red joker    |

**Optional**

| File                     | Description              |
| ------------------------ | ------------------------ |
| `card_empty.png`         | Empty slot (placeholder) |
| `card_clubs_suit.png`    | Clubs suit symbol        |
| `card_diamonds_suit.png` | Diamonds suit symbol     |
| `card_hearts_suit.png`   | Hearts suit symbol       |
| `card_spades_suit.png`   | Spades suit symbol       |
