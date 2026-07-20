# Sounds

Sound effects and voice cues. Files live in `static/sounds/` (OGG format).

```
static/sounds/
  card-flip.ogg       ← shared SFX
  dice-roll.ogg
  fr/night-falls.ogg  ← localized voice (one folder per locale)
  en/night-falls.ogg
```

Each sound is registered in `src/lib/audio/sounds.ts` and played via
`src/lib/audio/player.ts`. Playback uses the WebAudio API: each file is decoded
once into a buffer and replayed through a fresh source node, so sounds overlap
freely. Volume/mute come from the `settings` store; voice files resolve to the
current locale automatically.

## Playing a sound

```ts
import { playSound, playLoop } from '$lib/audio/player'
import { Sounds } from '$lib/audio/sounds'

playSound(Sounds.sfx.CardFlip)        // one-shot, overlaps freely
playSound(Sounds.sfx.CardFlip, 0.3)   // optional 0..1 volume override
const stop = playLoop(Sounds.sfx.DiceRoll) // returns stop()
```

## Adding a sound

1. Drop the file in `static/sounds/` (or `static/sounds/<locale>/` for voice).
2. Register it in `src/lib/audio/sounds.ts`:
   - SFX: `Foo: sfx('foo')` under `Sounds.sfx`
   - Voice: `Foo: voice('foo')` under `Sounds.voice` (one file per locale)
3. Optional baseline gain (0..1): `sfx('foo', 0.5)`.

Test every sound in the LAB: `/lab/sound` — play, loop, per-sound gain slider,
locale switch, and a "missing" flag for files not yet present.

## Catalog

`gain` = baseline level relative to master volume (1.0 = full).

### SFX

| Key                   | File             | Gain | Copyright / source                              |
| --------------------- | ---------------- | ---- | ----------------------------------------------- |
| `Sounds.sfx.CardFlip` | `card-flip.ogg`  | 1.0  | [KENNEY](https://kenney.nl/assets/casino-audio) |
| `Sounds.sfx.DiceRoll` | `dice-roll.ogg`  | 1.0  | [KENNEY](https://kenney.nl/assets/casino-audio) |
| `Sounds.sfx.Boom`     | `boom.ogg`       | 1.0  | [ZAPSPLAT](https://www.zapsplat.com)            |

### Voice (localized)

Werewolf narration. Files live under `static/sounds/<locale>/<file>`. `wake`/`sleep`
cues bracket each night role. `cupid-*` and `lovers-*` play on the first night only.

| Key                         | File                | Copyright                            |
| --------------------------- | ------------------- | ------------------------------------ |
| `Sounds.voice.NightFalls`   | `night-falls.ogg`   | [ELEVENLABS](https://elevenlabs.io/) |
| `Sounds.voice.DayBreaks`    | `day-breaks.ogg`    | [ELEVENLABS](https://elevenlabs.io/) |
| `Sounds.voice.CupidWake`    | `cupid-wake.ogg`    | [ELEVENLABS](https://elevenlabs.io/) |
| `Sounds.voice.CupidSleep`   | `cupid-sleep.ogg`   | [ELEVENLABS](https://elevenlabs.io/) |
| `Sounds.voice.LoversWake`   | `lovers-wake.ogg`   | [ELEVENLABS](https://elevenlabs.io/) |
| `Sounds.voice.LoversSleep`  | `lovers-sleep.ogg`  | [ELEVENLABS](https://elevenlabs.io/) |
| `Sounds.voice.DefenderWake` | `defender-wake.ogg` | [ELEVENLABS](https://elevenlabs.io/) |
| `Sounds.voice.DefenderSleep`| `defender-sleep.ogg`| [ELEVENLABS](https://elevenlabs.io/) |
| `Sounds.voice.WolvesWake`   | `wolves-wake.ogg`   | [ELEVENLABS](https://elevenlabs.io/) |
| `Sounds.voice.WolvesSleep`  | `wolves-sleep.ogg`  | [ELEVENLABS](https://elevenlabs.io/) |
| `Sounds.voice.WitchWake`    | `witch-wake.ogg`    | [ELEVENLABS](https://elevenlabs.io/) |
| `Sounds.voice.WitchSleep`   | `witch-sleep.ogg`   | [ELEVENLABS](https://elevenlabs.io/) |
| `Sounds.voice.SeerWake`     | `seer-wake.ogg`     | [ELEVENLABS](https://elevenlabs.io/) |
| `Sounds.voice.SeerSleep`    | `seer-sleep.ogg`    | [ELEVENLABS](https://elevenlabs.io/) |
| `Sounds.voice.VillageWins`  | `village-wins.ogg`  | [ELEVENLABS](https://elevenlabs.io/) |
| `Sounds.voice.WolvesWin`    | `wolves-win.ogg`    | [ELEVENLABS](https://elevenlabs.io/) |
| `Sounds.voice.LoversWin`    | `lovers-win.ogg`    | [ELEVENLABS](https://elevenlabs.io/) |

Fill the **Copyright** column with the author/license of each asset
(e.g. `freesound.org/... — CC0`, or `narrator: <name>`). Keep it in sync when adding sounds.
