<script lang="ts">
import { get } from 'svelte/store'
import { browser } from '$app/environment'
import { goto } from '$app/navigation'
import logo from '$lib/assets/logo.svg'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
import { Button } from '$lib/components/ui/button'
import { Input } from '$lib/components/ui/input'
import { gameList } from '$lib/games/index'
import { t } from '$lib/i18n'
import { GameHost } from '$lib/network/host'
import { activeHost } from '$lib/stores/session'

let selectedGame = $state(gameList[0].id)
let playerName = $state(browser ? (localStorage.getItem('playerName') ?? '') : '')
let creating = $state(false)
let error = $state('')

async function createGame() {
	if (!playerName.trim()) {
		error = get(t)('common.errorNickname')
		return
	}
	if (!browser) return

	const def = (await import('$lib/games/index')).games[selectedGame]
	creating = true
	error = ''

	const trimmedName = playerName.trim()
	localStorage.setItem('playerName', trimmedName)

	const host = new GameHost(def, trimmedName)
	await new Promise<void>((resolve) => {
		host.onReady = resolve
	})

	activeHost.set(host)
	goto(`/game/${host.code}?role=host&game=${selectedGame}&name=${encodeURIComponent(trimmedName)}`)
}
</script>

<main class="flex flex-1 flex-col items-center justify-center gap-16 px-4 pb-14 pt-4">
	<header class="text-center">
		<img src={logo} alt="Delcard" class="mx-auto h-28 w-28 sm:h-32 sm:w-32" />
		<h1 class="mt-3 text-6xl tracking-wide text-foreground sm:text-7xl">DELCARD</h1>
		<p class="mt-2 text-muted-foreground">{$t('home.subtitle')}</p>
	</header>

	<div class="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
		<!-- New game -->
		<div class="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
			<h2 class="text-2xl text-foreground">{$t('home.newGame')}</h2>

			<div class="flex flex-col gap-2">
				<span class="text-xs tracking-widest text-muted-foreground uppercase"
					>{$t('home.labelGame')}</span
				>
				<div class="flex flex-col gap-2">
					{#each gameList as game}
						<label
							class="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors {selectedGame ===
							game.id
								? 'border-primary bg-primary/10 text-foreground'
								: 'border-border text-muted-foreground hover:border-border/60'}"
						>
							<input
								type="radio"
								name="game"
								value={game.id}
								bind:group={selectedGame}
								class="hidden"
							/>
							<span class="flex-1 font-medium">{$t(`${game.id}.name`)}</span>
							<span class="text-xs"
								>{game.minPlayers === game.maxPlayers
									? game.minPlayers
									: `${game.minPlayers}–${game.maxPlayers}`}
								{$t('common.players')}</span
							>
							<RulesDrawer gameId={game.id} />
						</label>
					{/each}
				</div>
			</div>

			<div class="flex flex-col gap-2">
				<span class="text-xs tracking-widest text-muted-foreground uppercase"
					>{$t('common.nickname')}</span
				>
				<Input
					bind:value={playerName}
					placeholder={$t('common.nicknamePlaceholder')}
					onkeydown={(e) => e.key === 'Enter' && createGame()}
				/>
			</div>

			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}

			<Button onclick={createGame} disabled={creating} class="mt-auto w-full">
				{creating ? $t('home.creating') : $t('home.create')}
			</Button>
		</div>

		<!-- Join -->
		<div
			class="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-6"
		>
			<div class="text-center">
				<h2 class="text-2xl text-foreground">{$t('home.joinTitle')}</h2>
				<p class="mt-2 text-sm text-muted-foreground">{$t('home.joinDesc')}</p>
			</div>
			<Button href="/join" variant="outline" class="w-full">{$t('home.joinBtn')}</Button>
		</div>
	</div>
</main>
