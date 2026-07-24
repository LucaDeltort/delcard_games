<script lang="ts">
import { Check, Share2 } from 'lucide-svelte'
import { get } from 'svelte/store'
import { fly } from 'svelte/transition'
import { Button } from '$lib/components/ui/button'
import type { GameStateGeneric } from '$lib/core/types'
import type { GameDefinition } from '$lib/engine'
import { t } from '$lib/i18n'

interface Player {
	id: string
	name: string
}

interface Props {
	gameState: GameStateGeneric
	gameDef: GameDefinition<GameStateGeneric> | undefined
	gameName: string
	players: Player[]
	winnerId: string | null
	isHost: boolean
	canRematch: boolean
	onRematch: () => void
}

const { gameState, gameDef, gameName, players, winnerId, isHost, canRematch, onRematch }: Props =
	$props()

let shared = $state(false)

const winnerName = $derived(players.find((p) => p.id === winnerId)?.name ?? winnerId ?? '?')

type ScoreEntry = { id: string; name: string; score: number }

const scores = $derived.by<ScoreEntry[]>(() => {
	const s = gameState as unknown as Record<string, unknown>
	if (typeof s['scores'] === 'object' && s['scores'] !== null) {
		return Object.entries(s['scores'] as Record<string, number>)
			.map(([id, score]) => ({ id, name: players.find((p) => p.id === id)?.name ?? id, score }))
			.sort((a, b) => b.score - a.score)
	}
	if (typeof s['coins'] === 'object' && s['coins'] !== null) {
		return Object.entries(s['coins'] as Record<string, number>)
			.map(([id, score]) => ({ id, name: players.find((p) => p.id === id)?.name ?? id, score }))
			.sort((a, b) => b.score - a.score)
	}
	return []
})

async function shareResult() {
	let text: string
	if (scores.length > 0) {
		const ranking = scores.map((s, i) => `${i + 1}. ${s.name} (${s.score})`).join('\n')
		text = `🏆 ${winnerName} ${$t('game.wins')} — ${gameName}\n\n${ranking}`
	} else {
		text = `🏆 ${winnerName} ${$t('game.wins')} — ${gameName}`
	}
	if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
		try {
			await navigator.share({ title: $t('game.over'), text })
			return
		} catch {
			// cancelled — fall through
		}
	}
	await navigator.clipboard.writeText(text)
	shared = true
	setTimeout(() => (shared = false), 3000)
}
</script>

<div class="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm" aria-live="polite">
	<!-- confetti pieces -->
	{#each Array(40) as _, i}
		<div
			class="confetti"
			style={`--i:${i}; --x:${Math.random() * 100}%; --delay:${Math.random() * 3}s; --duration:${2 + Math.random() * 2}s; --hue:${Math.floor(Math.random() * 360)}; --rotate:${Math.random() * 720 - 360}deg`}
		></div>
	{/each}

	<div
		in:fly={{ y: 30, duration: 400 }}
		class="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl"
	>
		<p class="mb-1 text-xs tracking-widest text-muted-foreground uppercase">{$t('game.over')}</p>
		<div class="mb-4 flex items-center gap-3">
			<span class="text-4xl" aria-hidden="true">🏆</span>
			<div>
				<h2 class="font-heading text-3xl text-foreground">{winnerName}</h2>
				<p class="text-lg text-muted-foreground">{$t('game.wins')} · {gameName}</p>
			</div>
		</div>

		{#if scores.length > 0}
			<div class="mb-6">
				<p class="mb-2 text-xs tracking-widest text-muted-foreground uppercase">{$t('game.finalScores')}</p>
				<ul class="space-y-1.5">
					{#each scores as entry, i}
						<li class="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 {entry.id === winnerId ? 'ring-1 ring-primary/40' : ''}">
							<span class="w-6 text-center font-mono text-sm text-muted-foreground">{i + 1}</span>
							<span class="flex-1 truncate text-sm text-foreground">{entry.name}</span>
							<span class="font-mono text-sm text-foreground">{entry.score}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="flex flex-col gap-2">
			{#if isHost}
				<Button onclick={onRematch} disabled={!canRematch} size="default" class="w-full">
					{$t('game.rematch')}
				</Button>
			{/if}
			<div class="flex gap-2">
				<Button onclick={shareResult} variant="outline" size="sm" class="flex-1">
					{#key shared}
						<span class="inline-flex items-center gap-1.5" in:fly={{ duration: 200 }}>
							{#if shared}
								<Check size={14} />
								{$t('game.resultShared')}
							{:else}
								<Share2 size={14} />
								{$t('game.shareResult')}
							{/if}
						</span>
					{/key}
				</Button>
				<Button href="/" variant="ghost" size="sm" class="flex-1">{$t('common.backHome')}</Button>
			</div>
		</div>
	</div>
</div>

<style>
	.confetti {
		position: absolute;
		top: -10px;
		left: var(--x);
		width: 8px;
		height: 12px;
		background: hsl(var(--hue) 70% 55%);
		border-radius: 2px;
		opacity: 0;
		animation: confetti-fall var(--duration) ease-in forwards;
		animation-delay: var(--delay);
		transform: rotate(0deg);
	}

	@keyframes confetti-fall {
		0% {
			opacity: 1;
			transform: translateY(-20px) rotate(0deg);
		}
		100% {
			opacity: 0;
			transform: translateY(90vh) rotate(var(--rotate));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.confetti {
			display: none;
		}
	}
</style>
