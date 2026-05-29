# Werewolf (Loup-Garou)

**Players:** 4–16 · **Deck:** WerewolfDeck (role cards, one per player)

---

## Rules

A social-deduction night/day game. Each player is dealt a secret role. The village (and any special-role villagers) try to identify and lynch the werewolves; the werewolves try to outnumber the village.

### Setup

1. Each player connects to the lobby and taps to reveal their secret role card.
2. Once everyone is ready, the host starts the night.

### Night

Roles act in a fixed order. The active role's players see their action UI; everyone else sees "Village sleeping…" with a countdown.

| Order | Role     | Action                                                                                              | First night only |
| ----- | -------- | --------------------------------------------------------------------------------------------------- | ---------------- |
| 1     | Cupid    | Designate two players as lovers — if one dies, the other dies too.                                  | ✓                |
| 2     | Defender | Pick a player (or self) to protect from the wolves. Cannot pick the same player two nights in a row.|                  |
| 3     | Wolves   | All living wolves vote on a single victim. Majority wins.                                           |                  |
| 4     | Witch    | One save potion (cancel the wolf kill) and one poison (kill another player). One use each per game. |                  |
| 5     | Seer     | Reveal one player's true role.                                                                      |                  |

Roles not in play (or whose holder is dead) skip their turn automatically. Each turn ends when the role's input is in (one valid action, or all wolves voted), or when the timer expires.

### Day

1. **Mayor election** (first day only, if enabled). Living players vote; majority wins. Mayor's vote counts double during day lynches.
2. **Discussion** — players talk freely (out-of-band, e.g. voice chat).
3. **Vote** — every living player picks a target. Majority is lynched.

On a tied vote, if a **Scapegoat** is alive they die instead; otherwise nobody dies.

### Reactive deaths

- **Hunter** — when killed (night or day), shoots one player who dies immediately.
- **Elder** — survives the first wolf attack. If lynched, all special-role powers are lost for the rest of the game.
- **Village Idiot** — first time lynched, the card is revealed publicly and the idiot survives but loses voting rights. Subsequent lynches kill normally.
- **Mayor** — when killed, picks a successor before the next phase resumes.
- **Lovers** — if one dies, the other dies too (chain resolves all reactions).

### Win conditions

- **Villagers** — all wolves dead.
- **Wolves** — wolves ≥ non-wolves.
- **Lovers** — last two alive, mixed-team only (one wolf + one villager).

---

## Implementation notes

Source: [`src/lib/games/werewolf/`](../../src/lib/games/werewolf/)

The werewolf code is split into per-concern files to keep `werewolf.ts` (the `GameDefinition` entry point) thin.

| File              | Owns                                                                                |
| ----------------- | ----------------------------------------------------------------------------------- |
| `werewolf.ts`     | `GameDefinition` entry point — setup, action dispatch, options schema, scheduling   |
| `roles.ts`        | `ROLE_DEFS` — single source of truth for role keys, weights, count fields, limits   |
| `types.ts`        | `WerewolfState`, `WerewolfOptions`, `Role`, `NightStepKey`                          |
| `turns.ts`        | One `Turn` class per night-acting role + ordered `TURNS` list                       |
| `phases.ts`       | `enterNight`, `enterDay`, `startDayVoting`, `resolveMayorElection`                  |
| `resolution.ts`   | Night/day resolution, death chaining, hunter/mayor pause, win check                 |
| `composition.ts`  | Weight-based `autoComposition`, `assignRoles`                                       |
| `votes.ts`        | Plurality helper                                                                    |

### Adding a role

`ROLE_DEFS` is the single source of truth — composition weights, options schema, setup defaults, `canStart`, and `assignRoles` all derive from it.

To add a new role:

1. Append an entry to `ROLE_DEFS` in `roles.ts` (key, countKey, weight, default/min/max).
2. Add the matching `<key>Count: number` field on `WerewolfOptions` (`types.ts`).
3. Add i18n strings (`role<Key>`, `desc.<key>`, `options.<key>Count`).
4. Drop a card asset in `static/cards/Werewolf/thiercelieux/card_<key>.png` and add the key to `WEREWOLF_CARD_FACES` (`src/lib/decks/WerewolfDeck/cards.ts`).
5. If the role acts at night: add a `Turn` subclass in `turns.ts` (extending `NightTurn`), append it to `TURNS` in the right night order, and add `phase<Key>` i18n.
6. If the role has a reactive death effect: extend `applyDeaths` / `finishResolution` (`resolution.ts`).

### Composition

`autoComposition(n)` picks role weights (werewolves negative, support roles positive) and accepts the first random subset whose total score lands in `[-2, +2]`. Falls back to wolves + 1 seer + villagers if no balanced draw is found in 500 attempts.

Per-role caps:
- Werewolves = `Math.max(1, floor(n / 4))`
- Special roles get one slot each (max one of each per game)
- Villagers fill the rest

### Night flow

`turns.ts` exposes `firstActiveStep` / `nextActiveStep` / `startStep` — the night runs as a state machine driven by the `TURNS` order. After every accepted action, `applyAction` calls `turn.isComplete(next)`:
- If yes → advance to the next active step (or resolve the night if none left).
- If no → keep the timer running (e.g. wolves still voting).

This lets a single completed input (defender picking, seer peeking, witch confirming, all wolves voting) end the turn early without waiting on the countdown.

### Mayor death pause

If `mayorEnabled` and the mayor dies mid-resolution, `finalizeTransition` sets `pendingMayor` and pauses before the next phase. The dying player picks a successor via `MAYOR_SUCCESSOR`, or the host can skip via `NEXT_PHASE`.

Mayor pause and hunter pause share the same `finalizeTransition` exit so they compose correctly across night, day, and reactive deaths.

### Privacy

Players can hide their own card; while hidden, role-derived UI (seer reveals, lover badge, defender protection ring) is masked. The card auto-flips up only when the player has a **night** action to perform, so day votes don't leak role info.
