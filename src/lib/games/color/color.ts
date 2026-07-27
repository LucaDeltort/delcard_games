import type { Card, GameStateGeneric } from '$lib/core/types'
import type { GameDefinition, OptionSchema } from '$lib/engine'
import { createDeck, createZone, deal, moveCard, shuffle } from '$lib/engine'

export type CardColor = 'red' | 'yellow' | 'green' | 'blue'

export type ColorOptions = {
	accumulation: boolean
	crossAccumulation: boolean
	solo: boolean
	cut: boolean
	playAfterDraw: boolean
	drawUntilPlay: boolean
	playAfterPenalty: boolean
	challengePlusFour: boolean
	noWildFinish: boolean
}

const DEFAULT_COLOR_OPTIONS: ColorOptions = {
	accumulation: false,
	crossAccumulation: false,
	solo: false,
	cut: false,
	playAfterDraw: false,
	drawUntilPlay: false,
	playAfterPenalty: false,
	challengePlusFour: false,
	noWildFinish: false
}

function parseOptions(raw?: Record<string, unknown>): ColorOptions {
	if (!raw) return { ...DEFAULT_COLOR_OPTIONS }
	return {
		accumulation: raw.accumulation === true,
		crossAccumulation: raw.crossAccumulation === true,
		solo: raw.solo === true,
		cut: raw.cut === true,
		playAfterDraw: raw.playAfterDraw === true,
		drawUntilPlay: raw.drawUntilPlay === true,
		playAfterPenalty: raw.playAfterPenalty === true,
		challengePlusFour: raw.challengePlusFour === true,
		noWildFinish: raw.noWildFinish === true
	}
}

type ColorState = GameStateGeneric & {
	phase: 'playing' | 'gameover'
	direction: 1 | -1
	currentColor: CardColor
	options: ColorOptions
	pendingDraw: number
	pendingDrawType: 'two' | 'four' | null
	drewCardId: string | null
	penaltyTurn: boolean
	lastSkippedPlayer: string | null
	pendingChallenge: { by: string; hadBluff: boolean } | null
	soloAlert: { playerId: string; x: number; y: number } | null
}

const NUMBER_FACES = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])

function nextInDir(players: string[], current: string, direction: 1 | -1): string {
	const idx = players.indexOf(current)
	return players[(((idx + direction) % players.length) + players.length) % players.length]
}

function canPlay(card: Card, topDiscard: Card, currentColor: CardColor): boolean {
	if (card.face === 'Wild' || card.face === 'WildDrawFour') return true
	return card.suit === currentColor || card.face === topDiscard.face
}

function isWildCard(card: Card): boolean {
	return card.face === 'Wild' || card.face === 'WildDrawFour'
}

function reshuffleDiscard(zones: ColorState['zones']): ColorState['zones'] {
	const discard = zones['discard']
	if (discard.cards.length <= 1) return zones
	const top = discard.cards[discard.cards.length - 1]
	const reshuffled = shuffle(discard.cards.slice(0, -1))
	return {
		...zones,
		discard: { ...discard, cards: [top] },
		draw: { ...zones['draw'], cards: [...reshuffled, ...zones['draw'].cards] }
	}
}

function drawCards(
	zones: ColorState['zones'],
	playerId: string,
	count: number
): ColorState['zones'] {
	let z = zones
	for (let i = 0; i < count; i++) {
		if (z['draw'].cards.length === 0) z = reshuffleDiscard(z)
		if (z['draw'].cards.length === 0) break
		z = moveCard(z, 'draw', `hand_${playerId}`, z['draw'].cards[0].id)
	}
	return z
}

function firstPlayableInHand(
	zones: ColorState['zones'],
	playerId: string,
	top: Card,
	currentColor: CardColor
): string | null {
	const hand = zones[`hand_${playerId}`]
	return hand?.cards.find((c) => canPlay(c, top, currentColor))?.id ?? null
}

export const colorOptionsSchema: OptionSchema[] = [
	{
		key: 'accumulation',
		type: 'boolean',
		default: false,
		label: 'color.options.accumulation',
		description: 'color.options.accumulationDesc'
	},
	{
		key: 'crossAccumulation',
		type: 'boolean',
		default: false,
		label: 'color.options.crossAccumulation',
		description: 'color.options.crossAccumulationDesc',
		disabledIf: 'accumulation'
	},
	{
		key: 'solo',
		type: 'boolean',
		default: false,
		label: 'color.options.solo',
		description: 'color.options.soloDesc'
	},
	{
		key: 'cut',
		type: 'boolean',
		default: false,
		label: 'color.options.cut',
		description: 'color.options.cutDesc'
	},
	{
		key: 'playAfterDraw',
		type: 'boolean',
		default: false,
		label: 'color.options.playAfterDraw',
		description: 'color.options.playAfterDrawDesc'
	},
	{
		key: 'drawUntilPlay',
		type: 'boolean',
		default: false,
		label: 'color.options.drawUntilPlay',
		description: 'color.options.drawUntilPlayDesc'
	},
	{
		key: 'playAfterPenalty',
		type: 'boolean',
		default: false,
		label: 'color.options.playAfterPenalty',
		description: 'color.options.playAfterPenaltyDesc'
	},
	{
		key: 'challengePlusFour',
		type: 'boolean',
		default: false,
		label: 'color.options.challengePlusFour',
		description: 'color.options.challengePlusFourDesc'
	},
	{
		key: 'noWildFinish',
		type: 'boolean',
		default: false,
		label: 'color.options.noWildFinish',
		description: 'color.options.noWildFinishDesc'
	}
]

export const color: GameDefinition<ColorState> = {
	id: 'color',
	name: 'Color',
	deckType: 'ColorDeck',
	minPlayers: 2,
	maxPlayers: 8,
	optionsSchema: colorOptionsSchema,

	setup(players, rawOptions) {
		const options = parseOptions(rawOptions)
		const { hands, remaining } = deal(createDeck('ColorDeck'), 7, players.length)

		const zones: ColorState['zones'] = {}
		players.forEach((pid, i) => {
			zones[`hand_${pid}`] = createZone(`hand_${pid}`, 'hidden', hands[i], pid)
		})

		let drawPile = [...remaining]
		let discardCard: Card | null = null
		for (let i = 0; i < drawPile.length; i++) {
			if (NUMBER_FACES.has(drawPile[i].face)) {
				discardCard = drawPile[i]
				drawPile = [...drawPile.slice(0, i), ...drawPile.slice(i + 1)]
				break
			}
		}
		if (!discardCard) {
			discardCard = drawPile[0]
			drawPile = drawPile.slice(1)
		}

		zones['discard'] = createZone('discard', 'public', [discardCard])
		zones['draw'] = createZone('draw', 'hidden', drawPile)

		return {
			players,
			zones,
			turnPlayerId: players[0],
			phase: 'playing',
			activeGameId: 'color',
			direction: 1,
			currentColor: (discardCard.suit as CardColor) ?? 'red',
			options,
			pendingDraw: 0,
			pendingDrawType: null,
			drewCardId: null,
			penaltyTurn: false,
			lastSkippedPlayer: null,
			pendingChallenge: null,
			soloAlert: null
		}
	},

	getValidActions(state, playerId) {
		if (state.phase !== 'playing') return []
		const { options } = state

		// Solo alert: anyone can press their button in addition to normal actions
		const soloActions: ReturnType<typeof this.getValidActions> = []
		if (options.solo && state.soloAlert) {
			if (state.soloAlert.playerId === playerId) {
				soloActions.push({ type: 'CALL_SOLO', playerId })
			} else {
				soloActions.push({ type: 'COUNTER_SOLO', playerId })
			}
		}

		// Challenge pending: only challenge target can act
		if (state.pendingChallenge) {
			if (playerId !== state.turnPlayerId) return [...soloActions]
			return [
				{ type: 'ACCEPT_PENALTY', playerId },
				{ type: 'CHALLENGE_DRAW_FOUR', playerId },
				...soloActions
			]
		}

		// drew a card: can play it (and optionally end turn unless drawUntilPlay)
		if (state.drewCardId !== null && state.turnPlayerId === playerId) {
			const hand = state.zones[`hand_${playerId}`]
			const top = state.zones['discard'].cards[state.zones['discard'].cards.length - 1]
			const drewCard = hand?.cards.find((c) => c.id === state.drewCardId)
			if (drewCard && canPlay(drewCard, top, state.currentColor)) {
				const play = { type: 'PLAY_CARD', playerId, payload: { cardId: state.drewCardId } }
				if (options.drawUntilPlay) return [play, ...soloActions]
				return [play, { type: 'END_TURN', playerId }, ...soloActions]
			}
			return [{ type: 'END_TURN', playerId }, ...soloActions]
		}

		// after penalty draw: can play any card or end turn
		if (state.penaltyTurn && state.turnPlayerId === playerId) {
			const hand = state.zones[`hand_${playerId}`]
			const top = state.zones['discard'].cards[state.zones['discard'].cards.length - 1]
			if (!top) return [{ type: 'END_TURN', playerId }, ...soloActions]
			const playable = hand.cards
				.filter((c) => {
					if (!canPlay(c, top, state.currentColor)) return false
					if (options.noWildFinish && isWildCard(c) && hand.cards.length === 1) return false
					return true
				})
				.map((c) => ({ type: 'PLAY_CARD', playerId, payload: { cardId: c.id } }))
			return [...playable, { type: 'END_TURN', playerId }, ...soloActions]
		}

		// Cut: out-of-turn play for non-turn players
		if (
			options.cut &&
			playerId !== state.turnPlayerId &&
			playerId !== state.lastSkippedPlayer &&
			state.pendingDraw === 0 &&
			state.drewCardId === null &&
			!state.penaltyTurn
		) {
			const hand = state.zones[`hand_${playerId}`]
			const top = state.zones['discard'].cards[state.zones['discard'].cards.length - 1]
			if (top) {
				const cutCards = hand?.cards.filter((c) => c.face === top.face && c.suit === top.suit) ?? []
				if (cutCards.length > 0) {
					return [
						...cutCards.map((c) => ({ type: 'PLAY_CARD', playerId, payload: { cardId: c.id } })),
						...soloActions
					]
				}
			}
			return [...soloActions]
		}

		if (state.turnPlayerId !== playerId) return [...soloActions]

		const hand = state.zones[`hand_${playerId}`]
		const top = state.zones['discard'].cards[state.zones['discard'].cards.length - 1]
		if (!top) return [...soloActions]

		// accumulation pending: only draw or stack matching type
		if (state.pendingDraw > 0) {
			const stackableFace = state.pendingDrawType === 'two' ? 'DrawTwo' : 'WildDrawFour'
			let stackableCards = hand.cards.filter((c) => c.face === stackableFace)
			if (options.crossAccumulation && options.accumulation) {
				if (state.pendingDrawType === 'two') {
					stackableCards = [
						...stackableCards,
						...hand.cards.filter((c) => c.face === 'WildDrawFour')
					]
				} else {
					stackableCards = [
						...stackableCards,
						...hand.cards.filter((c) => c.face === 'DrawTwo' && c.suit === state.currentColor)
					]
				}
			}
			const stackable = stackableCards.map((c) => ({
				type: 'PLAY_CARD',
				playerId,
				payload: { cardId: c.id }
			}))
			return [...stackable, { type: 'DRAW_CARD', playerId }, ...soloActions]
		}

		// normal turn
		const playable = hand.cards
			.filter((c) => {
				if (!canPlay(c, top, state.currentColor)) return false
				if (options.noWildFinish && isWildCard(c) && hand.cards.length === 1) return false
				return true
			})
			.map((c) => ({ type: 'PLAY_CARD', playerId, payload: { cardId: c.id } }))

		return [...playable, { type: 'DRAW_CARD', playerId }, ...soloActions]
	},

	applyAction(state, action) {
		const { options } = state

		// CALL_SOLO: 1-card player saves themselves
		if (action.type === 'CALL_SOLO') {
			if (!state.soloAlert || state.soloAlert.playerId !== action.playerId) return state
			return { ...state, soloAlert: null }
		}

		// COUNTER_SOLO: another player penalizes the 1-card player
		if (action.type === 'COUNTER_SOLO') {
			if (!state.soloAlert || state.soloAlert.playerId === action.playerId) return state
			const zones = drawCards(state.zones, state.soloAlert.playerId, 2)
			return { ...state, zones, soloAlert: null }
		}

		// ACCEPT_PENALTY: challenge target accepts +4
		if (action.type === 'ACCEPT_PENALTY') {
			if (!state.pendingChallenge) return state
			const zones = drawCards(state.zones, action.playerId, 4)
			const nextTurn = nextInDir(state.players, action.playerId, state.direction)
			if (options.playAfterPenalty) {
				const top = zones['discard'].cards[zones['discard'].cards.length - 1]
				const playableId = firstPlayableInHand(zones, action.playerId, top, state.currentColor)
				if (playableId) {
					return {
						...state,
						zones,
						pendingChallenge: null,
						turnPlayerId: action.playerId,
						penaltyTurn: true,
						lastSkippedPlayer: null
					}
				}
			}
			return {
				...state,
				zones,
				pendingChallenge: null,
				turnPlayerId: nextTurn,
				lastSkippedPlayer: action.playerId
			}
		}

		// CHALLENGE_DRAW_FOUR
		if (action.type === 'CHALLENGE_DRAW_FOUR') {
			if (!state.pendingChallenge) return state
			const { by, hadBluff } = state.pendingChallenge
			let zones = state.zones
			let nextTurn: string
			let newLastSkipped: string | null = null
			if (hadBluff) {
				zones = drawCards(zones, by, 4)
				nextTurn = action.playerId
			} else {
				zones = drawCards(zones, action.playerId, 6)
				nextTurn = nextInDir(state.players, action.playerId, state.direction)
				newLastSkipped = action.playerId
			}
			return {
				...state,
				zones,
				pendingChallenge: null,
				turnPlayerId: nextTurn,
				lastSkippedPlayer: newLastSkipped
			}
		}

		// END_TURN
		if (action.type === 'END_TURN') {
			if (state.drewCardId === null && !state.penaltyTurn) return state
			return {
				...state,
				drewCardId: null,
				penaltyTurn: false,
				turnPlayerId: nextInDir(state.players, action.playerId, state.direction),
				lastSkippedPlayer: null
			}
		}

		// DRAW_CARD
		if (action.type === 'DRAW_CARD') {
			let zones = state.zones

			// Accumulated penalty draw
			if (state.pendingDraw > 0) {
				zones = drawCards(zones, action.playerId, state.pendingDraw)
				if (options.playAfterPenalty) {
					const top = zones['discard'].cards[zones['discard'].cards.length - 1]
					const playableId = firstPlayableInHand(zones, action.playerId, top, state.currentColor)
					if (playableId) {
						return {
							...state,
							zones,
							pendingDraw: 0,
							pendingDrawType: null,
							turnPlayerId: action.playerId,
							penaltyTurn: true,
							lastSkippedPlayer: null
						}
					}
				}
				const nextTurn = nextInDir(state.players, action.playerId, state.direction)
				return {
					...state,
					zones,
					pendingDraw: 0,
					pendingDrawType: null,
					turnPlayerId: nextTurn,
					lastSkippedPlayer: action.playerId
				}
			}

			const top = state.zones['discard'].cards[state.zones['discard'].cards.length - 1]

			// drawUntilPlay: keep drawing until a playable card is found
			if (options.drawUntilPlay) {
				let lastDrawnId: string | null = null
				while (true) {
					if (zones['draw'].cards.length === 0) zones = reshuffleDiscard(zones)
					if (zones['draw'].cards.length === 0) break
					const card = zones['draw'].cards[0]
					zones = moveCard(zones, 'draw', `hand_${action.playerId}`, card.id)
					lastDrawnId = card.id
					if (canPlay(card, top, state.currentColor)) break
				}
				if (lastDrawnId) {
					return { ...state, zones, drewCardId: lastDrawnId, lastSkippedPlayer: null }
				}
				return {
					...state,
					zones,
					turnPlayerId: nextInDir(state.players, action.playerId, state.direction),
					lastSkippedPlayer: null
				}
			}

			// Normal: draw 1
			if (zones['draw'].cards.length === 0) zones = reshuffleDiscard(zones)
			if (zones['draw'].cards.length === 0) return state
			const drawnCard = zones['draw'].cards[0]
			zones = moveCard(zones, 'draw', `hand_${action.playerId}`, drawnCard.id)

			if (options.playAfterDraw && canPlay(drawnCard, top, state.currentColor)) {
				return { ...state, zones, drewCardId: drawnCard.id, lastSkippedPlayer: null }
			}
			return {
				...state,
				zones,
				turnPlayerId: nextInDir(state.players, action.playerId, state.direction),
				lastSkippedPlayer: null
			}
		}

		if (action.type !== 'PLAY_CARD') return state

		const { cardId, chosenColor } = (action.payload ?? {}) as {
			cardId?: string
			chosenColor?: CardColor
		}
		if (!cardId) return state

		const hand = state.zones[`hand_${action.playerId}`]
		const card = hand?.cards.find((c) => c.id === cardId)
		if (!card) return state

		const top = state.zones['discard'].cards[state.zones['discard'].cards.length - 1]
		const isCut = options.cut && action.playerId !== state.turnPlayerId

		if (isCut) {
			// Cut validation: exact same face + suit, not the skipped player
			if (card.face !== top.face || card.suit !== top.suit) return state
			if (action.playerId === state.lastSkippedPlayer) return state
		} else if (state.pendingDraw > 0) {
			// Accumulation: allow same type, or cross type if crossAccumulation + color matches
			const stackableFace = state.pendingDrawType === 'two' ? 'DrawTwo' : 'WildDrawFour'
			const isCrossAllowed =
				options.crossAccumulation &&
				options.accumulation &&
				((state.pendingDrawType === 'two' && card.face === 'WildDrawFour') ||
					(state.pendingDrawType === 'four' &&
						card.face === 'DrawTwo' &&
						card.suit === state.currentColor))
			if (card.face !== stackableFace && !isCrossAllowed) return state
		} else if (!state.penaltyTurn) {
			if (!canPlay(card, top, state.currentColor)) return state
		} else {
			// penaltyTurn: normal canPlay check
			if (!canPlay(card, top, state.currentColor)) return state
		}

		// Wild requires chosenColor
		const wild = isWildCard(card)
		if (wild && !chosenColor) return state

		// noWildFinish: can't play Wild as last card (unless penaltyTurn — already drew)
		if (options.noWildFinish && wild && hand.cards.length === 1 && !state.penaltyTurn) return state

		let zones = moveCard(state.zones, `hand_${action.playerId}`, 'discard', cardId)
		const newColor: CardColor = wild ? chosenColor! : (card.suit as CardColor)
		let direction = state.direction
		let nextTurn: string
		let newLastSkipped: string | null = null
		let newPendingDraw = 0
		let newPendingDrawType: 'two' | 'four' | null = null
		let newPendingChallenge: ColorState['pendingChallenge'] = null
		let newPenaltyTurn = false

		if (card.face === 'Reverse') {
			direction = (direction * -1) as 1 | -1
			if (state.players.length === 2) {
				nextTurn = nextInDir(state.players, action.playerId, direction)
				nextTurn = nextInDir(state.players, nextTurn, direction)
			} else {
				nextTurn = nextInDir(state.players, action.playerId, direction)
			}
		} else if (card.face === 'Skip') {
			const skipped = nextInDir(state.players, action.playerId, direction)
			nextTurn = nextInDir(state.players, skipped, direction)
			newLastSkipped = skipped
		} else if (card.face === 'DrawTwo') {
			const target = nextInDir(state.players, action.playerId, direction)
			if (options.accumulation) {
				newPendingDraw = state.pendingDraw + 2
				newPendingDrawType = 'two'
				nextTurn = target
			} else {
				zones = drawCards(zones, target, 2)
				if (options.playAfterPenalty) {
					const top2 = zones['discard'].cards[zones['discard'].cards.length - 1]
					const playableId = firstPlayableInHand(zones, target, top2, newColor)
					if (playableId) {
						nextTurn = target
						newPenaltyTurn = true
					} else {
						nextTurn = nextInDir(state.players, target, direction)
						newLastSkipped = target
					}
				} else {
					nextTurn = nextInDir(state.players, target, direction)
					newLastSkipped = target
				}
			}
		} else if (card.face === 'WildDrawFour') {
			const target = nextInDir(state.players, action.playerId, direction)
			if (options.challengePlusFour) {
				// Before card moved, check if player had any other valid play
				// Hand already has WDF removed (moveCard above). Check remaining.
				const hadBluff = zones[`hand_${action.playerId}`].cards.some((c) =>
					canPlay(c, top, state.currentColor)
				)
				newPendingChallenge = { by: action.playerId, hadBluff }
				nextTurn = target
			} else if (options.accumulation) {
				newPendingDraw = state.pendingDraw + 4
				newPendingDrawType = 'four'
				nextTurn = target
			} else {
				zones = drawCards(zones, target, 4)
				if (options.playAfterPenalty) {
					const top2 = zones['discard'].cards[zones['discard'].cards.length - 1]
					const playableId = firstPlayableInHand(zones, target, top2, newColor)
					if (playableId) {
						nextTurn = target
						newPenaltyTurn = true
					} else {
						nextTurn = nextInDir(state.players, target, direction)
						newLastSkipped = target
					}
				} else {
					nextTurn = nextInDir(state.players, target, direction)
					newLastSkipped = target
				}
			}
		} else {
			nextTurn = nextInDir(state.players, action.playerId, direction)
		}

		// After a cut, override nextTurn to advance from cutter's position
		if (isCut) {
			nextTurn = nextInDir(state.players, action.playerId, direction)
		}

		const handAfter = zones[`hand_${action.playerId}`].cards.length
		const handEmpty = handAfter === 0

		let newSoloAlert = state.soloAlert
		if (options.solo) {
			if (handAfter === 1) {
				newSoloAlert = {
					playerId: action.playerId,
					x: 0.1 + Math.random() * 0.8,
					y: 0.1 + Math.random() * 0.75
				}
			} else if (handEmpty) {
				newSoloAlert = null
			}
		}

		return {
			...state,
			zones,
			direction,
			currentColor: newColor,
			turnPlayerId: handEmpty ? action.playerId : nextTurn,
			phase: handEmpty ? 'gameover' : 'playing',
			pendingDraw: newPendingDraw,
			pendingDrawType: newPendingDrawType,
			drewCardId: null,
			penaltyTurn: newPenaltyTurn,
			lastSkippedPlayer: newLastSkipped,
			pendingChallenge: newPendingChallenge,
			soloAlert: newSoloAlert
		}
	},

	onPlayerDisconnect(state, playerId) {
		const players = state.players.filter((p) => p !== playerId)
		if (players.length < 2) return { ...state, players, phase: 'gameover' }

		// Find the player after the disconnected one in the original seating order
		let nextTurn = state.turnPlayerId
		if (state.turnPlayerId === playerId) {
			const oldIdx = state.players.indexOf(playerId)
			for (let i = 1; i <= state.players.length; i++) {
				const candidate = state.players[(oldIdx + i * state.direction + state.players.length) % state.players.length]
				if (players.includes(candidate)) {
					nextTurn = candidate
					break
				}
			}
		}

		// Remove orphan hand zone
		const zones = { ...state.zones }
		delete zones[`hand_${playerId}`]

		return {
			...state,
			players,
			zones,
			turnPlayerId: nextTurn,
			pendingDraw: 0,
			pendingDrawType: null,
			drewCardId: null,
			penaltyTurn: false,
			pendingChallenge: null,
			lastSkippedPlayer: state.lastSkippedPlayer === playerId ? null : state.lastSkippedPlayer
		}
	},

	isOver(state) {
		return state.phase === 'gameover'
	},

	getWinner(state) {
		if (state.phase !== 'gameover') return null
		const winner = state.players.find((p) => state.zones[`hand_${p}`]?.cards.length === 0)
		return winner ?? null
	}
}
