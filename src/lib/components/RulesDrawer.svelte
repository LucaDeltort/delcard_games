<script lang="ts">
import { Info, X } from 'lucide-svelte'
import { gameRules } from '$lib/games/index'
import { locale, t } from '$lib/i18n'

let { gameId, size = 14 }: { gameId: string; size?: number } = $props()
let open = $state(false)
const rules = $derived(gameRules[gameId]?.[$locale] ?? null)
</script>

<button
	onclick={() => (open = true)}
	class="flex items-center rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
	aria-label={$t('game.rules')}
>
	<Info {size} />
</button>

{#if open}
	<button
		class="fixed inset-0 z-40 bg-black/20"
		onclick={() => (open = false)}
		aria-label="Close rules"
	></button>
	<div class="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col border-l border-border bg-card shadow-xl">
		<div class="flex items-center justify-between border-b border-border px-4 py-3">
			<span class="text-xs tracking-widest text-muted-foreground uppercase">{$t('game.rules')}</span>
			<button
				onclick={() => (open = false)}
				class="text-muted-foreground transition-colors hover:text-foreground"
			>
				<X size={16} />
			</button>
		</div>
		{#if rules}
			<div class="flex-1 overflow-y-auto px-4 py-3">
				<pre class="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">{rules}</pre>
			</div>
		{/if}
	</div>
{/if}
