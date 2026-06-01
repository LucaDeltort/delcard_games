<script lang="ts">
import { ArrowRight, Club, Diamond, Heart, LogIn, Spade } from 'lucide-svelte'
import { get } from 'svelte/store'
import { browser } from '$app/environment'
import { goto } from '$app/navigation'
import logo from '$lib/assets/logo.svg'
import RulesDrawer from '$lib/components/RulesDrawer.svelte'
import Seo from '$lib/components/Seo.svelte'
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

<Seo
	title="Delcard — Card games with friends"
	description="Play War, Presidents, Werewolf and more with friends — free, no sign-up, peer-to-peer."
	canonical="/"
/>

<div class="bg-diamond" aria-hidden="true">◆</div>
<div class="bg-glow" aria-hidden="true"></div>

<main class="home-root">
	<header class="home-hero">
		<img src={logo} alt="Delcard" class="hero-logo" />
		<h1 class="hero-title">DELCARD</h1>
		<div class="suits-row" aria-hidden="true">
			<Spade size={14} class="suit-blue" />
			<Heart size={14} class="suit-red" />
			<Diamond size={14} class="suit-blue" />
			<Club size={14} class="suit-red" />
		</div>
		<span class="hero-eyebrow">{$t('home.eyebrow')}</span>
	</header>

	<div class="actions-grid">
		<!-- New game -->
		<div class="panel panel--create">
			<div class="panel-head">
				<span class="panel-tag">{$t('home.tagHost')}</span>
				<h2 class="panel-title">{$t('home.newGame')}</h2>
			</div>

			<fieldset class="game-fieldset">
				<legend class="field-label">{$t('home.labelGame')}</legend>
				<div class="game-list">
					{#each gameList as game}
						<div class="game-row-wrap">
							<label class="game-row {selectedGame === game.id ? 'game-row--on' : ''}">
								<input
									type="radio"
									name="game"
									value={game.id}
									bind:group={selectedGame}
									class="sr-only"
								/>
								<span class="game-name">
									{$t(`${game.id}.name`)}
									{#if game.isNew}
										<span class="new-badge">{$t('home.newBadge')}</span>
									{/if}
								</span>
								<span class="game-count">
									{game.minPlayers === game.maxPlayers
										? game.minPlayers
										: `${game.minPlayers}–${game.maxPlayers}`}&nbsp;{$t('common.players')}
								</span>
							</label>
							<RulesDrawer gameId={game.id} />
						</div>
					{/each}
				</div>
			</fieldset>

			<label class="nick-label">
				<span class="field-label">{$t('common.nickname')}</span>
				<Input
					bind:value={playerName}
					placeholder={$t('common.nicknamePlaceholder')}
					onkeydown={(e) => e.key === 'Enter' && createGame()}
				/>
			</label>

			{#if error}
				<p class="error-msg">{error}</p>
			{/if}

			<Button onclick={createGame} disabled={creating} class="mt-auto w-full">
				{creating ? $t('home.creating') : $t('home.create')}
			</Button>
		</div>

		<!-- Join -->
		<a href="/join" class="panel panel--join">
			<div class="panel-head">
				<span class="panel-tag panel-tag--pink">{$t('home.tagGuest')}</span>
				<h2 class="panel-title">{$t('home.joinTitle')}</h2>
			</div>
			<p class="join-sub">{$t('home.joinDesc')}</p>
			<div class="join-visual">
				<div class="join-orbit-container">
					<div class="join-icon-wrap">
						<LogIn size={40} />
					</div>
				</div>
			</div>
			<div class="join-footer">
				<span class="browse-pill">{$t('home.joinBtn')} <ArrowRight size={11} /></span>
			</div>
		</a>
	</div>

	<div class="browse-grid">
		<a href="/decks" class="browse-card browse-card--blue">
			<div class="browse-imgs">
				<img
					src="/ui/button_decks_card_1.svg"
					alt=""
					aria-hidden="true"
					draggable="false"
					class="bimg bimg-l"
				/>
				<img
					src="/ui/button_decks_card_2.svg"
					alt=""
					aria-hidden="true"
					draggable="false"
					class="bimg bimg-c"
				/>
				<img
					src="/ui/button_decks_card_3.svg"
					alt=""
					aria-hidden="true"
					draggable="false"
					class="bimg bimg-r"
				/>
			</div>
			<div class="browse-foot">
				<h2 class="browse-name">{$t('decks.title')}</h2>
				<span class="browse-pill">{$t('decks.browse')} <ArrowRight size={11} /></span>
			</div>
		</a>

		<a href="/dice" class="browse-card browse-card--pink">
			<div class="browse-imgs browse-imgs--dice">
				<img
					src="/dice/D6/classic/4.svg"
					alt=""
					aria-hidden="true"
					draggable="false"
					class="bimg bimg-l dice"
				/>
				<img
					src="/dice/D6/classic/2.svg"
					alt=""
					aria-hidden="true"
					draggable="false"
					class="bimg bimg-c dice"
				/>
				<img
					src="/dice/D6/classic/6.svg"
					alt=""
					aria-hidden="true"
					draggable="false"
					class="bimg bimg-r dice"
				/>
			</div>
			<div class="browse-foot">
				<h2 class="browse-name">{$t('dice.title')}</h2>
				<span class="browse-pill">{$t('dice.browse')} <ArrowRight size={11} /></span>
			</div>
		</a>
	</div>
</main>

<style>
	/* ── Background atmospheric elements ── */
	.bg-diamond {
		position: fixed;
		font-size: min(60vw, 55vh);
		color: white;
		opacity: 0.02;
		pointer-events: none;
		user-select: none;
		right: -10%;
		top: -8%;
		line-height: 1;
		font-family: Georgia, serif;
		z-index: 0;
	}

	.bg-glow {
		position: fixed;
		inset: 0;
		background: radial-gradient(ellipse 60% 40% at 50% 0%, oklch(0.2 0.04 264 / 0.5), transparent);
		pointer-events: none;
		z-index: 0;
	}

	/* ── Root layout ── */
	.home-root {
		position: relative;
		z-index: 1;
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2rem 1rem 3.5rem;
	}

	/* ── Hero ── */
	.home-hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		margin-bottom: 1rem;
		animation: fade-up 0.5s ease both;
	}

	.hero-eyebrow {
		display: inline-flex;
		align-items: center;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		border: 1px solid oklch(1 0 0 / 0.1);
		padding: 0.2rem 0.7rem;
		border-radius: 999px;
		margin-top: 0.75rem;
	}

	.hero-logo {
		width: 3.5rem;
		height: 3.5rem;
		margin-bottom: 0.5rem;
	}

	.hero-title {
		font-family: var(--font-heading);
		font-size: clamp(4.5rem, 16vw, 8.5rem);
		line-height: 0.95;
		letter-spacing: 0.05em;
		color: var(--foreground);
		margin: 0;
		text-shadow: 0 0 120px rgba(0, 47, 167, 0.35);
	}

	.suits-row {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		margin-top: 0.6rem;
	}


	/* ── Actions grid ── */
	.actions-grid {
		display: grid;
		gap: 1rem;
		width: 100%;
		max-width: 56rem;
		animation: fade-up 0.5s ease both;
		animation-delay: 0.1s;
	}

	@media (min-width: 640px) {
		.actions-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	/* ── Panel base ── */
	.panel {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
		border-radius: 1rem;
		border: 1px solid var(--border);
		background: var(--card);
		overflow: hidden;
		transition:
			transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1),
			box-shadow 220ms ease,
			border-color 200ms ease;
	}

	.panel::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 45%;
		pointer-events: none;
	}

	.panel--create {
		box-shadow:
			0 0 0 1px oklch(0.37 0.222 264 / 0.08),
			0 24px 48px oklch(0 0 0 / 0.3);
	}

	.panel--create::before {
		background: radial-gradient(ellipse at 50% 0%, rgba(0, 47, 167, 0.22) 0%, transparent 70%);
	}

	.panel--join {
		box-shadow:
			0 0 0 1px oklch(0.74 0.135 354 / 0.06),
			0 24px 48px oklch(0 0 0 / 0.3);
	}

	.panel--join::before {
		background: radial-gradient(ellipse at 50% 0%, rgba(246, 124, 162, 0.18) 0%, transparent 70%);
	}

	.panel:hover {
		transform: translateY(-3px);
		box-shadow: 0 18px 44px rgba(0, 0, 0, 0.55);
	}

	.panel--create:hover {
		border-color: rgba(0, 47, 167, 0.55);
	}
	.panel--join:hover {
		border-color: rgba(246, 124, 162, 0.45);
	}

	.panel--join:focus-visible {
		outline: 2px solid oklch(0.74 0.135 354 / 0.7);
		outline-offset: 2px;
	}

	/* ── Panel header ── */
	.panel-head {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.panel-tag {
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.35em;
		color: var(--primary);
	}

	.panel-tag--pink {
		color: var(--accent);
	}

	.panel-title {
		font-family: var(--font-heading);
		font-size: 2rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--foreground);
		line-height: 1;
		margin: 0;
	}

	/* ── Game list ── */
	.game-fieldset {
		border: none;
		margin: 0;
		padding: 0;
	}

	.field-label {
		display: block;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.25em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		margin-bottom: 0.5rem;
	}

	.game-list {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.game-row-wrap {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.game-row {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.8rem;
		border-radius: 0.5rem;
		border: 1px solid transparent;
		cursor: pointer;
		color: var(--muted-foreground);
		transition:
			border-color 150ms ease,
			background 150ms ease,
			color 150ms ease;
	}

	.game-row:hover {
		border-color: oklch(1 0 0 / 0.1);
		color: var(--foreground);
		background: oklch(1 0 0 / 0.03);
	}

	.game-row:focus-within {
		border-color: oklch(0.55 0.222 264 / 0.6);
		outline: 2px solid oklch(0.55 0.222 264 / 0.4);
		outline-offset: 1px;
	}

	.game-row--on {
		border-color: rgba(0, 47, 167, 0.55);
		background: rgba(0, 47, 167, 0.1);
		color: var(--foreground);
	}

	.game-name {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-heading);
		font-size: 1.1rem;
		letter-spacing: 0.04em;
	}

	.game-count {
		font-size: 0.68rem;
		letter-spacing: 0.06em;
		opacity: 0.55;
		white-space: nowrap;
	}

	.new-badge {
		font-family: var(--font-sans);
		font-size: 0.58rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		padding: 1px 5px;
		border-radius: 99px;
		background: var(--primary);
		color: var(--primary-foreground);
	}

	/* ── Nickname ── */
	.nick-label {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* ── Error ── */
	.error-msg {
		font-size: 0.8rem;
		color: var(--destructive);
		margin: 0;
	}

	/* ── Join panel ── */
	.join-sub {
		font-size: 0.8rem;
		color: var(--muted-foreground);
		margin: -0.5rem 0 0;
	}

	.join-visual {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem 0;
	}

	.join-footer {
		display: flex;
		justify-content: flex-end;
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

	.panel:hover .join-icon-wrap {
		transform: scale(1.1);
		box-shadow:
			0 0 44px rgba(246, 124, 162, 0.3),
			inset 0 0 16px rgba(246, 124, 162, 0.08);
		color: rgba(246, 124, 162, 0.9);
	}

	/* ── Browse grid ── */
	.browse-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
		width: 100%;
		max-width: 56rem;
		animation: fade-up 0.5s ease both;
		animation-delay: 0.2s;
	}

	@media (max-width: 639px) {
		.browse-imgs {
			height: 10rem;
		}
	}

	@media (min-width: 640px) {
		.browse-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.browse-card {
		position: relative;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-radius: 1rem;
		border: 1px solid var(--border);
		background: var(--card);
		transition:
			transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1),
			box-shadow 220ms ease,
			border-color 200ms ease;
	}

	.browse-card::before {
		content: '';
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

	.browse-imgs {
		position: relative;
		z-index: 1;
		flex: 1;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding: 2rem 1.5rem 0.5rem;
		filter: drop-shadow(0 10px 22px rgba(0, 0, 0, 0.7));
		transition: transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.browse-card:hover .browse-imgs {
		transform: translateY(-7px);
	}

	.bimg {
		height: 4.5rem;
		width: auto;
		border-radius: 3px;
		transition: transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.bimg.dice {
		height: 3.5rem;
		width: 3.5rem;
		border-radius: 10px;
	}

	.bimg-l {
		transform: rotate(-13deg) translateY(4px);
	}
	.bimg-c {
		transform: rotate(-2deg);
		margin: 0 -0.5rem;
		height: 5.5rem;
	}
	.bimg-c.dice {
		height: 4rem;
		margin: 0 0.5rem;
	}
	.bimg-r {
		transform: rotate(10deg) translateY(4px);
	}

	.browse-card:hover .bimg-l {
		transform: rotate(-16deg) translateY(1px);
	}
	.browse-card:hover .bimg-c {
		transform: rotate(-1deg) translateY(-3px);
	}
	.browse-card:hover .bimg-r {
		transform: rotate(13deg) translateY(1px);
	}

	.browse-foot {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem 1.25rem 1.25rem;
	}

	.browse-name {
		font-family: var(--font-heading);
		font-size: 2.5rem;
		line-height: 1;
		letter-spacing: 0.05em;
		color: var(--foreground);
		margin: 0;
	}

	/* ── Pill ── */
	.browse-pill {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 4px 10px;
		border-radius: 99px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		color: rgba(255, 255, 255, 0.45);
		transition: all 180ms ease;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.panel--join:hover .browse-pill,
	.browse-card:hover .browse-pill {
		border-color: rgba(255, 255, 255, 0.32);
		color: rgba(255, 255, 255, 0.82);
		background: rgba(255, 255, 255, 0.06);
	}

	/* ── Entrance ── */
	@keyframes fade-up {
		from {
			opacity: 0;
			transform: translateY(1.25rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
