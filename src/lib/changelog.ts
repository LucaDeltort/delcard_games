type ReleaseItem = { fr: string; en: string }
type ReleaseNote = { version: string; date: string; items: ReleaseItem[] }

const changelog: ReleaseNote[] = [
	{
		version: '1.0.0',
		date: '2026-09-03',
		items: [
			{
				fr: 'Version 1.0 : 8 jeux de cartes jouables directement dans le navigateur, sans compte ni serveur',
				en: 'Version 1.0: 8 card games playable right in your browser, no account, no server'
			},
			{
				fr: 'Chat en partie : discutez sans quitter le jeu',
				en: 'In-game chat: talk without leaving the game'
			},
			{
				fr: 'Minuteur par tour configurable (15s, 30s ou 60s)',
				en: 'Configurable per-turn timer (15s, 30s or 60s)'
			},
			{
				fr: 'Statistiques locales par jeu et par pseudo, avec graphiques',
				en: 'Local per-game and per-nickname statistics with charts'
			},
			{
				fr: 'Reconnexion après rafraîchissement et migration automatique en cas de départ de l’hôte',
				en: 'Reconnect after refresh and automatic host migration when the host leaves'
			},
			{
				fr: 'Accessibilité clavier complète et cibles tactiles agrandies sur mobile',
				en: 'Full keyboard accessibility and larger touch targets on mobile'
			}
		]
	},
	{
		version: '0.10',
		date: '2026-07-15',
		items: [
			{
				fr: 'Effets sonores : cartes, dés et ambiance',
				en: 'Sound effects: cards, dice and ambience'
			},
			{
				fr: 'Voix narrative pour le Loup-Garou',
				en: 'Narrator voice for Werewolf'
			},
			{
				fr: 'Migration hôte plus robuste (reconnexion spectateurs)',
				en: 'More robust host migration (spectator reconnect)'
			}
		]
	},
	{
		version: '0.9',
		date: '2026-07-01',
		items: [
			{ fr: 'Nouveau jeu : Blackjack', en: 'New game: Blackjack' },
			{
				fr: 'Blackjack : split de main et système de mises',
				en: 'Blackjack: hand split and buy-in betting'
			},
			{
				fr: 'Blackjack : carte cachée, donne casino, annonces BJ',
				en: 'Blackjack: hole card, casino deal order, BJ announcements'
			},
			{
				fr: 'Blackjack : correction du classement final par jetons',
				en: 'Blackjack: fix final winner ranking by coins'
			},
			{
				fr: "La partie survit au départ de l'hôte (migration automatique)",
				en: 'Game survives host departure (automatic migration)'
			}
		]
	},
	{
		version: '0.8',
		date: '2026-06-02',
		items: [
			{
				fr: 'Yams : refonte visuelle thème casino ambré',
				en: 'Yams: amber casino-den visual redesign'
			},
			{
				fr: 'Purple, Présidents, Color : refonte visuelle neon et dorée',
				en: 'Purple, Presidents, Color: neon and gilded visual redesigns'
			},
			{
				fr: 'Disposition arc des joueurs sur desktop (Color, La Bagarre, Présidents)',
				en: 'Arc player layout on desktop (Color, The Fight, Presidents)'
			},
			{
				fr: 'Visionneuse de cartes avec tooltips de rôle et modal',
				en: 'Deck viewer with role tooltips and modal'
			},
			{
				fr: 'Correction des animations de dés en multijoueur',
				en: 'Fixed dice roll animations in multiplayer'
			}
		]
	},
	{
		version: '0.7',
		date: '2026-06-01',
		items: [
			{
				fr: 'War : refonte visuelle thème champ de bataille',
				en: 'War: battlefield visual redesign'
			},
			{
				fr: 'La Bagarre : refonte visuelle thème arène sombre',
				en: 'The Fight: dark arena visual redesign'
			}
		]
	},
	{
		version: '0.6',
		date: '2026-06-01',
		items: [
			{ fr: "Refonte de la page d'accueil", en: 'Home page redesign' },
			{ fr: 'Refonte de la page Rejoindre', en: 'Join page redesign' },
			{ fr: 'Refonte du salon de jeu', en: 'Lobby redesign' },
			{
				fr: 'Accessibilité : focus clavier et labels localisés',
				en: 'Accessibility: keyboard focus and localized labels'
			}
		]
	},
	{
		version: '0.5',
		date: '2026-06-01',
		items: [
			{
				fr: 'Meilleurs aperçus lors du partage de liens',
				en: 'Better link previews when sharing'
			},
			{
				fr: 'Sitemap et robots.txt pour une meilleure découvrabilité',
				en: 'Sitemap and robots.txt for better discoverability'
			}
		]
	},
	{
		version: '0.4',
		date: '2026-05-29',
		items: [
			{ fr: 'Nouveau jeu : Loup-Garou', en: 'New game: Werewolf' },
			{ fr: 'Visualiseur de dés avec pack Delcard', en: 'Dice viewer with Delcard pack' },
			{ fr: "Refonte de la page d'accueil et du Laboratoire", en: 'Home page and Lab redesign' }
		]
	},
	{
		version: '0.3',
		date: '2026-05-23',
		items: [
			{ fr: "Notes de mise à jour accessibles dans l'app", en: 'In-app release notes viewer' },
			{ fr: 'Color : nouvelle règle Solo', en: 'Color: new Solo rule' },
			{ fr: 'Color : variante accumulation croisée', en: 'Color: cross-accumulation rule variant' }
		]
	},
	{
		version: '0.2',
		date: '2026-05-20',
		items: [
			{ fr: 'Nouveau jeu : Purple', en: 'New game: Purple' },
			{
				fr: 'Les spectateurs peuvent rejoindre les parties en cours',
				en: 'Spectators can now join ongoing games'
			},
			{
				fr: 'Bannières animées de résultats dans les jeux',
				en: 'Animated result banners in games'
			},
			{
				fr: 'Cartes optimisées pour un chargement plus rapide',
				en: 'Optimized card assets for faster loading'
			},
			{
				fr: 'Corrections de bugs (revanche, banque de pénalités)',
				en: 'Bug fixes (rematch, penalty bank)'
			}
		]
	},
	{
		version: '0.1',
		date: '2026-05-18',
		items: [
			{ fr: 'Nouveau jeu : Présidents', en: 'New game: Presidents' },
			{
				fr: 'La Bagarre : animation des cartes adverses et préchargement',
				en: 'The Fight: opponent card animation and preloading'
			},
			{ fr: 'Corrections de bugs', en: 'Bug fixes' }
		]
	},
	{
		version: '0.0.6',
		date: '2026-05-16',
		items: [
			{
				fr: 'Color : animation de jeu adverse et indicateur de sens',
				en: 'Color: opponent card animation and direction indicator'
			},
			{ fr: 'La Bagarre : simplification des pouvoirs', en: 'The Fight: simplified power roster' },
			{ fr: 'Préchargement des images de cartes', en: 'Card image preloading' }
		]
	},
	{
		version: '0.0.5',
		date: '2026-05-16',
		items: [
			{ fr: 'Color : animations de pioche et de jeu', en: 'Color: draw and play animations' },
			{ fr: 'Options de partie sauvegardées localement', en: 'Game options saved locally' },
			{ fr: 'Version affichée dans les paramètres', en: 'App version shown in settings' }
		]
	},
	{
		version: '0.0.4',
		date: '2026-05-15',
		items: [
			{ fr: 'Nouveau jeu : Color (avec règles maison)', en: 'New game: Color (with house rules)' },
			{ fr: "Refonte de l'accessibilité", en: 'Accessibility overhaul' },
			{ fr: 'Réseau P2P renforcé sur mobile', en: 'Hardened P2P connection on mobile' },
			{ fr: 'Jeu de cartes Joseon ajouté', en: 'Joseon card pack added' }
		]
	},
	{
		version: '0.0.3',
		date: '2026-05-11',
		items: [
			{ fr: 'Visualiseur de jeux de cartes', en: 'Card deck viewer' },
			{
				fr: 'Support TURN Cloudflare (iOS Private Relay)',
				en: 'Cloudflare TURN support (iOS Private Relay)'
			},
			{ fr: 'Liens de feedback dans les paramètres', en: 'Feedback links in settings' }
		]
	},
	{
		version: '0.0.2',
		date: '2026-05-06',
		items: [
			{
				fr: 'Application installable (PWA) avec support mobile',
				en: 'Installable app (PWA) with mobile support'
			},
			{
				fr: 'Thème Cyberwave avec carrousel de sélection de deck',
				en: 'Cyberwave deck theme with pack carousel'
			},
			{
				fr: 'Langue et format horaire dans les paramètres',
				en: 'Language and time format in settings'
			},
			{
				fr: 'Réseau : reconnexion, indicateur de qualité, gestion des déconnexions',
				en: 'Network: reconnection, quality indicator, disconnect handling'
			},
			{ fr: 'Bouton de revanche', en: 'Rematch button' }
		]
	}
]

export function getLatestNote(): ReleaseNote {
	return changelog[0]
}

export function getChangelog(): ReleaseNote[] {
	return changelog
}
