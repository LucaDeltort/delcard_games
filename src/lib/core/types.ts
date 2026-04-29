export type DeckType = 'FrenchDeckWithJoker' | 'FrenchDeckWithoutJoker'

export interface Card {
	id: string
	face: string // e.g. 'A', 'K', '7', 'Joker'
	suit?: string // e.g. 'spades', 'hearts' — undefined for suitless cards
	isHidden: boolean // when true, only the owning player sees the face
}

export interface GameZone {
	id: string // e.g. 'hand_p1', 'draw', 'discard'
	type: 'hidden' | 'public' | 'fan' // display hint for the UI layer
	cards: Card[]
	ownerId?: string // set when the zone belongs to a specific player
}

export interface GameStateGeneric {
	players: string[] // player IDs, in seat order
	zones: Record<string, GameZone>
	turnPlayerId: string
	phase: string // game-specific phase string, e.g. 'playing', 'scoring'
	activeGameId: string // matches GameDefinition.id
}
