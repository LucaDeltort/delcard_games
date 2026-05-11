<script lang="ts">
import { ArrowRight } from 'lucide-svelte'
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

<main class="flex flex-1 flex-col items-center justify-center gap-8 px-4 pb-14 pt-4">
    <header class="text-center">
        <img src={logo} alt="Delcard" class="mx-auto h-28 w-28 sm:h-32 sm:w-32" />
        <h1 class="mt-3 text-6xl tracking-wide text-foreground sm:text-7xl">DELCARD</h1>
        <p class="mt-2 text-muted-foreground">{$t("home.subtitle")}</p>
    </header>

    <div class="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        <!-- New game -->
        <div class="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
            <h2 class="text-2xl text-foreground">{$t("home.newGame")}</h2>

            <div class="flex flex-col gap-2">
                <span class="text-xs tracking-widest text-muted-foreground uppercase">{$t("home.labelGame")}</span>
                <div class="flex flex-col gap-2">
                    {#each gameList as game}
                        <label
                            class="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors {selectedGame ===
                            game.id
                                ? 'border-primary bg-primary/10 text-foreground'
                                : 'border-border text-muted-foreground hover:border-border/60'}"
                        >
                            <input type="radio" name="game" value={game.id} bind:group={selectedGame} class="hidden" />
                            <span class="flex-1 font-medium">{$t(`${game.id}.name`)}</span>
                            <span class="text-xs"
                                >{game.minPlayers === game.maxPlayers
                                    ? game.minPlayers
                                    : `${game.minPlayers}–${game.maxPlayers}`}
                                {$t("common.players")}</span
                            >
                            <RulesDrawer gameId={game.id} />
                        </label>
                    {/each}
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-xs tracking-widest text-muted-foreground uppercase">{$t("common.nickname")}</span>
                <Input
                    bind:value={playerName}
                    placeholder={$t("common.nicknamePlaceholder")}
                    onkeydown={(e) => e.key === "Enter" && createGame()}
                />
            </div>

            {#if error}
                <p class="text-sm text-destructive">{error}</p>
            {/if}

            <Button onclick={createGame} disabled={creating} class="mt-auto w-full">
                {creating ? $t("home.creating") : $t("home.create")}
            </Button>
        </div>

        <!-- Join -->
        <div class="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-6">
            <div class="text-center">
                <h2 class="text-2xl text-foreground">{$t("home.joinTitle")}</h2>
                <p class="mt-2 text-sm text-muted-foreground">{$t("home.joinDesc")}</p>
            </div>
            <Button href="/join" variant="outline" class="w-full">{$t("home.joinBtn")}</Button>
        </div>
    </div>

    <a
        href="/decks"
        class="group relative w-full max-w-2xl overflow-hidden rounded-2xl bg-blue px-8 py-5 transition-all hover:brightness-110"
    >
        <div class="relative z-10 flex max-w-[55%] flex-col gap-4">
            <h2 class="text-4xl text-white sm:text-5xl">{$t("decks.title")}</h2>
            <span
                class="inline-flex w-fit items-center gap-2 rounded-xl border-2 border-white/60 px-5 py-2 text-sm font-bold tracking-widest text-white uppercase transition-colors group-hover:border-white group-hover:bg-white/10"
            >
                {$t("decks.browse")}
                <ArrowRight size={14} />
            </span>
        </div>

        <div class="absolute right-4 top-1/2 flex -translate-y-1/2 items-center sm:right-8">
            <img
                src="/ui/button_decks_card_1.svg"
                alt=""
                aria-hidden="true"
                draggable="false"
                class="h-18 w-auto -rotate-20 translate-y-2 rounded-md shadow-2xl sm:h-22"
            />
            <img
                src="/ui/button_decks_card_2.svg"
                alt=""
                aria-hidden="true"
                draggable="false"
                class="-ml-6 h-18 w-auto -rotate-[5deg] rounded-md shadow-2xl sm:h-22"
            />
            <img
                src="/ui/button_decks_card_3.svg"
                alt=""
                aria-hidden="true"
                draggable="false"
                class="-ml-6 h-18 w-auto rotate-10 -translate-y-2 rounded-md shadow-2xl sm:h-22"
            />
        </div>
    </a>
</main>
