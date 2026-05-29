import type { WerewolfState } from '$lib/games/werewolf/werewolf'
import { werewolf } from '$lib/games/werewolf/werewolf'
import { makePlayers, nameFor } from './players'

export { makePlayers, nameFor }

/**
 * Build a Werewolf state already past the ready-gate and into the first night.
 * Reuses the real engine so sandbox behaviour matches production exactly.
 */
export function createSandboxState(
	count: number,
	options: Record<string, unknown> = { autoCompose: true }
): WerewolfState {
	const ids = makePlayers(count).map((p) => p.id)
	let state = werewolf.setup(ids, options)
	for (const id of ids) state = werewolf.applyAction(state, { type: 'PLAYER_READY', playerId: id })
	return state
}
