import type { LobbyPlayer } from '$lib/network/messages'

const NAMES = [
	'Alice',
	'Bob',
	'Chloé',
	'David',
	'Emma',
	'Félix',
	'Gaia',
	'Hugo',
	'Inès',
	'Jules',
	'Kira',
	'Léo',
	'Maya',
	'Noah',
	'Olia',
	'Paul'
]

export function makePlayers(count: number): LobbyPlayer[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `p${i + 1}`,
		name: NAMES[i] ?? `P${i + 1}`
	}))
}

export function nameFor(id: string): string {
	const i = Number(id.replace(/^p/, '')) - 1
	return NAMES[i] ?? id
}
