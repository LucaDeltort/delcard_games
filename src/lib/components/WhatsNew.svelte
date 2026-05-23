<script lang="ts">
import { X } from 'lucide-svelte'
import { fly } from 'svelte/transition'
import { browser } from '$app/environment'
import { getLatestNote } from '$lib/changelog'
import { locale, t } from '$lib/i18n'

const STORAGE_KEY = 'lastSeenVersion'
const note = getLatestNote()

let visible = $state(false)

$effect(() => {
	if (!browser) return
	visible = localStorage.getItem(STORAGE_KEY) !== note.version
})

function dismiss() {
	localStorage.setItem(STORAGE_KEY, note.version)
	visible = false
}
</script>

{#if visible}
	<div
		class="fixed right-4 z-50 w-72 rounded-lg border border-border bg-card shadow-xl"
		style="bottom: calc(5rem + env(safe-area-inset-bottom))"
		transition:fly={{ y: 16, duration: 250 }}
	>
		<div class="flex items-center justify-between border-b border-border px-4 py-2">
			<span class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
				v{note.version}
			</span>
			<button
				onclick={dismiss}
				class="p-1 text-muted-foreground transition-colors hover:text-foreground"
				aria-label={$t('common.close')}
			>
				<X size={14} />
			</button>
		</div>
		<ul class="flex flex-col gap-1 px-4 py-3">
			{#each note.items as item}
				<li class="flex items-start gap-2 text-xs text-foreground">
					<span class="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/40"></span>
					{$locale === 'fr' ? item.fr : item.en}
				</li>
			{/each}
		</ul>
	</div>
{/if}
