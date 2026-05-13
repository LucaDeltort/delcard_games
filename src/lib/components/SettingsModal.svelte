<script lang="ts">
import { Dialog } from 'bits-ui'
import { Bug, Layers, Lightbulb, X } from 'lucide-svelte'
import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select'
import { type Locale, locale, t } from '$lib/i18n'
import { settings, settingsOpen } from '$lib/stores/settings'

const langLabels: Record<Locale, string> = { fr: 'Français', en: 'English' }

let lang = $state<Locale>($locale)
$effect(() => {
	locale.set(lang)
})
</script>

<Dialog.Root open={$settingsOpen} onOpenChange={(v) => ($settingsOpen = v)}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-[100] bg-black/20" />
		<Dialog.Content
			class="fixed inset-y-0 right-0 z-[110] flex w-72 max-w-[85vw] flex-col border-l border-border bg-card shadow-xl focus:outline-none"
		>
			<div class="flex items-center justify-between border-b border-border px-4 py-2">
				<Dialog.Title class="text-xs tracking-widest text-muted-foreground uppercase">{$t('settings.title')}</Dialog.Title>
				<Dialog.Close
					class="p-2 text-muted-foreground transition-colors hover:text-foreground"
					aria-label={$t('common.close')}
				>
					<X size={16} />
				</Dialog.Close>
			</div>
			<div class="flex flex-1 flex-col gap-6 px-4 py-4">
				<label class="flex flex-col gap-2">
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
				</label>
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
			<div class="flex flex-col border-t border-border px-4 py-3 gap-4">
				<a
					href="https://tally.so/r/rj27WR"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
				>
					<Bug size={14} />
					{$t('settings.bugReport')}
				</a>
				<a
					href="https://tally.so/r/Y5V8b5"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
				>
					<Layers size={14} />
					{$t('settings.proposeCardPack')}
				</a>
				<a
					href="https://tally.so/r/VLog7J"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
				>
					<Lightbulb size={14} />
					{$t('settings.proposeGame')}
				</a>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
