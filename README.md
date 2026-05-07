# Delcard Games

An online card game platform for playing with friends — fully client-side, no server required.

Players connect directly peer-to-peer via [PeerJS](https://peerjs.com/). The host is the source of truth: they validate actions, update game state, and broadcast it to all players.

## Stack

- [SvelteKit](https://svelte.dev/) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)
- [PeerJS](https://peerjs.com/) (WebRTC P2P)

## Getting started

```bash
npm install
npm run dev
```

Type-check:

```bash
npm run check
```

## Deploy (Netlify)

This project is configured with `@sveltejs/adapter-netlify`.

- Build command: `npm run build`
- Publish directory: `build` (defined in `netlify.toml`)

## Adding a game

The engine is designed so each game is a self-contained `GameDefinition` object — no framework knowledge needed.

See **[docs/engine.md](docs/engine.md)** for the full guide.

Existing games: [War](docs/games/war.md) · [The Fight (La Bagarre)](docs/games/fight.md)

## Project structure

```
src/lib/
  engine/     # pure utility functions (shuffle, deal, zones…)
  games/      # one file per game
  decks/      # deck types and visual themes
  network/    # PeerJS host/client wrappers (in progress)
src/routes/
  /           # lobby — create or join a game
  /game/[id]  # game room
docs/
  engine.md         # how to build a game
  games/            # rules for each included game
```

## Bug reports

Found a bug? Use the in-app bug report button (Settings drawer → bottom, or the Bug button in the corner) — it opens a short [Tally form](https://tally.so/r/rj27WR).

## Game proposals

Want a new game added? Use the in-app proposal link (Settings drawer → bottom) — it opens a short [Tally form](https://tally.so/r/VLog7J).

## License

[MIT](LICENSE) — © 2026 Luca Deltort
