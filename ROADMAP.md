# ROADMAP

Major future updates for `delcard_games`.

## Tier 1 — Ship readiness

| Item | Status |
| --- | --- |
| Add GitHub Actions CI (lint / check / build) | Done |
| Add preview deployments per PR (Netlify + Actions) | Done |
| Standardize full deployment pipeline | Done |
| Document production environment config | Done |

## Tier 2 — Network reliability

| Item | Status |
| --- | --- |
| Improve network error handling and user feedback | Done |
| More reliable reconnection with full state resync | Done |
| Handle non-host player disconnect mid-game | Done |
| Evaluate dedicated PeerJS server (controlled signaling) | Not started |
| Add TURN support for strict networks / difficult NATs | Not started |
| Anti-desync strategy (host/client state verification) | Not started |
| Connection quality indicator (latency / drop warning) | Not started |
| Host migration (session survives if host leaves) | Not started |

## Tier 3 — Core UX

| Item | Status |
| --- | --- |
| PWA support + mobile / responsive polish | Not started |
| Rematch / new game without full rejoin | Not started |
| Player kick / remove from session (host power) | Not started |

## Tier 4 — Test coverage

| Item | Status |
| --- | --- |
| Increase test coverage for engine and critical network flows | Not started |

## Tier 5 — Content

| Item | Status |
| --- | --- |
| Add new games (definitions, views, rules) | Not started |
| Add game variants and custom rules per session | Not started |
| Expand deck / theme system (visual assets, deck types) | Not started |

## Tier 6 — Community & ops

| Item | Status |
| --- | --- |
| Spectator mode (watch without playing) | Not started |
| Add a "Report bug" form | Not started |
| Add bug tracking and minimal non-intrusive client telemetry | Not started |
| Add analytics tools | Not started |
| Developer guide for adding new games | Not started |
| Add a "Submit card pack" form (design) | Not started |
| Add a "Submit game proposal" form | Not started |
