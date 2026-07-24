<script lang="ts">
import { Dialog } from 'bits-ui'
import { Bug, ScrollText, Trophy, X } from 'lucide-svelte'
import { getChangelog } from '$lib/changelog'
import StatsContent from '$lib/components/StatsContent.svelte'
import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select'
import { type Locale, locale, t } from '$lib/i18n'
import { settings, settingsOpen } from '$lib/stores/settings'

const version = __APP_VERSION__
const changelog = getChangelog()
let changelogOpen = $state(false)
let statsOpen = $state(false)

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
					<p class="text-xs text-muted-foreground">{$t('settings.timeFormatHint')}</p>
				</div>
				<div class="flex flex-col gap-2">
					<span class="text-xs tracking-widest text-muted-foreground uppercase">{$t('settings.sound')}</span>
					<div class="flex overflow-hidden rounded-md border border-border text-xs">
						<button
							onclick={() => settings.update((s) => ({ ...s, muted: false }))}
							class="flex-1 px-3 py-1.5 transition-colors {!$settings.muted ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}"
						>
							{$t('settings.soundOn')}
						</button>
						<button
							onclick={() => settings.update((s) => ({ ...s, muted: true }))}
							class="flex-1 border-l border-border px-3 py-1.5 transition-colors {$settings.muted ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}"
						>
							{$t('settings.soundOff')}
						</button>
					</div>
				</div>
			</div>
			<div class="flex flex-col border-t border-border px-4 py-3 gap-4">
				<a
					href="https://tally.so/r/PdWqYb"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
				>
					<Bug size={14} />
					{$t('settings.feedback')}
				</a>
				<button
					onclick={() => { $settingsOpen = false; statsOpen = true }}
					class="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
				>
					<Trophy size={14} />
					{$t('stats.title')}
				</button>
				<button
					onclick={() => { $settingsOpen = false; changelogOpen = true }}
					class="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
				>
					<ScrollText size={14} />
					{$t('settings.changelog')}
				</button>
				<span class="text-xs text-muted-foreground/50">v{version}</span>
			</div>
	</Dialog.Content>
</Dialog.Portal>
</Dialog.Root>

<Dialog.Root open={changelogOpen} onOpenChange={(v) => (changelogOpen = v)}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-[120] bg-black/20" />
		<Dialog.Content
			class="fixed inset-y-0 right-0 z-[130] flex w-72 max-w-[85vw] flex-col border-l border-border bg-card shadow-xl focus:outline-none"
		>
			<div class="flex items-center justify-between border-b border-border px-4 py-2">
				<Dialog.Title class="text-xs tracking-widest text-muted-foreground uppercase">{$t('settings.changelog')}</Dialog.Title>
				<Dialog.Close
					class="p-2 text-muted-foreground transition-colors hover:text-foreground"
					aria-label={$t('common.close')}
				>
					<X size={16} />
				</Dialog.Close>
			</div>
			<div class="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
				{#each changelog as note}
					<div class="flex flex-col gap-2">
						<div class="flex items-baseline justify-between">
							<span class="text-xs font-semibold text-foreground">v{note.version}</span>
							<span class="text-xs text-muted-foreground/60">{note.date}</span>
						</div>
						<ul class="flex flex-col gap-1">
							{#each note.items as item}
								<li class="flex items-start gap-2 text-xs text-muted-foreground">
									<span class="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/40"></span>
									{$locale === 'fr' ? item.fr : item.en}
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<Dialog.Root open={statsOpen} onOpenChange={(v) => (statsOpen = v)}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-[120] bg-black/20" />
		<Dialog.Content
			class="fixed top-1/2 left-1/2 z-[130] flex max-h-[80vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-card shadow-2xl focus:outline-none"
		>
			<div class="flex items-center justify-between border-b border-border px-4 py-3">
				<Dialog.Title class="flex items-center gap-2 font-heading text-sm tracking-wide text-foreground uppercase">
					<Trophy size={16} />
					{$t('stats.title')}
				</Dialog.Title>
				<Dialog.Close
					class="p-2 text-muted-foreground transition-colors hover:text-foreground"
					aria-label={$t('common.close')}
				>
					<X size={16} />
				</Dialog.Close>
			</div>
			<div class="flex-1 overflow-y-auto p-4">
				<StatsContent />
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
