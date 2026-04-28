import type { GameStateGeneric } from '$lib/core/types'
import type { GameDefinition } from '$lib/engine'
import { fight } from './fight'
import { war } from './war'

export const games = { war, fight } as unknown as Record<string, GameDefinition<GameStateGeneric>>

export const gameList: { id: string; minPlayers: number; maxPlayers: number }[] = Object.values(
	games as Record<string, GameDefinition<GameStateGeneric>>
).map((g) => ({
	id: g.id,
	minPlayers: g.minPlayers,
	maxPlayers: g.maxPlayers
}))

export const gameRules: Record<string, { en: string; fr: string }> = {
	war: {
		en: `2 players · 52 cards

• Deal 26 cards each, face down.
• Each turn: both players reveal their top card.
• Higher card takes both cards (added to won pile).
• On a tie: both cards are discarded.
• Game ends when any deck runs out.
• Player with the most cards wins.

Card values: 2–10 face value · J=11 · Q=12 · K=13 · A=14`,
		fr: `2 joueurs · 52 cartes

• Distribuer 26 cartes à chaque joueur, face cachée.
• À chaque tour : les deux joueurs révèlent leur carte du dessus.
• La plus haute carte remporte les deux (pile de gains).
• Égalité : les deux cartes sont défaussées.
• La partie se termine quand un deck est vide.
• Le joueur avec le plus de cartes gagne.

Valeurs : 2–10 valeur nominale · V=11 · D=12 · R=13 · A=14`
	},
	fight: {
		en: `3–6 players · 52 cards

Setup: deal 3 cards each. The 2 highest (vertical) = HP. The lowest (horizontal) = Shield. Redraw if sum ≤ 15.

On your turn, flip the top draw card, then choose one action:
• Attack: if drawn value > target's Shield → they lose (drawn − shield) HP.
• Change Shield: replace any shield (yours or another player's) with the drawn card.
• Charge: store the card face down. On your next attack, it adds to the drawn value.

Special rules:
• Charge is discarded if you take HP damage.
• Kill (reduce someone to 0 HP) → bonus action immediately.
• With exactly 1 HP: you may peek at the top draw card before acting.
• When the draw pile runs out: reshuffle discard, then each player is attacked by the deck.

Last player standing wins.

Card values: A=1 · 2–10 face value · J=11 · Q=12 · K=13`,
		fr: `3–6 joueurs · 52 cartes

Mise en place : distribuer 3 cartes à chaque joueur. Les 2 plus hautes (verticales) = PV. La plus basse (horizontale) = Bouclier. Reprendre si la somme ≤ 15.

À ton tour, retourne la carte du dessus de la pioche, puis choisis une action :
• Attaque : si la valeur > bouclier de la cible → elle perd (valeur − bouclier) PV.
• Changer le bouclier : remplace n'importe quel bouclier (le tien ou celui d'un autre) avec la carte piochée.
• Charge : pose la carte face cachée devant toi. Elle s'ajoute à ta prochaine attaque.

Règles spéciales :
• La charge est défaussée si tu subis des dégâts.
• Meurtre (réduire quelqu'un à 0 PV) → action bonus immédiate.
• Avec exactement 1 PV : tu peux regarder la carte du dessus avant d'agir.
• Quand la pioche est vide : mélanger la défausse, puis chaque joueur est attaqué par le deck.

Le dernier survivant gagne.

Valeurs : A=1 · 2–10 valeur nominale · V=11 · D=12 · R=13`
	}
}
