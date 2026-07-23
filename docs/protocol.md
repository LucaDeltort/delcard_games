# Network Protocol

The Delcard network layer uses [PeerJS](https://peerjs.com/) (WebRTC) for P2P communication between players.

## Architecture

- **Star topology**: All clients connect to a single host. The host is the source of truth.
- **Host** = validates actions, updates game state, broadcasts to all clients.
- **Client** = sends actions to host, receives state updates.
- No server required - connections are peer-to-peer.

## Peer ID Convention

| Role | Format | Example |
|------|--------|---------|
| Original host | `delcard-{CODE}` | `delcard-AB3K` |
| Migrated host | `delcard-{CODE}-m{N}` | `delcard-AB3K-m1` |
| Client | Random (PeerJS auto-generated) | `abc123-x789` |

`CODE` = 4-character room code (characters: A-Z excluding I,O + 2-9).

## Message Types

### ClientMessage (client -> host)

#### JOIN
Sent when a client connects to the host. If `resumePlayerId` is provided, the host treats this as a reconnection from a migrated session.

```typescript
{ type: 'JOIN'; playerName: string; resumePlayerId?: string }
```

#### ACTION
A player action (play card, pass, etc.). Validated by the host before being applied.

```typescript
{ type: 'ACTION'; action: Action }
```

#### RESYNC
Request a full state resync (sent when sequence numbers are out of order).

```typescript
{ type: 'RESYNC' }
```

#### PING / PONG
Heartbeat mechanism. Client sends PING with timestamp, host replies with PONG. Used to detect connection drops and measure RTT.

```typescript
// Client -> Host
{ type: 'PING'; t: number }
// Host -> Client (echoes same timestamp)
{ type: 'PONG'; t: number }
```

### HostMessage (host -> clients)

#### WELCOME
Sent in response to JOIN. Assigns or restores the player's ID and provides the game ID and current host's player ID.

```typescript
{ type: 'WELCOME'; playerId: string; gameId: string; hostPlayerId: string }
```

#### LOBBY
Lobby update with current player list and game options. Sent whenever players join, leave, or options change.

```typescript
{ type: 'LOBBY'; players: LobbyPlayer[]; options: Record<string, unknown> }
```

#### STATE
Full game state broadcast. Includes a sequence number for ordering. Clients detect gaps and request RESYNC if needed.

```typescript
{ type: 'STATE'; state: GameStateGeneric; seq: number }
```

#### HOST_GONE
The host is permanently closing (kicked, navigated away without migration). Clients should show an error and redirect home.

```typescript
{ type: 'HOST_GONE'; message: string }
```

#### MIGRATE_HOST
The current host is gracefully handing off. Clients should immediately start the host election process using the given migration index.

```typescript
{ type: 'MIGRATE_HOST'; migrationIndex: number }
```

#### REJECTED
The client was rejected from joining (e.g., game is full).

```typescript
{ type: 'REJECTED'; message: string }
```

#### PING / PONG
See above. Bidirectional - host also responds to PINGs from clients.

## Connection Lifecycle

### Normal flow

1. Host creates a game -> gets peer ID `delcard-{CODE}`
2. Client joins -> sends `JOIN`
3. Host responds with `WELCOME`, then `LOBBY`, then `STATE` (if game started)
4. Client sends `ACTION` messages; host validates and broadcasts new `STATE`

### Reconnection (within grace window)

When a client temporarily disconnects (network blip, tab switch):

1. Host sets a 60-second timer (`pendingDisconnects`)
2. Client retries with exponential backoff (6 attempts over ~47 seconds)
3. If client reconnects within 60s -> host clears timer, sends full state
4. If not -> host processes disconnect via `onPlayerDisconnect`

### Page reload recovery

1. Client stores its peer ID and player name in `sessionStorage`
2. On page load, game page checks for stored session
3. Creates a new `GameClient` with the stored credentials
4. Sends `JOIN` with `resumePlayerId` to restore the seat

### Host migration

1. Host calls `migrateAway()` -> broadcasts `MIGRATE_HOST` with next migration index
2. Each client races to claim the reserved peer ID `delcard-{CODE}-m{N}`
3. Winner becomes new host via `GameHost.resume()`
4. Losers connect to the winner as regular clients
5. Migrated host starts 60-second timers for each remaining player
6. Players reconnect with their old `playerId` (via `resumePlayerId` in JOIN)

### Spectator handling

- Spectators (not in `state.players`) skip the election race entirely
- They directly probe for the migrated host and reconnect as a client
- This avoids unnecessary delays for non-playing observers

## Heartbeat & Quality Detection

- Client sends PING every 5 seconds
- Host responds with PONG echoing the timestamp
- If no PONG received within 12 seconds -> connection considered dead -> triggers retry/migration
- RTT (round-trip time) determines quality:
  - `<100ms` = good (green)
  - `<300ms` = warn (yellow)
  - `>=300ms` = poor (red)

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `RETRY_BACKOFF_MS` | `[1000, 2000, 4000, 8000, 12000, 20000]` | Exponential backoff between retries |
| `MAX_RETRIES` | 6 | Maximum reconnection attempts |
| `PING_INTERVAL_MS` | 5000 | Heartbeat frequency |
| `PONG_TIMEOUT_MS` | 12000 | Time without PONG before disconnection |
| `RECONNECT_WINDOW_MS` | 60000 | Grace period for player reconnection |
| `MAX_MIGRATION_PROBE` | 5 | Max migration levels to probe |
| `MIGRATION_RACE_TIMEOUT_MS` | 5000 | Timeout for election race |

## File Reference

- `src/lib/network/host.ts` - GameHost class (source of truth)
- `src/lib/network/client.ts` - GameClient class (player connection)
- `src/lib/network/messages.ts` - Message type definitions
- `src/lib/network/turn.ts` - TURN/STUN server configuration
- `src/lib/stores/session.ts` - Svelte stores for active host/client instances
