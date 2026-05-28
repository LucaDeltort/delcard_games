# Dice Packs

Dice assets are stored in `static/dice/`. Structure:

```
static/dice/
  D6/
    classic/       ← included pack
    <your-pack>/   ← your custom pack
```

Each player picks their pack locally — it is not synchronized over the network.

## Creating a pack for the D6

1. Create a folder: `static/dice/D6/<your-pack>/`
2. Provide the 6 files listed below (SVG format)
3. Register your pack in `src/lib/dice/D6/packs.ts`

```ts
{
  id: 'your-pack',
  name: 'Display name',
  author: 'Your name',
  authorUrl: 'https://your-site.com',  // optional
  license: 'CC BY 4.0',               // optional
  basePath: '/dice/D6/your-pack',
  ext: '.svg'
}
```

## File list

Total: **6 files** — one per face value.

| File    | Face shown |
| ------- | ---------- |
| `1.svg` | 1          |
| `2.svg` | 2          |
| `3.svg` | 3          |
| `4.svg` | 4          |
| `5.svg` | 5          |
| `6.svg` | 6          |

Recommended canvas size: **157×157 px** (matches the included Classic pack).

The `Dice.svelte` component renders each file at 60×60 px inside a CSS 3D cube face. SVGs with a square viewBox and rounded corners (`rx="22"` on the background rect) look best.

---

## Creating a new dice type

A dice type defines the physical die shape and face count. Adding one (e.g. D8) requires four steps.

### 1 — Create the pack definition

Create `src/lib/dice/<DiceType>/packs.ts`:

```typescript
import type { DicePack } from '$lib/dice/types'

export const d8Packs: DicePack[] = [
  {
    id: 'classic',
    name: 'Classic',
    basePath: '/dice/D8/classic',
    ext: '.svg'
  }
]

export const defaultD8Pack = d8Packs[0]
```

### 2 — Register in the registry

Open `src/lib/dice/registry.ts` and add one entry to `diceRegistry`:

```typescript
import { d8Packs, defaultD8Pack } from '$lib/dice/D8/packs'

export const diceRegistry: DiceTypeEntry[] = [
  // ...existing entries...
  {
    slug: 'd8',
    name: 'D8',
    nameKey: 'dice.eightSided',   // add translation key in en.ts / fr.ts
    faceCount: 8,
    packs: d8Packs,
    defaultPackId: defaultD8Pack.id
  }
]
```

### 3 — Add visual assets

```
static/dice/D8/classic/
  1.svg … 8.svg
```

### 4 — Add translation key

In `src/lib/i18n/en.ts` and `fr.ts`, add the key under `dice`:

```ts
// en.ts
dice: {
  // ...
  eightSided: '8-Sided Die'
}

// fr.ts
dice: {
  // ...
  eightSided: 'Dé à 8 faces'
}
```

This is the only code change required. The `/dice` listing, `/dice/d8` face grid, pack switcher, and `DicePackPicker` all update automatically.

> **Note:** `Dice.svelte` currently implements a CSS 3D cube (6-face geometry only). A D8 or other non-cube geometry requires a separate component.

---

## Key files

| Path | Role |
| ---- | ---- |
| `src/lib/dice/types.ts` | `DicePack` type |
| `src/lib/dice/registry.ts` | `diceRegistry`, `getDiceBySlug`, `resolveDicePack` |
| `src/lib/dice/D6/packs.ts` | D6 pack definitions |
| `src/lib/stores/dicePacks.ts` | User pack selection (localStorage) |
| `src/lib/components/Dice.svelte` | 3D CSS cube component |
| `src/lib/components/DicePackPicker.svelte` | In-game pack picker carousel |
| `src/routes/dice/` | User-facing pack browser |
| `src/routes/lab/dice/` | Lab demo (roll animation, held state) |
| `src/routes/lab/dice-viewer/` | Lab pack browser |
| `static/dice/` | SVG assets |

---

## Component usage

### `Dice.svelte`

```svelte
<Dice value={3} rolling={false} held={false} diceSlug="d6" />
```

| Prop | Type | Default | Notes |
| ---- | ---- | ------- | ----- |
| `value` | `1–6` | `1` | Face to show |
| `rolling` | `boolean` | `false` | Triggers spin animation |
| `held` | `boolean` | `false` | Accent glow + lock badge |
| `diceSlug` | `string` | `'d6'` | Resolved from `diceRegistry` |
| `packId` | `string?` | — | Override store selection (lab/testing) |
| `faceSrcs` | `Partial<Record<1–6, string>>?` | — | Direct URL override (folder import) |

Without `packId`, the component reads the user's selection from the `dicePacks` store automatically.

### `DicePackPicker.svelte`

Renders only when the selected dice type has more than one pack registered.

```svelte
<DicePackPicker diceSlug="d6" />
```
