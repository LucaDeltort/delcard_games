<script lang="ts">
import { X } from 'lucide-svelte'
import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select'
import { type Locale, locale, t } from '$lib/i18n'
import { settings, settingsOpen } from '$lib/stores/settings'

const langLabels: Record<Locale, string> = { fr: 'Français', en: 'English' }

let lang = $state<Locale>($locale)
$effect(() => {
	locale.set(lang)
})
</script>

{#if $settingsOpen}
	<button
		class="fixed inset-0 z-40 bg-black/20"
		onclick={() => ($settingsOpen = false)}
		aria-label="Close settings"
	></button>
	<div class="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col border-l border-border bg-card shadow-xl">
		<div class="flex items-center justify-between border-b border-border px-4 py-2">
			<span class="text-xs tracking-widest text-muted-foreground uppercase">{$t('settings.title')}</span>
			<button onclick={() => ($settingsOpen = false)} class="text-muted-foreground transition-colors hover:text-foreground">
				<X size={16} />
			</button>
		</div>
		<div class="flex flex-col gap-6 px-4 py-4">
			<div class="flex flex-col gap-2">
				<span class="text-xs tracking-widest text-muted-foreground uppercase">{$t('settings.language')}</span>
				<Select type="single" bind:value={lang} allowDeselect={false}>
					<SelectTrigger class="w-full">
						{langLabels[lang]}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="fr" label="Français" />
						<SelectItem value="en" label="English" />
					</SelectContent>
				</Select>
			</div>
			<div class="flex flex-col gap-2">
				<span class="text-xs tracking-widest text-muted-foreground uppercase">{$t('settings.timeFormat')}</span>
				<div class="flex overflow-hidden rounded-md border border-border text-xs">
					<button
						onclick={() => settings.update((s) => ({ ...s, timeFormat: '24' }))}
						class="flex-1 px-3 py-1.5 transition-colors {$settings.timeFormat === '24' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}"
					>
						{$t('settings.timeFormat24')}
					</button>
					<button
						onclick={() => settings.update((s) => ({ ...s, timeFormat: '12' }))}
						class="flex-1 border-l border-border px-3 py-1.5 transition-colors {$settings.timeFormat === '12' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}"
					>
						{$t('settings.timeFormat12')}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
