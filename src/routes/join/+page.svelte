<script lang="ts">
import { get } from 'svelte/store'
import { browser } from '$app/environment'
import { goto } from '$app/navigation'
import { page } from '$app/stores'
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

<main class="flex min-h-screen flex-col items-center justify-center gap-12 px-4">
	<header class="text-center">
		<h1 class="text-8xl tracking-wide text-foreground">DELCARD</h1>
	</header>

	<div class="w-full max-w-sm">
		<div class="flex flex-col gap-6 rounded-xl border border-border bg-card p-6">
			<div>
				<h2 class="text-2xl text-foreground">{$t('join.title')}</h2>
				<p class="mt-1 text-sm text-muted-foreground">{$t('join.desc')}</p>
			</div>

			<div class="flex flex-col gap-4">
				<div class="flex flex-col gap-2">
					<span class="text-xs tracking-widest text-muted-foreground uppercase"
						>{$t('join.labelCode')}</span
					>
					<Input
						bind:value={code}
						placeholder={$t('join.codePlaceholder')}
						class="font-mono tracking-widest uppercase"
						onkeydown={(e) => e.key === 'Enter' && joinGame()}
					/>
				</div>

				<div class="flex flex-col gap-2">
					<span class="text-xs tracking-widest text-muted-foreground uppercase"
						>{$t('common.nickname')}</span
					>
					<Input
						bind:value={playerName}
						placeholder={$t('common.nicknamePlaceholder')}
						onkeydown={(e) => e.key === 'Enter' && joinGame()}
					/>
				</div>
			</div>

			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}

			<div class="flex flex-col gap-2">
				<Button onclick={joinGame} disabled={joining} class="w-full">
					{joining ? $t('join.connecting') : $t('join.joinBtn')}
				</Button>
				<Button href="/" variant="ghost" class="w-full">{$t('join.back')}</Button>
			</div>
		</div>
	</div>
</main>
