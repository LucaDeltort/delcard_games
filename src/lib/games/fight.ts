import type { Card, GameStateGeneric } from '$lib/core/types'
import type { GameDefinition } from '$lib/engine'
import { createShuffledDeck, createZone, shuffle } from '$lib/engine'

const CARD_VALUES: Record<string, number> = {
	A: 1,
	'2': 2,
	'3': 3,
	'4': 4,
	'5': 5,
	'6': 6,
	'7': 7,
	'8': 8,
	'9': 9,
	'10': 10,
	J: 11,
	Q: 12,
	K: 13
}

function cv(face: string): number {
	return CARD_VALUES[face] ?? 0
}

export type HistoryEntry =
	| { type: 'CHARGE'; actorId: string; chargedCard: Card }
	| {
			type: 'ATTACK'
			actorId: string
			targetId: string
			damage: number
			attackCard: Card
			chargeCard: Card | null
	  }
	| {
			type: 'CHANGE_SHIELD'
			actorId: string
			targetId: string
			oldShield: Card | null
			newShield: Card
	  }
	| { type: 'ELIMINATED'; targetId: string; killedBy: string | null }
	| { type: 'DRAGON' }

export type FightState = GameStateGeneric & {
	phase: 'playing' | 'gameover'
	activePlayers: string[]
	hp: Record<string, number>
	// null = normal turn; string = that player has a bonus action to play
	pendingBonusAction: string | null
	history: HistoryEntry[]
	// 3 cards per player sorted low→high (index 0 = shield, 1+2 = HP) — display only
	setupCards: Record<string, Card[]>
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function nextActivePid(activePlayers: string[], currentId: string): string {
	const idx = activePlayers.indexOf(currentId)
	// idx === -1 (eliminated) falls through to index 0, which is fine
	return activePlayers[(idx + 1) % activePlayers.length]
}

function pushDiscard(state: FightState, cards: Card[]): FightState {
	return {
		...state,
		zones: {
			...state.zones,
			discard: { ...state.zones.discard, cards: [...state.zones.discard.cards, ...cards] }
		}
	}
}

function reshuffleDiscard(state: FightState): FightState {
	return {
		...state,
		zones: {
			...state.zones,
			draw: { ...state.zones.draw, cards: shuffle(state.zones.discard.cards) },
			discard: { ...state.zones.discard, cards: [] }
		}
	}
}

/** Removes top card from draw, reshuffling discard first if needed. */
function popDraw(state: FightState): [FightState, Card] {
	const s = state.zones.draw.cards.length === 0 ? reshuffleDiscard(state) : state
	const [card, ...rest] = s.zones.draw.cards
	return [{ ...s, zones: { ...s.zones, draw: { ...s.zones.draw, cards: rest } } }, card]
}

/**
 * Removes the player from activePlayers, moves their remaining cards to discard,
 * and optionally grants killedBy a bonus action (no chain: only if none pending).
 */
function eliminatePlayer(state: FightState, pid: string, killedBy: string | null): FightState {
	const shieldZone = state.zones[`shield_${pid}`]
	let s: FightState = {
		...state,
		activePlayers: state.activePlayers.filter((p) => p !== pid),
		zones: {
			...state.zones,
			[`shield_${pid}`]: { ...shieldZone, cards: [] }
		}
	}
	s = pushDiscard(s, shieldZone.cards)

	if (s.activePlayers.length <= 1) return { ...s, phase: 'gameover' }

	if (killedBy !== null && s.pendingBonusAction === null) {
		s = { ...s, pendingBonusAction: killedBy }
	}
	return s
}

/**
 * Reduces pid's HP by damage. If they had a charge, it is discarded.
 * killedBy = null means no bonus action is granted on elimination (dragon attacks).
 */
function dealDamage(
	state: FightState,
	pid: string,
	damage: number,
	killedBy: string | null
): FightState {
	const newHp = Math.max(0, state.hp[pid] - damage)
	let s: FightState = { ...state, hp: { ...state.hp, [pid]: newHp } }

	// Charge is lost whenever the player takes HP damage
	const chargeZone = s.zones[`charge_${pid}`]
	if (chargeZone.cards.length > 0) {
		s = {
			...s,
			zones: { ...s.zones, [`charge_${pid}`]: { ...chargeZone, cards: [] } }
		}
		s = pushDiscard(s, chargeZone.cards)
	}

	if (newHp <= 0) s = eliminatePlayer(s, pid, killedBy)
	return s
}

/**
 * Reshuffle and attack each active player in order starting after currentPlayer.
 * Dragon kills do not grant bonus actions.
 */
function dragonAwakening(state: FightState, currentPlayer: string): FightState {
	let s = reshuffleDiscard(state)

	const startIdx = (s.activePlayers.indexOf(currentPlayer) + 1) % s.activePlayers.length
	const ordered = [...s.activePlayers.slice(startIdx), ...s.activePlayers.slice(0, startIdx)]

	for (const pid of ordered) {
		if (s.phase === 'gameover') return s
		if (!s.activePlayers.includes(pid)) continue

		let card: Card
		;[s, card] = popDraw(s)
		s = pushDiscard(s, [card])

		const shieldVal = cv(s.zones[`shield_${pid}`].cards[0]?.face ?? '0')
		const damage = Math.max(0, cv(card.face) - shieldVal)
		if (damage > 0) s = dealDamage(s, pid, damage, null)
	}
	return s
}

// ─── game definition ─────────────────────────────────────────────────────────

export const fight: GameDefinition<FightState> = {
	id: 'fight',
	name: 'The Fight',
	deckType: 'standard',
	minPlayers: 3,
	maxPlayers: 6,

	setup(players) {
		let drawCards = createShuffledDeck()
		let discardCards: Card[] = []

		const hands: Record<string, Card[]> = {}
		const hp: Record<string, number> = {}

		for (const pid of players) {
			let valid = false
			let attempts = 0
			while (!valid && attempts < 200) {
				attempts++
				if (drawCards.length < 3) {
					drawCards = [...shuffle(discardCards), ...drawCards]
					discardCards = []
				}
				const hand = drawCards.splice(0, 3)
				const sum = hand.reduce((total, c) => total + cv(c.face), 0)
				if (sum > 15) {
					hands[pid] = hand
					valid = true
				} else {
					discardCards.push(...hand)
				}
			}
			// Safety fallback: take whatever is available
			if (!hands[pid]) hands[pid] = drawCards.splice(0, 3)
		}

		const zones: FightState['zones'] = {}
		const setupCards: Record<string, Card[]> = {}
		for (const pid of players) {
			const hand = [...hands[pid]].sort((a, b) => cv(a.face) - cv(b.face))
			hp[pid] = cv(hand[1].face) + cv(hand[2].face)
			zones[`shield_${pid}`] = createZone(`shield_${pid}`, 'public', [hand[0]], pid)
			zones[`charge_${pid}`] = createZone(`charge_${pid}`, 'hidden', [], pid)
			setupCards[pid] = hand
		}

		// Setup rejects go back into the draw pile
		zones['draw'] = createZone('draw', 'hidden', shuffle([...drawCards, ...discardCards]))
		zones['discard'] = createZone('discard', 'public', [])

		// Starting player: lowest total (hp + shield), tiebreak lowest shield, tiebreak random
		const shuffledOrder = shuffle([...players])
		const startPlayer = shuffledOrder.reduce((best, pid) => {
			const totalPid = hp[pid] + cv(zones[`shield_${pid}`].cards[0].face)
			const totalBest = hp[best] + cv(zones[`shield_${best}`].cards[0].face)
			if (totalPid < totalBest) return pid
			if (totalPid > totalBest) return best
			const shieldPid = cv(zones[`shield_${pid}`].cards[0].face)
			const shieldBest = cv(zones[`shield_${best}`].cards[0].face)
			return shieldPid < shieldBest ? pid : best
		})

		return {
			players,
			zones,
			turnPlayerId: startPlayer,
			phase: 'playing',
			activeGameId: 'fight',
			activePlayers: [...players],
			hp,
			pendingBonusAction: null,
			history: [],
			setupCards
		}
	},

	getValidActions(state, playerId) {
		if (state.phase !== 'playing') return []
		const activePid = state.pendingBonusAction ?? state.turnPlayerId
		if (activePid !== playerId || !state.activePlayers.includes(playerId)) return []

		const actions = []

		// CHARGE only if no existing charge
		if (state.zones[`charge_${playerId}`].cards.length === 0) {
			actions.push({ type: 'CHARGE', playerId })
		}

		for (const targetId of state.activePlayers) {
			if (targetId !== playerId) {
				actions.push({ type: 'ATTACK', playerId, payload: { targetId } })
			}
			// CHANGE_SHIELD can target self or others
			actions.push({ type: 'CHANGE_SHIELD', playerId, payload: { targetId } })
		}

		return actions
	},

	applyAction(state, action) {
		const actingPid = state.pendingBonusAction ?? state.turnPlayerId
		if (action.playerId !== actingPid) return state

		const wasBonusTurn = state.pendingBonusAction !== null

		// Draw a card (triggers reshuffle + tracks if draw was empty)
		const needsDragon = state.zones.draw.cards.length === 0
		let s: FightState
		let drawnCard: Card
		;[s, drawnCard] = popDraw(state)
		// Also flag if draw became empty after the draw
		const drawnEmptied = !needsDragon && s.zones.draw.cards.length === 0

		const newEntries: HistoryEntry[] = []

		if (action.type === 'ATTACK') {
			const { targetId } = action.payload as { targetId: string }
			let attackValue = cv(drawnCard.face)

			// Charge must be used when attacking
			const chargeZone = s.zones[`charge_${actingPid}`]
			let chargeCard: Card | null = null
			if (chargeZone.cards.length > 0) {
				chargeCard = { ...chargeZone.cards[0], isHidden: false }
				attackValue += cv(chargeZone.cards[0].face)
				s = {
					...s,
					zones: { ...s.zones, [`charge_${actingPid}`]: { ...chargeZone, cards: [] } }
				}
				s = pushDiscard(s, chargeZone.cards)
			}
			s = pushDiscard(s, [drawnCard])

			const shieldVal = cv(s.zones[`shield_${targetId}`].cards[0]?.face ?? '0')
			const damage = Math.max(0, attackValue - shieldVal)
			if (damage > 0) s = dealDamage(s, targetId, damage, actingPid)

			newEntries.push({
				type: 'ATTACK',
				actorId: actingPid,
				targetId,
				damage,
				attackCard: drawnCard,
				chargeCard
			})
			for (const pid of state.activePlayers) {
				if (!s.activePlayers.includes(pid)) {
					newEntries.push({ type: 'ELIMINATED', targetId: pid, killedBy: actingPid })
				}
			}
		} else if (action.type === 'CHANGE_SHIELD') {
			const { targetId } = action.payload as { targetId: string }
			const shieldZone = s.zones[`shield_${targetId}`]
			const oldShield = shieldZone.cards[0] ?? null
			s = pushDiscard(s, shieldZone.cards)
			s = {
				...s,
				zones: { ...s.zones, [`shield_${targetId}`]: { ...shieldZone, cards: [drawnCard] } }
			}

			newEntries.push({
				type: 'CHANGE_SHIELD',
				actorId: actingPid,
				targetId,
				oldShield,
				newShield: drawnCard
			})
		} else if (action.type === 'CHARGE') {
			s = {
				...s,
				zones: {
					...s.zones,
					[`charge_${actingPid}`]: {
						...s.zones[`charge_${actingPid}`],
						cards: [{ ...drawnCard, isHidden: true }]
					}
				}
			}

			newEntries.push({
				type: 'CHARGE',
				actorId: actingPid,
				chargedCard: { ...drawnCard, isHidden: true }
			})
		}

		// Dragon awakening: triggers when draw pile ran dry (before or after this draw)
		if ((needsDragon || drawnEmptied) && s.phase === 'playing') {
			const activeBeforeDragon = [...s.activePlayers]
			s = dragonAwakening(s, actingPid)
			newEntries.push({ type: 'DRAGON' })
			for (const pid of activeBeforeDragon) {
				if (!s.activePlayers.includes(pid)) {
					newEntries.push({ type: 'ELIMINATED', targetId: pid, killedBy: null })
				}
			}
		}

		s = { ...s, history: [...state.history, ...newEntries] }

		if (s.phase === 'gameover') return s

		// Turn advancement
		if (wasBonusTurn) {
			// Bonus action resolved → advance normally
			s = {
				...s,
				pendingBonusAction: null,
				turnPlayerId: nextActivePid(s.activePlayers, actingPid)
			}
		} else if (s.pendingBonusAction !== null) {
			// Normal action triggered a kill → actingPid gets bonus, don't advance yet
		} else {
			s = { ...s, turnPlayerId: nextActivePid(s.activePlayers, actingPid) }
		}

		return s
	},

	onPlayerDisconnect(state, playerId) {
		if (!state.activePlayers.includes(playerId)) {
			return { ...state, players: state.players.filter((p) => p !== playerId) }
		}
		let s = eliminatePlayer(state, playerId, null)
		s = { ...s, players: s.players.filter((p) => p !== playerId) }
		if (s.phase === 'gameover') return s
		if (state.turnPlayerId === playerId || state.pendingBonusAction === playerId) {
			s = {
				...s,
				turnPlayerId: nextActivePid(s.activePlayers, playerId),
				pendingBonusAction: null
			}
		}
		return s
	},

	isOver(state) {
		return state.phase === 'gameover'
	},

	getWinner(state) {
		if (state.phase !== 'gameover') return null
		return state.activePlayers[0] ?? null
	}
}
