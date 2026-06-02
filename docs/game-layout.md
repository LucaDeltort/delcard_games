# GameLayout

`GameLayout.svelte` handles opponent placement for multiplayer game views. It renders opponents in a **vertical list on mobile** and an **ellipse arc on desktop** (≥ 768 px), with a center slot for game-specific content (draw piles, dice, phase icons, etc.).

---

## Usage

```svelte
<script lang="ts">
  import GameLayout from '$lib/components/games/GameLayout.svelte'

  // opponents: player IDs to display (everyone except the local player)
  const opponents = $derived(gs.players.filter((p) => p !== myPlayerId))
</script>

{#snippet opponentTile(pid: string)}
  <!-- whatever you want to show for each opponent -->
  <div class="my-tile">{playerName(pid)}</div>
{/snippet}

{#snippet center()}
  <!-- content placed at the visual centre of the arc on desktop,
       and above the list on mobile -->
  <MyDrawPile />
{/snippet}

<GameLayout {opponents} {opponentTile} {center} />
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `opponents` | `string[]` | Ordered list of opponent player IDs |
| `opponentTile` | `Snippet<[pid: string]>` | Renders once per opponent, receives the player ID |
| `center` | `Snippet` | Renders at the arc centre (desktop) and above the list (mobile) |

---

## Layout behaviour

**Mobile (< 768 px)**

```
┌──────────────────────────┐
│  [center snippet]        │
│  ── ── ── ── ── ── ──    │
│  [opponentTile pid=A]    │
│  [opponentTile pid=B]    │
│  [opponentTile pid=C]    │
└──────────────────────────┘
```

**Desktop (≥ 768 px)**

```
        [B]   [C]
    [A]           [D]
            ★          ← center snippet at left:50% top:62%
```

Opponents are distributed along an ellipse arc (165° → 15°, upper half) with arc-length sampling so spacing is even regardless of the container's aspect ratio.

---

## Arc geometry

The arc is fixed: `RX = 40%`, `RY = 44%`, centred at `(50%, 62%)` of the container. The container fills its parent via `flex: 1` so it naturally expands inside any flex-column game root.

The algorithm (`src/lib/components/games/arcPositions.ts`) samples 400 points along the ellipse, computes cumulative arc length in pixels (accounting for the container's actual width/height), then places each opponent at an equal arc-length interval.

---

## Adding GameLayout to a new game view

1. Derive your `opponents` array (everyone except `myPlayerId`).
2. Define an `{#snippet opponentTile(pid)}` with the opponent's visual representation.
3. Define an `{#snippet center()}` with the table/board content.
4. Drop `<GameLayout {opponents} {opponentTile} {center} />` where the arc should appear in your layout.

The snippets are evaluated in your component's scope, so all reactive state and scoped CSS classes are fully available inside them.

---

## Files

| File | Role |
|------|------|
| `src/lib/components/games/GameLayout.svelte` | Component — mobile list + desktop arc |
| `src/lib/components/games/arcPositions.ts` | Pure function — computes `{ pid, left, top }[]` |
