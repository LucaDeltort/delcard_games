<script lang="ts">
import { ArrowRight, LogIn } from 'lucide-svelte'
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

    <div class="grid w-full max-w-4xl gap-4 sm:grid-cols-2">
        <!-- New game -->
        <div class="game-card game-card--blue flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
            <h2 class="text-3xl uppercase tracking-wide text-foreground">{$t("home.newGame")}</h2>

            <fieldset class="m-0 flex flex-col gap-2 border-0 p-0">
                <legend class="mb-2 text-xs tracking-widest text-muted-foreground uppercase"
                    >{$t("home.labelGame")}</legend
                >
                <div class="flex flex-col gap-2">
                    {#each gameList as game}
                        <div class="flex items-center gap-2">
                            <label
                                class="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors {selectedGame ===
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
                                <span class="flex flex-1 items-center gap-2 font-medium">
                                    {$t(`${game.id}.name`)}
                                    {#if game.isNew}
                                        <span
                                            class="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground uppercase tracking-widest"
                                            >New</span
                                        >
                                    {/if}
                                </span>
                                <span class="text-xs"
                                    >{game.minPlayers === game.maxPlayers
                                        ? game.minPlayers
                                        : `${game.minPlayers}–${game.maxPlayers}`}
                                    {$t("common.players")}</span
                                >
                            </label>
                            <RulesDrawer gameId={game.id} />
                        </div>
                    {/each}
                </div>
            </fieldset>

            <label class="flex flex-col gap-2">
                <span class="text-xs tracking-widest text-muted-foreground uppercase">{$t("common.nickname")}</span>
                <Input
                    bind:value={playerName}
                    placeholder={$t("common.nicknamePlaceholder")}
                    onkeydown={(e) => e.key === "Enter" && createGame()}
                />
            </label>

            {#if error}
                <p class="text-sm text-destructive">{error}</p>
            {/if}

            <Button onclick={createGame} disabled={creating} class="mt-auto w-full">
                {creating ? $t("home.creating") : $t("home.create")}
            </Button>
        </div>

        <!-- Join -->
        <a href="/join" class="game-card game-card--pink flex flex-col rounded-2xl border border-border bg-card p-6">
            <h2 class="text-3xl uppercase tracking-wide text-foreground">{$t("home.joinTitle")}</h2>
            <p class="mt-1 text-sm text-muted-foreground">{$t("home.joinDesc")}</p>
            <div class="flex flex-1 items-center justify-center py-6">
                <div class="join-orbit-container">
                    <div class="join-icon-wrap">
                        <LogIn size={40} />
                    </div>
                    <div class="orbit-card orbit-card--1">
                        <img src="/ui/button_decks_card_1.svg" alt="" aria-hidden="true" draggable="false" />
                    </div>
                    <div class="orbit-card orbit-card--2">
                        <img src="/ui/button_decks_card_2.svg" alt="" aria-hidden="true" draggable="false" />
                    </div>
                    <div class="orbit-card orbit-card--3">
                        <img src="/ui/button_decks_card_3.svg" alt="" aria-hidden="true" draggable="false" />
                    </div>
                </div>
            </div>
            <div class="flex justify-end">
                <span class="browse-pill">{$t("home.joinBtn")} <ArrowRight size={11} /></span>
            </div>
        </a>
    </div>

    <div class="grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2">
        <a
            href="/decks"
            class="browse-card browse-card--blue flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
        >
            <div class="card-images flex flex-1 items-end justify-center px-6 pt-8 pb-2">
                <img
                    src="/ui/button_decks_card_1.svg"
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                    class="img-l h-18 w-auto rounded-sm"
                />
                <img
                    src="/ui/button_decks_card_2.svg"
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                    class="img-c -mx-2 h-22.5 w-auto rounded-sm"
                />
                <img
                    src="/ui/button_decks_card_3.svg"
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                    class="img-r h-18 w-auto rounded-sm"
                />
            </div>
            <div class="flex items-end justify-between gap-3 px-6 py-5">
                <h2 class="font-heading text-4xl leading-none tracking-wide">{$t("decks.title")}</h2>
                <span class="browse-pill shrink-0">{$t("decks.browse")} <ArrowRight size={11} /></span>
            </div>
        </a>

        <a
            href="/dice"
            class="browse-card browse-card--pink flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
        >
            <div class="card-images flex flex-1 items-end justify-center gap-3 px-6 pt-8 pb-2">
                <img
                    src="/dice/D6/classic/4.svg"
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                    class="img-l h-14 w-14 rounded-xl"
                />
                <img
                    src="/dice/D6/classic/2.svg"
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                    class="img-c h-16 w-16 rounded-xl"
                />
                <img
                    src="/dice/D6/classic/6.svg"
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                    class="img-r h-14 w-14 rounded-xl"
                />
            </div>
            <div class="flex items-end justify-between gap-3 px-6 py-5">
                <h2 class="font-heading text-4xl leading-none tracking-wide">{$t("dice.title")}</h2>
                <span class="browse-pill shrink-0">{$t("dice.browse")} <ArrowRight size={11} /></span>
            </div>
        </a>
    </div>
</main>

<style>
    .game-card {
        position: relative;
        transition:
            transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 220ms ease,
            border-color 200ms ease;
    }
    .game-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 18px 44px rgba(0, 0, 0, 0.55);
    }
    .game-card--blue:hover {
        border-color: rgba(0, 47, 167, 0.75);
    }
    .game-card--pink:hover {
        border-color: rgba(246, 124, 162, 0.55);
    }

    @keyframes card-tilt {
        0%,
        100% {
            transform: rotate(-10deg);
        }
        50% {
            transform: rotate(10deg);
        }
    }

    @keyframes card-orbit {
        from {
            transform: rotate(0deg) translateX(82px) rotate(0deg);
        }
        to {
            transform: rotate(360deg) translateX(82px) rotate(-360deg);
        }
    }

    .join-orbit-container {
        position: relative;
        width: 80px;
        height: 80px;
    }

    .join-icon-wrap {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        border: 1px solid rgba(246, 124, 162, 0.2);
        color: rgba(246, 124, 162, 0.65);
        box-shadow:
            0 0 30px rgba(246, 124, 162, 0.18),
            inset 0 0 16px rgba(246, 124, 162, 0.04);
        transition:
            transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 220ms ease,
            color 200ms ease;
        z-index: 1;
    }
    .game-card:hover .join-icon-wrap {
        transform: scale(1.1);
        box-shadow:
            0 0 44px rgba(246, 124, 162, 0.3),
            inset 0 0 16px rgba(246, 124, 162, 0.08);
        color: rgba(246, 124, 162, 0.9);
    }

    .orbit-card {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 32px;
        height: auto;
        margin-top: -22px;
        margin-left: -16px;
        border-radius: 3px;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.55);
        filter: drop-shadow(0 2px 6px rgba(246, 124, 162, 0.25));
        animation: card-orbit 9s linear infinite;
    }
    .orbit-card img {
        display: block;
        width: 100%;
        border-radius: 3px;
        animation: card-tilt 2.8s ease-in-out infinite;
    }
    .orbit-card--1 {
        animation-delay: 0s;
    }
    .orbit-card--2 {
        animation-delay: -3s;
    }
    .orbit-card--3 {
        animation-delay: -6s;
    }
    .orbit-card--1 img {
        animation-delay: 0s;
    }
    .orbit-card--2 img {
        animation-delay: -1s;
    }
    .orbit-card--3 img {
        animation-delay: -2s;
    }

    @media (prefers-reduced-motion: reduce) {
        .orbit-card {
            animation: none;
        }
        .orbit-card--1 {
            transform: rotate(0deg) translateX(82px) rotate(0deg);
        }
        .orbit-card--2 {
            transform: rotate(120deg) translateX(82px) rotate(-120deg);
        }
        .orbit-card--3 {
            transform: rotate(240deg) translateX(82px) rotate(-240deg);
        }
    }

    .browse-card {
        position: relative;
        transition:
            transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 220ms ease,
            border-color 200ms ease;
    }
    .browse-card::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        border-radius: inherit;
    }
    .browse-card--blue::before {
        background: radial-gradient(ellipse at 50% -10%, rgba(0, 47, 167, 0.55) 0%, transparent 60%);
    }
    .browse-card--pink::before {
        background: radial-gradient(ellipse at 50% -10%, rgba(246, 124, 162, 0.4) 0%, transparent 60%);
    }
    .browse-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 18px 44px rgba(0, 0, 0, 0.55);
    }
    .browse-card--blue:hover {
        border-color: rgba(0, 47, 167, 0.75);
    }
    .browse-card--pink:hover {
        border-color: rgba(246, 124, 162, 0.55);
    }

    .card-images {
        position: relative;
        z-index: 1;
        filter: drop-shadow(0 10px 22px rgba(0, 0, 0, 0.7));
        transition: transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .browse-card:hover .card-images {
        transform: translateY(-7px);
    }

    .img-l {
        transform: rotate(-13deg) translateY(4px);
        transition: transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .img-c {
        transform: rotate(-2deg);
        transition: transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .img-r {
        transform: rotate(10deg) translateY(4px);
        transition: transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .browse-card:hover .img-l {
        transform: rotate(-16deg) translateY(1px);
    }
    .browse-card:hover .img-c {
        transform: rotate(-1deg) translateY(-3px);
    }
    .browse-card:hover .img-r {
        transform: rotate(13deg) translateY(1px);
    }

    .browse-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 0.68rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        padding: 5px 11px;
        border-radius: 99px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: rgba(255, 255, 255, 0.45);
        transition: all 180ms ease;
        white-space: nowrap;
    }
    .browse-card:hover .browse-pill {
        border-color: rgba(255, 255, 255, 0.32);
        color: rgba(255, 255, 255, 0.82);
        background: rgba(255, 255, 255, 0.06);
    }
</style>
