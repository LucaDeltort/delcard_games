import type { Locale } from '$lib/i18n'

export type Faq = { q: string; a: string }
type GameContent = { about: string; tips: string[]; faq: Faq[] }

/** Indexable copy for /games/[id]: what the game is, tips, game-specific FAQ */
export const gameContent: Record<string, Record<Locale, GameContent>> = {
	war: {
		en: {
			about:
				'War is the simplest card game there is: no choices, just luck and suspense. Each player flips their top card and the higher one wins the pair. On Delcard it is a quick two-player duel, perfect to warm up before a longer game.',
			tips: [
				'Rounds are fast: play best of three to make it a real match.',
				'Ties discard both cards, so a game can swing in the last few flips.',
				'Aces are the highest card (14), twos the lowest.'
			],
			faq: [
				{
					q: 'How many players can play War?',
					a: 'War on Delcard is a two-player game, one deck of 52 cards split evenly.'
				},
				{
					q: 'What happens on a tie in War?',
					a: 'Both cards are discarded and nobody scores them. The game goes on with the next flip.'
				}
			]
		},
		fr: {
			about:
				'La Bataille est le jeu de cartes le plus simple qui soit : aucun choix, seulement de la chance et du suspense. Chaque joueur retourne sa carte du dessus et la plus forte remporte le pli. Sur Delcard, c’est un duel rapide à deux, idéal pour s’échauffer avant une partie plus longue.',
			tips: [
				'Les manches sont rapides : jouez en deux manches gagnantes pour un vrai match.',
				'Une égalité défausse les deux cartes, la partie peut basculer dans les derniers tours.',
				'L’As est la carte la plus forte (14), le 2 la plus faible.'
			],
			faq: [
				{
					q: 'À combien joue-t-on à la Bataille ?',
					a: 'Sur Delcard, la Bataille se joue à deux, avec un jeu de 52 cartes partagé en deux.'
				},
				{
					q: 'Que se passe-t-il en cas d’égalité ?',
					a: 'Les deux cartes sont défaussées et personne ne les gagne. La partie continue au tour suivant.'
				}
			]
		}
	},
	fight: {
		en: {
			about:
				'The Fight is a 3 to 6 player battle with a standard deck. Your cards are your health and your shield: each turn you draw a card and decide whether to attack someone, swap a shield, or charge up a stronger hit. Last player standing wins.',
			tips: [
				'A high card is often better spent on a shield than on an attack.',
				'Charging is risky: any HP damage discards your stored card.',
				'Finishing a player gives you a bonus action, so pick off weak opponents.'
			],
			faq: [
				{
					q: 'How does damage work in The Fight?',
					a: 'If the drawn card is higher than the target’s shield, they lose the difference in HP. Otherwise the attack does nothing.'
				},
				{
					q: 'Can I change another player’s shield?',
					a: 'Yes. Replacing an opponent’s shield with a low card is a great way to set up an attack.'
				}
			]
		},
		fr: {
			about:
				'La Bagarre est un combat de 3 à 6 joueurs avec un jeu classique. Vos cartes sont vos points de vie et votre bouclier : à chaque tour, vous piochez une carte et choisissez d’attaquer, de changer un bouclier ou de charger un coup plus fort. Le dernier survivant gagne.',
			tips: [
				'Une carte forte est souvent plus utile en bouclier qu’en attaque.',
				'Charger est risqué : le moindre dégât défausse votre carte en réserve.',
				'Éliminer un joueur donne une action bonus, achevez les adversaires affaiblis.'
			],
			faq: [
				{
					q: 'Comment fonctionnent les dégâts ?',
					a: 'Si la carte piochée dépasse le bouclier de la cible, elle perd la différence en points de vie. Sinon, l’attaque ne fait rien.'
				},
				{
					q: 'Peut-on changer le bouclier d’un autre joueur ?',
					a: 'Oui. Remplacer le bouclier d’un adversaire par une carte faible prépare parfaitement une attaque.'
				}
			]
		}
	},
	color: {
		en: {
			about:
				'Color is a fast shedding game for 2 to 8 players: match the color or number of the top card and be the first to empty your hand. Skip, Reverse, Draw Two and Wild cards keep every round unpredictable.',
			tips: [
				'Keep your Wild cards for when you have no other move.',
				'Change the color to the one you hold the most of.',
				'Save Draw Two and Wild Draw Four for the player about to win.'
			],
			faq: [
				{ q: 'How many players can play Color?', a: 'From 2 to 8 players, with a 108-card deck.' },
				{
					q: 'What does Reverse do with two players?',
					a: 'With two players, Reverse acts like a Skip: you play again.'
				}
			]
		},
		fr: {
			about:
				'Color est un jeu de défausse rapide de 2 à 8 joueurs : posez une carte de la même couleur ou du même chiffre et soyez le premier à vider votre main. Les cartes Passe, Inversion, +2 et Joker rendent chaque manche imprévisible.',
			tips: [
				'Gardez vos Jokers pour quand vous n’avez plus d’autre coup.',
				'Choisissez la couleur que vous avez le plus en main.',
				'Réservez les +2 et +4 au joueur sur le point de gagner.'
			],
			faq: [
				{
					q: 'À combien joue-t-on à Color ?',
					a: 'De 2 à 8 joueurs, avec un paquet de 108 cartes.'
				},
				{
					q: 'Que fait l’Inversion à deux joueurs ?',
					a: 'À deux, l’Inversion fonctionne comme une carte Passe : vous rejouez.'
				}
			]
		}
	},
	presidents: {
		en: {
			about:
				'Presidents is a classic climbing card game for 3 to 6 players. Play singles, pairs, triples or quads that beat the previous play and get rid of your cards first to become President. The last player becomes the Asshole and must give up their best cards next round.',
			tips: [
				'Twos are the strongest cards and end the trick: keep one to take the lead.',
				'Never finish on a 2, it makes you Asshole whatever your rank.',
				'Playing the same value as the previous play locks the next player.'
			],
			faq: [
				{
					q: 'What is the card order in Presidents?',
					a: 'From low to high: 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2.'
				},
				{
					q: 'How does the card exchange work?',
					a: 'From the second game, the President takes the Asshole’s 2 best cards and gives back 2 cards of their choice. With 4+ players, the Vice-President and Vice-Asshole swap one card.'
				}
			]
		},
		fr: {
			about:
				'Le Président est un grand classique des jeux de cartes, de 3 à 6 joueurs. Posez des cartes seules, des paires, des brelans ou des carrés plus forts que le coup précédent et videz votre main le premier pour devenir Président. Le dernier devient Trouduc et doit céder ses meilleures cartes à la manche suivante.',
			tips: [
				'Le 2 est la carte la plus forte et ferme le pli : gardez-en un pour reprendre la main.',
				'Ne finissez jamais sur un 2, vous seriez Trouduc quel que soit votre rang.',
				'Rejouer la même valeur que le coup précédent bloque le joueur suivant.'
			],
			faq: [
				{
					q: 'Quel est l’ordre des cartes au Président ?',
					a: 'De la plus faible à la plus forte : 3, 4, 5, 6, 7, 8, 9, 10, V, D, R, As, 2.'
				},
				{
					q: 'Comment fonctionne l’échange de cartes ?',
					a: 'À partir de la deuxième partie, le Président prend les 2 meilleures cartes du Trouduc et lui en rend 2 de son choix. À 4 joueurs ou plus, le Vice-Président et le Vice-Trouduc échangent une carte.'
				}
			]
		}
	},
	purple: {
		en: {
			about:
				'Purple is a push-your-luck betting game for 2 to 8 players. Bet on the color of the next card, or bet Purple for two cards of different colors. Each win grows your bank, one wrong guess sends it to your penalties. Know when to stop.',
			tips: [
				'Purple counts as two wins but is harder to hit than a single color.',
				'You can only stop after 3 wins: decide early how far you want to go.',
				'A long winning streak means a bigger penalty if you miss.'
			],
			faq: [
				{
					q: 'How do you win at Purple?',
					a: 'The game ends when someone reaches the score limit. The player with the lowest score wins.'
				},
				{
					q: 'What happens when I lose a bet?',
					a: 'Your current playing bank moves to your penalty bank and your win count resets, but you keep betting.'
				}
			]
		},
		fr: {
			about:
				'Purple est un jeu de pari où il faut savoir s’arrêter, de 2 à 8 joueurs. Pariez sur la couleur de la prochaine carte, ou sur Purple pour deux cartes de couleurs différentes. Chaque réussite fait grossir votre banque, une erreur l’envoie dans vos pénalités.',
			tips: [
				'Purple compte pour deux réussites mais il est plus difficile à réussir qu’une couleur.',
				'Vous ne pouvez vous arrêter qu’après 3 réussites : fixez-vous une limite.',
				'Une longue série signifie une pénalité plus lourde en cas d’erreur.'
			],
			faq: [
				{
					q: 'Comment gagne-t-on à Purple ?',
					a: 'La partie s’arrête quand un joueur atteint la limite de score. Le joueur avec le score le plus bas gagne.'
				},
				{
					q: 'Que se passe-t-il quand je perds un pari ?',
					a: 'Votre banque de jeu passe dans votre banque de pénalités et votre compteur repart à zéro, mais vous continuez à parier.'
				}
			]
		}
	},
	werewolf: {
		en: {
			about:
				'Werewolf is a social deduction game for 4 to 16 players. Roles are dealt secretly: werewolves pick a victim each night, villagers must find and vote them out by day, and the Seer can inspect one player each night. Delcard handles roles and votes so nobody needs to be the narrator.',
			tips: [
				'As a villager, watch who defends whom during the day vote.',
				'As the Seer, don’t reveal yourself too early: wolves will target you.',
				'Play on a voice call so the day discussion feels like a real table.'
			],
			faq: [
				{
					q: 'How many players do you need for Werewolf?',
					a: 'At least 4 players, up to 16. The Seer role is added from 5 players.'
				},
				{
					q: 'Do we need a narrator?',
					a: 'No. The host’s device runs the game: it deals roles, collects night votes and counts the day vote.'
				}
			]
		},
		fr: {
			about:
				'Le Loup-Garou est un jeu de déduction de 4 à 16 joueurs. Les rôles sont distribués en secret : les loups choisissent une victime chaque nuit, les villageois doivent les démasquer et les éliminer le jour, et la Voyante peut sonder un joueur chaque nuit. Delcard gère les rôles et les votes, inutile d’avoir un meneur.',
			tips: [
				'En villageois, observez qui défend qui pendant le vote du jour.',
				'En Voyante, ne vous dévoilez pas trop tôt : les loups vous viseront.',
				'Jouez en appel vocal pour que les débats du jour soient vivants.'
			],
			faq: [
				{
					q: 'Combien de joueurs faut-il pour le Loup-Garou ?',
					a: 'Au moins 4 joueurs, jusqu’à 16. La Voyante est ajoutée à partir de 5 joueurs.'
				},
				{
					q: 'Faut-il un meneur de jeu ?',
					a: 'Non. L’appareil de l’hôte gère la partie : il distribue les rôles, recueille les votes de la nuit et compte le vote du jour.'
				}
			]
		}
	},
	yams: {
		en: {
			about:
				'Yams is the classic five-dice game: roll up to three times per turn, keep the dice you like and fill one of 13 scoring categories. Aim for straights, full houses and the famous Yams (five of a kind) to post the highest score.',
			tips: [
				'Go for 63+ in the upper section: the 35-point bonus often decides the game.',
				'Keep Chance as a safety net for a bad turn.',
				'Scratching a category with 0 is sometimes the best move.'
			],
			faq: [
				{
					q: 'How many points is a Yams worth?',
					a: 'A Yams (all five dice the same) scores 50 points. A large straight scores 40, a small straight 30 and a full house 25.'
				},
				{
					q: 'How do you get the upper section bonus?',
					a: 'Reach 63 points or more in Ones to Sixes to earn a 35-point bonus.'
				}
			]
		},
		fr: {
			about:
				'Le Yams est le grand classique des jeux de dés : lancez jusqu’à trois fois par tour, gardez les dés qui vous plaisent et remplissez l’une des 13 cases de la feuille de score. Visez les suites, les fulls et le fameux Yams (cinq dés identiques) pour faire le meilleur score.',
			tips: [
				'Visez 63 points ou plus en partie haute : le bonus de 35 points fait souvent la différence.',
				'Gardez la Chance comme joker pour un mauvais tour.',
				'Barrer une case à 0 est parfois le meilleur choix.'
			],
			faq: [
				{
					q: 'Combien rapporte un Yams ?',
					a: 'Un Yams (cinq dés identiques) rapporte 50 points. Une grande suite vaut 40, une petite suite 30 et un full 25.'
				},
				{
					q: 'Comment obtenir le bonus de la partie haute ?',
					a: 'Atteignez 63 points ou plus sur les cases As à Six pour gagner 35 points de bonus.'
				}
			]
		}
	},
	blackjack: {
		en: {
			about:
				'Blackjack is the casino classic, played against an automatic dealer with up to 6 friends. Get closer to 21 than the dealer without going over, with hit, stand, double and split. Optional coin betting adds the 3:2 natural blackjack payout, with no real money involved.',
			tips: [
				'Always split Aces and eights.',
				'Double on 11 when the dealer shows a low card.',
				'The dealer draws until 17: a dealer showing 4 to 6 busts often.'
			],
			faq: [
				{
					q: 'Is it real-money Blackjack?',
					a: 'No. Betting is optional and uses virtual coins only. Running out of coins tops you back up.'
				},
				{
					q: 'When does the dealer stop drawing?',
					a: 'The dealer draws automatically until reaching 17 or more.'
				}
			]
		},
		fr: {
			about:
				'Le Blackjack est le classique des casinos, joué contre un croupier automatique avec jusqu’à 6 amis. Approchez-vous de 21 plus que le croupier sans le dépasser, en tirant, restant, doublant ou séparant. Les mises en jetons sont optionnelles, avec le paiement 3:2 du blackjack naturel, sans argent réel.',
			tips: [
				'Séparez toujours les As et les 8.',
				'Doublez sur 11 quand le croupier montre une carte faible.',
				'Le croupier tire jusqu’à 17 : avec un 4, 5 ou 6 visible, il saute souvent.'
			],
			faq: [
				{
					q: 'Joue-t-on de l’argent réel ?',
					a: 'Non. Les mises sont optionnelles et en jetons virtuels uniquement. À court de jetons, votre pile est rechargée.'
				},
				{
					q: 'Quand le croupier arrête-t-il de tirer ?',
					a: 'Le croupier tire automatiquement jusqu’à atteindre 17 ou plus.'
				}
			]
		}
	}
}

/** Platform questions shown on every game page */
export function commonFaq(lang: Locale, name: string): Faq[] {
	return lang === 'fr'
		? [
				{
					q: `${name} sur Delcard est-il gratuit ?`,
					a: 'Oui, entièrement gratuit, sans publicité, sans inscription et sans téléchargement.'
				},
				{
					q: 'Comment jouer avec mes amis ?',
					a: 'Créez une partie, partagez le code ou le lien, et vos amis rejoignent depuis leur navigateur, sur ordinateur ou mobile.'
				}
			]
		: [
				{
					q: `Is ${name} on Delcard free?`,
					a: 'Yes, completely free, with no ads, no sign-up and no download.'
				},
				{
					q: 'How do I play with my friends?',
					a: 'Create a game, share the code or link, and your friends join from their browser on desktop or mobile.'
				}
			]
}
