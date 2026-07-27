# Playtest Checklist

Manual test cases for each game. Run every scenario with 4+ players when possible.
Check the box when a case passes. File bugs for failures using the template at the bottom.

---

## General (all games)

### Lobby & startup
- [ ] Create a room, share code, 2nd player joins
- [ ] Min players: start button disabled below threshold
- [ ] Max players: join blocked at capacity
- [ ] Spectator can join an ongoing game
- [ ] Start game with options changed from defaults
- [ ] Options persist locally after leaving and rejoining lobby

### In-game networking
- [ ] Host refreshes page - reconnection within 60s grace window
- [ ] Client refreshes page - reconnection within 60s grace window
- [ ] Player disconnects mid-game - others continue
- [ ] Host leaves mid-game - host migration triggers, game continues
- [ ] All players except one leave - game ends gracefully
- [ ] Chat messages send/receive correctly (if implemented)
- [ ] Timer per turn fires auto-action on expiration (if enabled)

### Game over
- [ ] Winner banner appears with correct name
- [ ] Rematch button works (host only)
- [ ] Back home returns to lobby/home screen
- [ ] Result sharing copies correct text/emoji summary

---

## War

**Players:** 2 | **Deck:** 52 cards

### Core flow
- [ ] Both players reveal top card sequentially
- [ ] Higher card wins both, lower card loses
- [ ] Tie: both cards discarded (no winner for round)
- [ ] Round auto-resolves when both `played_` zones are non-empty
- [ ] Decks deplete evenly (26 each)

### Edge cases
- [ ] Game ends when any deck is empty
- [ ] Winner = player with most cards (deck + won pile)
- [ ] Exact tie in total cards (check winner selection)
- [ ] Player disconnects - game ends or opponent wins by remaining
- [ ] Rapid clicks on REVEAL do not double-play

---

## The Fight (La Bagarre)

**Players:** 3-6 | **Deck:** 52 cards

### Setup
- [ ] Each player gets 3 cards: 2 HP (vertical), 1 Shield (horizontal)
- [ ] If sum <= 15, hand is rejected and redrawn until valid
- [ ] Discarded hands shuffled back into draw pile
- [ ] Lowest total goes first; tiebreak = lowest Shield, then random

### Turn actions
- [ ] Attack: drawn card > target Shield -> target loses HP equal to difference
- [ ] Attack: drawn card <= target Shield -> nothing happens
- [ ] Change Shield: discard old shield, replace with drawn card
- [ ] Charge: place drawn card face-down (max 2 charges)
- [ ] Charged attack: all charges revealed + added to attack value
- [ ] Taking damage while charged -> must discard all charges
- [ ] Cannot hold more than 2 charges
- [ ] Not forced to attack while charged, but if attacking must use all charges

### Elimination & win
- [ ] HP reaches 0 -> player eliminated, cards discarded
- [ ] Murder rule: eliminating a player grants one bonus action
- [ ] Bonus action does NOT chain (can't murder again from the bonus)
- [ ] Last player standing wins

### Edge cases
- [ ] Draw pile runs out -> reshuffle discard pile
- [ ] Player disconnects mid-turn -> turn advances correctly
- [ ] pendingBonusAction transfers correctly when target disconnects
- [ ] All opponents eliminated except one -> that player wins immediately

---

## Color

**Players:** 2-8 | **Deck:** 108 Color cards

### Setup
- [ ] 7 cards dealt to each player
- [ ] First discard is always a number card (action/wild returned to draw)
- [ ] Active color set from initial discard

### Turn actions
- [ ] Play matching color or matching face
- [ ] Play Wild -> color picker opens -> choose new active color
- [ ] Play Wild Draw Four -> next player draws 4 + skips
- [ ] Play Draw Two -> next player draws 2 + skips
- [ ] Play Skip -> next player loses turn
- [ ] Play Reverse -> direction flips
- [ ] Reverse with 2 players -> acts as Skip
- [ ] Draw card -> turn ends immediately (no playing drawn card)

### Special rules
- [ ] Solo option: check it changes gameplay (if enabled)
- [ ] Cross-accumulation variant works correctly
- [ ] Draw pile empty -> reshuffle discard (keep top card)

### Win condition
- [ ] First player to empty hand wins
- [ ] Correct winner shown in banner

### Edge cases
- [ ] Wild color selection cancelled/dismissed -> cannot proceed without picking
- [ ] Direction indicator updates visually after Reverse
- [ ] Player disconnects during their turn -> turn passes correctly
- [ ] Multiple action cards chained (Skip -> Skip -> Skip) advance correctly

---

## Presidents

**Players:** 3-6 | **Deck:** 52 cards (no jokers)

### Setup & exchange
- [ ] Cards dealt evenly
- [ ] Q-heart holder leads first trick (first game only)
- [ ] Exchange phase: Asshole gives 2 best -> President
- [ ] Exchange phase: President gives 2 choice -> Asshole
- [ ] VP exchange (4+ players): Vice-Asshole gives 1 best -> VP
- [ ] VP exchange: VP gives 1 choice -> Vice-Asshole
- [ ] After exchange, Asshole leads first trick

### Trick mechanics
- [ ] Single beats single (higher value)
- [ ] Pair beats pair (higher value)
- [ ] Triple beats triple (higher value)
- [ ] Quad beats ANY non-quad combo regardless of value
- [ ] Must match combo type (pair on pair, etc.)
- [ ] Pass available when no legal play
- [ ] Playing a 2 ends trick immediately -> player leads next
- [ ] Square rule: 4 same-value across trick -> trick ends, last player leads
- [ ] Same-value chain: next player locked to match value or pass
- [ ] All-pass: leader gets one extra turn; passing that ends trick

### Card values
- [ ] 2 is highest (beats Ace)
- [ ] Order verified: 3 < 4 < ... < K < A < 2

### Finishing
- [ ] Empty hand -> done, cannot play further
- [ ] Finish order tracked: President, VP, Citizens, VA, Asshole
- [ ] Finishing on a 2 -> becomes Asshole regardless of order
- [ ] Scum penalties appended to end of finishOrder

### Edge cases
- [ ] Player disconnects during exchange -> exchange completes/skips correctly
- [ ] All other players pass -> leader gets extra turn
- [ ] Only one player with cards left -> they lead every trick
- [ ] Combo detection handles mixed ten-value pairs (K+Q as pair? No - different faces)

---

## Purple

**Players:** 2-8 | **Deck:** 52 cards (no jokers)

### Turn actions
- [ ] Bet Red -> next card red = gain 1 bet
- [ ] Bet Black -> next card black = gain 1 bet
- [ ] Bet Purple -> next two cards different colors = gain 2 bets
- [ ] Failed bet -> cards + playing bank go to penalty bank, bets reset to 0
- [ ] Stop available at 3+ bets -> banks penalties, clears banks, reshuffles deck, passes turn

### Other actions
- [ ] Decrease score available when not your turn (if enabled)
- [ ] Decrease reduces permanent score by 1 (min 0)

### Deck depletion
- [ ] Empty deck -> active player's penalties banked to score
- [ ] Other players' penalties returned to deck
- [ ] Deck refilled and reshuffled
- [ ] "End turn at deck end" setting respected

### Win condition
- [ ] Lowest permanent score wins
- [ ] Scores calculated including penalty banks

### Edge cases
- [ ] Penalty bank accumulation across failed bets
- [ ] Stop exactly at 3 bets vs higher counts
- [ ] Player disconnects mid-betting sequence
- [ ] Multiple consecutive failures keep player active
- [ ] Purple bet with 1 card left in deck -> handle gracefully

---

## Werewolf

**Players:** 4-16 | **Deck:** Werewolf role cards

### Setup
- [ ] Auto-composition assigns roles based on player count
- [ ] Each player taps to reveal secret role
- [ ] Everyone ready -> host starts night
- [ ] canStart blocks if composition invalid

### Night sequence (fixed order)
- [ ] Cupid picks lovers (first night only)
- [ ] Defender protects a player (not same as last night)
- [ ] Wolves vote on victim (majority)
- [ ] Witch saves or poisons (one each per game)
- [ ] Seer reveals one player's role
- [ ] Dead/non-existent roles skip automatically
- [ ] Timer expires -> phase auto-advances (NEXT_PHASE)
- [ ] Early completion: single input ends turn early (defender picks, seer peeks)

### Day
- [ ] Mayor election (first day, if enabled) - majority wins
- [ ] Mayor double vote in subsequent lynches
- [ ] Vote: every living player picks a target
- [ ] Tied vote + Scapegoat alive -> Scapegoat dies instead
- [ ] Tied vote + no Scapegoat -> nobody dies

### Reactive deaths
- [ ] Hunter killed -> shoots one player before dying
- [ ] Elder survives first wolf attack; if lynched -> all special powers lost
- [ ] Village Idiot: first lynch -> revealed, survives, loses voting rights
- [ ] Mayor killed -> picks successor before next phase
- [ ] Lovers: one dies -> other dies too (chain resolves)
- [ ] Death chaining: all reactions resolve before next phase

### Win conditions
- [ ] Villagers win: all wolves dead
- [ ] Wolves win: wolves >= non-wolves
- [ ] Lovers win: last two alive AND mixed-team (wolf + villager)

### Privacy
- [ ] Card hidden by default, flips up only during night action
- [ ] Hidden card masks role-derived UI (seer reveals, lover badge, defender ring)
- [ ] Day votes don't leak role info

### Edge cases
- [ ] Wolf disconnects during night vote -> remaining wolves continue
- [ ] Hunter disconnects while pending shot -> shot skipped
- [ ] Mayor disconnects while picking successor -> pause resolved
- [ ] All wolves die at once -> instant villager victory
- [ ]scheduleAction timer fires correctly for each night step
- [ ] onPlayerDisconnect during gameover phase -> noop

---

## Yams

**Players:** 2-6 | **Dice:** 5 x D6

### Turn flow
- [ ] First roll mandatory (all 5 dice)
- [ ] Hold/toggle individual dice between rolls
- [ ] Up to 3 rolls per turn (2 re-rolls after first)
- [ ] Score assignment locks a category
- [ ] Category used once -> cannot reuse
- [ ] Score of 0 valid (still locks category)
- [ ] Turn passes to next player after scoring

### Scoring - upper section
- [ ] Ones through Sixes: correct sums
- [ ] Upper bonus: +35 if upper total >= 63
- [ ] Bonus calculated at game end across all 6 upper categories

### Scoring - lower section
- [ ] Three of a Kind: sum of all dice (>= 3 same)
- [ ] Four of a Kind: sum of all dice (>= 4 same)
- [ ] Full House: 25 pts (exactly one pair + one triple, NOT five-of-a-kind)
- [ ] Small Straight: 30 pts (4 consecutive)
- [ ] Large Straight: 40 pts (5 consecutive, 1-5 or 2-6)
- [ ] Yams: 50 pts (all 5 same)
- [ ] Chance: sum of all dice (always valid)

### Win condition
- [ ] All 13 categories filled for all players -> game ends
- [ ] Highest grand total wins
- [ ] Tie in grand total -> check winner selection

### Edge cases
- [ ] Toggle Hold only valid after at least 1 roll and before last roll
- [ ] Live score preview shows hypothetical scores
- [ ] All categories except one filled -> final score forces last category
- [ ] Player disconnects mid-turn -> dice/held state resets, turn passes
- [ ] Five-of-a-kind does NOT qualify as Full House

---

## Blackjack

**Players:** 1-6 vs dealer | **Deck:** 4x52 shoe

### Deal
- [ ] 2 cards to each player + dealer
- [ ] Natural blackjack (Ace + ten-value) -> auto-stand
- [ ] Dealer natural blackjack -> straight to scoring
- [ ] All players have natural BJ -> skip to dealer turn

### Turn actions
- [ ] Hit: draw a card, bust if > 21
- [ ] Stand: keep hand, end turn
- [ ] Double: match bet, draw exactly 1 card, stand (first 2 cards only)
- [ ] Split: pair -> two independent hands, each draws a fresh card
- [ ] Split Aces: one card each, auto-stand
- [ ] Can only split once per round (primary hand only)
- [ ] After primary hand stands/busts with split -> play continues on split hand
- [ ] Double only offered when affordable (betting mode)
- [ ] Split only offered when affordable (betting mode)

### Dealer
- [ ] Draws automatically to 17+
- [ ] Dealer busts -> all surviving players win
- [ ] Soft 17: dealer stands (not hit)

### Betting mode
- [ ] Place bet before round, stake deducted up front
- [ ] Win pays 1:1
- [ ] Natural blackjack pays 3:2
- [ ] Push returns original bet
- [ ] Double adds matching bet
- [ ] Split adds matching bet for second hand
- [ ] Coins run out -> topped up to starting stack (buy-in counter increments)
- [ ] NEW_ROUND action: deals next round keeping coin balances
- [ ] END_GAME action: transitions to gameover
- [ ] Winner = player with most coins

### Non-betting mode
- [ ] Single round only
- [ ] No betting phase
- [ ] Winner = best non-bust hand beating dealer

### Scoring
- [ ] Player bust -> lose
- [ ] Player > dealer -> win
- [ ] Player = dealer -> push
- [ ] Player < dealer -> lose
- [ ] Split hand scored independently
- [ ] Natural BJ only counts on unsplit primary hand

### Edge cases
- [ ] Player disconnects mid-turn -> next playing player gets turn, or dealer resolves
- [ ] Player disconnects during betting -> dealing starts when all remaining have bet
- [ ] startingCoins option respects min/max bounds
- [ ] startingCoins disabled when betting off
- [ ] Insurance / even money: not implemented (verify absent)

---

## Bug tracking template

For each bug found:

```
### Bug: [short title]
- Game:
- Steps to reproduce:
- Expected:
- Actual:
- Fixed in commit:
- Regression test:
```

---

## Sign-off

- [ ] All 8 games tested with 4+ players (minimum 5 rounds each)
- [ ] Zero known blocking bugs
- [ ] Full `npm test` suite passes after fixes
