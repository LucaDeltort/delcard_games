<script lang="ts">
import { Club, Diamond, Heart, Spade } from 'lucide-svelte'
import { get } from 'svelte/store'
import { browser } from '$app/environment'
import { goto } from '$app/navigation'
import { page } from '$app/stores'
import logo from '$lib/assets/logo.svg'
import Seo from '$lib/components/Seo.svelte'
import { Button } from '$lib/components/ui/button'
import { Input } from '$lib/components/ui/input'
import { t } from '$lib/i18n'
import { GameClient } from '$lib/network/client'
import { activeClient } from '$lib/stores/session'

let code = $state($page.url.searchParams.get('code') ?? '')
let playerName = $state(browser ? (localStorage.getItem('playerName') ?? '') : '')
let joining = $state(false)
let error = $state('')

async function joinGame() {
	if (!playerName.trim()) {
		error = get(t)('common.errorNickname')
		return
	}
	const trimmedCode = code.trim().toUpperCase()
	if (!trimmedCode) {
		error = get(t)('join.errorCode')
		return
	}
	if (!browser) return

	joining = true
	error = ''

	const trimmedName = playerName.trim()
	localStorage.setItem('playerName', trimmedName)

	const client = new GameClient(trimmedCode, trimmedName)

	try {
		await new Promise<void>((resolve, reject) => {
			client.onWelcome = () => resolve()
			client.onDisconnected = (msg) => reject(new Error(msg))
			setTimeout(() => reject(new Error('__timeout__')), 10000)
		})
	} catch (err) {
		if (err instanceof Error && err.message === '__timeout__') {
			error = get(t)('join.errorTimeout')
		} else {
			error = err instanceof Error ? err.message : get(t)('join.errorConnection')
		}
		client.close()
		joining = false
		return
	}

	activeClient.set(client)
	goto(`/game/${trimmedCode}?name=${encodeURIComponent(trimmedName)}`)
}
</script>

<Seo
	title="Join a game | Delcard"
	description="Enter your game code to join a friend's card game instantly. Free, no sign-up needed."
	canonical="/join"
	titleFr="Rejoindre une partie | Delcard"
	descriptionFr="Entrez votre code de partie pour rejoindre immédiatement une partie de cartes entre amis. Gratuit, sans inscription."
/>

<main class="join-root">
	<div class="bg-spade" aria-hidden="true"><Spade style="width:100%;height:100%" /></div>
	<div class="bg-glow" aria-hidden="true"></div>

	<div class="join-grid">
		<aside class="brand-side">
			<span class="eyebrow">{$t('join.eyebrow')}</span>
			<img src={logo} alt="Delcard" class="brand-logo" />
			<h1 class="brand-title">DELCARD</h1>
			<p class="brand-sub">
				{$t('join.brandLine1')}<br />{$t('join.brandLine2')}
			</p>
			<div class="suits-row" aria-hidden="true">
				<Spade size={20} class="suit-blue" />
				<Heart size={20} class="suit-red" />
				<Diamond size={20} class="suit-blue" />
				<Club size={20} class="suit-red" />
			</div>
		</aside>

		<section class="form-panel">
			<div class="form-header">
				<span class="form-tag">{$t('join.tagEnter')}</span>
				<h2 class="form-title">{$t('join.title')}</h2>
				<p class="form-desc">{$t('join.desc')}</p>
			</div>

			<div class="form-fields">
				<label class="field-group">
					<span class="field-label">{$t('join.labelCode')}</span>
					<div class="code-wrap">
						<Input
							bind:value={code}
							placeholder={$t('join.codePlaceholder')}
							maxlength={4}
							onkeydown={(e) => e.key === 'Enter' && joinGame()}
						/>
					</div>
				</label>

				<label class="field-group">
					<span class="field-label">{$t('common.nickname')}</span>
					<Input
						bind:value={playerName}
						placeholder={$t('common.nicknamePlaceholder')}
						onkeydown={(e) => e.key === 'Enter' && joinGame()}
					/>
				</label>
			</div>

			{#if error}
				<p class="error-msg">{error}</p>
			{/if}

			<div class="form-actions">
				<button type="button" class="btn-join" onclick={joinGame} disabled={joining}>
					{joining ? $t('join.connecting') : $t('join.joinBtn')}
				</button>
				<Button href="/" variant="ghost" class="w-full">{$t('join.back')}</Button>
			</div>
		</section>
	</div>
</main>

<style>
	.join-root {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
		position: relative;
		overflow: hidden;
	}

	/* Large ghosted spade — atmospheric background element */
	.bg-spade {
		position: absolute;
		width: min(70vw, 60vh);
		height: min(70vw, 60vh);
		color: white;
		opacity: 0.025;
		pointer-events: none;
		user-select: none;
		left: -8%;
		top: 50%;
		transform: translateY(-50%);
	}

	/* Subtle blue radial glow from right */
	.bg-glow {
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse 50% 80% at 80% 50%, oklch(0.2 0.04 264 / 0.5), transparent);
		pointer-events: none;
	}

	/* Two-column grid on desktop, stacked on mobile */
	.join-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2.5rem;
		width: 100%;
		max-width: 860px;
		min-width: 0;
		z-index: 1;
	}

	@media (min-width: 768px) {
		.join-grid {
			grid-template-columns: 1fr 1fr;
			gap: 5rem;
			align-items: center;
		}
	}

	/* ── Brand side ── */

	.brand-side {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		animation: fade-up 0.6s ease both;
		animation-delay: 0.05s;
	}

	@media (max-width: 767px) {
		.brand-side {
			text-align: center;
			align-items: center;
		}

		.suits-row {
			display: none;
		}

		.brand-sub {
			display: none;
		}
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		font-size: 0.625rem;
		font-weight: 700;
		letter-spacing: 0.3em;
		color: var(--accent);
		border: 1px solid oklch(0.74 0.135 354 / 0.35);
		background: oklch(0.74 0.135 354 / 0.08);
		padding: 0.25rem 0.75rem;
		border-radius: 999px;
		width: fit-content;
	}

	.brand-logo {
		width: 3.5rem;
		height: 3.5rem;
	}

	.brand-title {
		font-family: var(--font-heading);
		font-size: clamp(3.5rem, 8vw, 6rem);
		line-height: 1;
		letter-spacing: 0.04em;
		color: var(--foreground);
		margin: 0;
	}

	.brand-sub {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		line-height: 1.7;
	}

	.suits-row {
		display: flex;
		gap: 1rem;
		align-items: center;
		margin-top: 0.5rem;
	}


	/* ── Form panel ── */

	.form-panel {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 2rem;
		min-width: 0;
		animation: fade-up 0.6s ease both;
		animation-delay: 0.15s;
		box-shadow: 0 0 0 1px oklch(0.37 0.222 264 / 0.08), 0 24px 48px oklch(0 0 0 / 0.3);
	}

	.form-header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.form-tag {
		font-size: 0.625rem;
		font-weight: 700;
		letter-spacing: 0.35em;
		color: var(--primary);
		margin-bottom: 0.25rem;
	}

	.form-title {
		font-family: var(--font-heading);
		font-size: 2rem;
		letter-spacing: 0.04em;
		color: var(--foreground);
		margin: 0;
	}

	.form-desc {
		font-size: 0.8rem;
		color: var(--muted-foreground);
		margin: 0;
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field-label {
		font-size: 0.625rem;
		font-weight: 600;
		letter-spacing: 0.25em;
		color: var(--muted-foreground);
		text-transform: uppercase;
	}

	/* Dramatic code input */
	.code-wrap :global(input) {
		font-family: var(--font-heading);
		font-size: 2.5rem;
		letter-spacing: 0.35em;
		text-align: center;
		text-transform: uppercase;
		height: 4rem;
		background: oklch(0.11 0 0);
		border-color: oklch(1 0 0 / 0.12);
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
		padding-left: 0.5em;
	}

	.code-wrap :global(input:focus) {
		border-color: oklch(0.74 0.135 354 / 0.7);
		box-shadow: 0 0 0 3px oklch(0.74 0.135 354 / 0.12);
		outline: none;
	}

	.code-wrap :global(input::placeholder) {
		letter-spacing: 0.35em;
		opacity: 0.25;
	}

	/* Error */
	.error-msg {
		font-size: 0.8rem;
		color: var(--destructive);
		margin: 0;
	}

	/* Actions */
	.form-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.btn-join {
		width: 100%;
		height: 2.5rem;
		background: oklch(0.74 0.135 354);
		color: oklch(0.13 0 0);
		font-family: var(--font-sans);
		font-size: 0.875rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition:
			filter 0.15s,
			transform 0.1s;
	}

	.btn-join:hover:not(:disabled) {
		filter: brightness(1.08);
		transform: translateY(-1px);
	}

	.btn-join:active:not(:disabled) {
		transform: translateY(0);
		filter: brightness(0.95);
	}

	.btn-join:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Entrance animations */
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
