type ReleaseItem = { fr: string; en: string }
type ReleaseNote = { version: string; date: string; items: ReleaseItem[] }

const changelog: ReleaseNote[] = [
	{
		version: '0.3.0',
		date: '2026-05-23',
		items: [
			{ fr: "Notes de mise à jour accessibles dans l'app", en: 'In-app release notes viewer' },
			{ fr: 'Color : nouvelle règle Solo', en: 'Color: new Solo rule' },
			{ fr: 'Color : variante accumulation croisée', en: 'Color: cross-accumulation rule variant' }
		]
	},
	{
		version: '0.2.0',
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
		version: '0.1.0',
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
