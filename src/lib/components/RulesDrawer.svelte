<script lang="ts">
import { Dialog } from 'bits-ui'
import { Info, X } from 'lucide-svelte'
import { gameRules } from '$lib/games/index'
import { locale, t } from '$lib/i18n'

let { gameId, size = 14 }: { gameId: string; size?: number } = $props()
let open = $state(false)
const rules = $derived(gameRules[gameId]?.[$locale] ?? null)
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger
		class="flex items-center rounded p-2 text-muted-foreground transition-colors hover:text-foreground"
		aria-label={$t('game.rules')}
	>
		<Info {size} />
	</Dialog.Trigger>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-[100] bg-black/20" />
		<Dialog.Content
			class="fixed inset-y-0 right-0 z-[110] flex w-72 max-w-[85vw] flex-col border-l border-border bg-card shadow-xl focus:outline-none"
		>
			<div class="flex items-center justify-between border-b border-border px-4 py-2">
				<Dialog.Title class="text-xs tracking-widest text-muted-foreground uppercase">
					{$t('game.rules')}
				</Dialog.Title>
				<Dialog.Close
					class="p-2 text-muted-foreground transition-colors hover:text-foreground"
					aria-label={$t('common.close')}
				>
					<X size={16} />
				</Dialog.Close>
			</div>
			{#if rules}
				<div class="flex-1 overflow-y-auto px-4 py-3">
					<div class="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">{rules}</div>
				</div>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
