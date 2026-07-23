# Delcard Games

Play card games with friends, right in your browser. No account, no server, no setup.
Players connect peer-to-peer via [PeerJS](https://peerjs.com/) (WebRTC) - one player hosts,
the others join with a 4-character code.

## Quick start

```bash
npm install
npm run dev
```

Open the printed URL, pick a game, enter a nickname, and share the room code with friends.

Type-check:

```bash
npm run check
```

Run tests:

```bash
npm test
```

## How it works

- The **host** creates a room and becomes the source of truth: they validate every action,
  update the game state, and broadcast changes to all connected players.
- **Clients** connect only to the host (star topology). They send actions and receive state updates.
- If the host leaves mid-game, a new host is elected automatically from remaining players (**host migration**).
- Players can refresh the page or briefly lose connection without losing their seat (reconnection within a 60-second grace window).

For the full protocol specification (all message types, lifecycle flows, constants),
see [docs/protocol.md](docs/protocol.md).

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit (Svelte 5) + TypeScript |
| Styling | Tailwind CSS v4 |
| UI components | shadcn-svelte (bits-ui) |
| Icons | lucide-svelte |
| Networking | PeerJS (WebRTC P2P) |
| Build | Vite, adapter-netlify |

## Project structure

```
src/lib/
  engine/     # pure utilities (shuffle, deal, zones)
  games/      # one folder per game definition
  decks/      # deck types and visual themes (card packs)
  dice/       # dice types and visual packs
  network/    # PeerJS host/client wrappers, messages, TURN config
  audio/      # sound engine (preloading, gain control, narration)
  stores/     # Svelte stores (session, settings, game options)

src/routes/
  /           # home - create a game
  /join       # join via code
  /game/[id]  # game room (lobby + gameplay)
  /decks      # card pack browser
  /dice       # dice pack browser
  /lab        # developer component sandbox (not linked in production)
```

## Documentation

### Engine & games

| Document | Description |
|----------|-------------|
| [docs/engine.md](docs/engine.md) | How to build a new game using `GameDefinition<State>`. Covers setup, actions, validation, auto-actions, disconnect handling. |
| [docs/games/](docs/games/) | Rules for each included game (War, The Fight, Color, Presidents, Purple, Werewolf, Yams). |

### Assets

| Document | Description |
|----------|-------------|
| [docs/card-pack.md](docs/card-pack.md) | Card deck system: how `DeckType` (card logic) and `CardPack` (visual assets) work, how to add a new pack. |
| [docs/dice-pack.md](docs/dice-pack.md) | Dice system: same pattern as card packs but for dice (`DiceTypeEntry`, `DicePack`). |

### Network

| Document | Description |
|----------|-------------|
| [docs/protocol.md](docs/protocol.md) | Full P2P protocol spec: all 13 message types, reconnection, host migration, heartbeat, constants. |

### UI & UX

| Document | Description |
|----------|-------------|
| [docs/game-layout.md](docs/game-layout.md) | Layout conventions for game views (responsive grid, zone display, hand areas). |
| [docs/sound.md](docs/sound.md) | Audio architecture: preloading, gain management, turn-based narration. |

### Development

| Document | Description |
|----------|-------------|
| [docs/contributing.md](docs/contributing.md) | Contribution guidelines, commit conventions, branch workflow. |
| [docs/lab.md](docs/lab.md) | Developer sandbox at `/lab`: component showcase, JSON state editor, single-player testing. |

## Adding a new game

Each game is a self-contained `GameDefinition` object that lives in its own folder under
`src/lib/games/<name>/`. The definition handles setup, valid actions, applying actions,
and win detection - no framework knowledge needed.

See **[docs/engine.md](docs/engine.md)** for the complete guide.

## Deploy (Netlify)

This project uses `@sveltejs/adapter-netlify`.

- Build command: `npm run build`
- Publish directory: `build` (defined in `netlify.toml`)

## Bug reports & proposals

Found a bug or want a new feature? Use the in-app forms accessible from the Settings drawer:
- Bug report -> opens a [Tally form](https://tally.so/r/rj27WR)
- Card pack proposal -> opens a [Tally form](https://tally.so/r/Y5V8b5)
- Game proposal -> opens a [Tally form](https://tally.so/r/VLog7J)

## License

[MIT](LICENSE) - (c) 2026 Luca Deltort
