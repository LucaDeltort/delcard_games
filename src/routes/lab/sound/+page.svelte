<script lang="ts">
import { Play, Repeat, Square, Volume2, VolumeX } from 'lucide-svelte'
import { playLoop, playSound, unlockAudio } from '$lib/audio/player'
import { type SoundDef, Sounds, soundFile } from '$lib/audio/sounds'
import { type Locale, locale } from '$lib/i18n'
import { settings } from '$lib/stores/settings'

const groups = [
	{ label: 'SFX', items: Object.entries(Sounds.sfx) },
	{ label: 'Voice', items: Object.entries(Sounds.voice) }
] as { label: string; items: [string, SoundDef][] }[]

// Probe each file (per current locale) so the lab shows what's actually present.
let available = $state<Record<string, boolean | undefined>>({})

$effect(() => {
	const loc = $locale // re-probe when locale changes (voice paths differ)
	for (const group of groups) {
		for (const [, def] of group.items) {
			const path = soundFile(def, loc)
			fetch(path, { method: 'HEAD' })
				.then((r) => {
					available[path] = r.ok
				})
				.catch(() => {
					available[path] = false
				})
		}
	}
})

// Track active loops so they can be stopped.
let stoppers = $state<Record<string, () => void>>({})

// Per-sound gain override, seeded from each descriptor's baseline.
const keyOf = (group: string, name: string) => group + '.' + name
let gains = $state<Record<string, number>>(
	Object.fromEntries(
		groups.flatMap((g) => g.items.map(([name, def]) => [keyOf(g.label, name), def.gain]))
	)
)

function play(key: string, def: SoundDef) {
	unlockAudio()
	playSound(def, gains[key])
}

function toggleLoop(key: string, def: SoundDef) {
	unlockAudio()
	if (stoppers[key]) {
		stoppers[key]()
		delete stoppers[key]
		stoppers = { ...stoppers }
	} else {
		stoppers = { ...stoppers, [key]: playLoop(def, gains[key]) }
	}
}

const locales: Locale[] = ['fr', 'en']
</script>

<main class="min-h-dvh p-8 text-foreground">
	<h1 class="font-heading mb-2 text-4xl">Sound</h1>
	<p class="mb-10 text-sm text-muted-foreground">
		Play each registered sound. Missing files are flagged. Voice sounds resolve per locale.
	</p>

	<!-- Controls bar -->
	<div class="mb-10 flex flex-wrap items-center gap-6 rounded-lg border border-border bg-card p-4">
		<button
			onclick={() => settings.update((s) => ({ ...s, muted: !s.muted }))}
			class="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-background"
		>
			{#if $settings.muted}
				<VolumeX size={16} /> Muted
			{:else}
				<Volume2 size={16} /> On
			{/if}
		</button>

		<div class="flex items-center gap-2 text-sm">
			<span class="text-muted-foreground">Locale</span>
			<div class="flex overflow-hidden rounded-md border border-border text-xs">
				{#each locales as loc}
					<button
						onclick={() => locale.set(loc)}
						class="px-3 py-1.5 uppercase transition-colors {$locale === loc
							? 'bg-foreground text-background'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						{loc}
					</button>
				{/each}
			</div>
		</div>
	</div>

	{#each groups as group}
		<section class="mb-12">
			<h2 class="mb-4 text-lg font-semibold">{group.label}</h2>
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each group.items as [name, def]}
					{@const path = soundFile(def, $locale)}
					{@const key = keyOf(group.label, name)}
					{@const ok = available[path]}
					<div class="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3">
						<div class="flex items-center justify-between gap-3">
							<div class="flex min-w-0 flex-col">
								<span class="truncate text-sm font-medium">{name}</span>
								<span class="truncate font-mono text-[10px] text-muted-foreground">{path}</span>
							</div>
							<div class="flex shrink-0 items-center gap-2">
								{#if ok === false}
									<span class="rounded bg-destructive/15 px-1.5 py-0.5 font-mono text-[10px] text-destructive">missing</span>
								{/if}
								<button
									onclick={() => play(key, def)}
									class="rounded-md bg-primary p-2 text-white transition-opacity hover:opacity-90"
									aria-label="Play {name}"
								>
									<Play size={14} />
								</button>
								<button
									onclick={() => toggleLoop(key, def)}
									class="rounded-md border p-2 transition-colors hover:bg-background {stoppers[key] ? 'border-primary text-primary' : ''}"
									aria-label="Loop {name}"
								>
									{#if stoppers[key]}
										<Square size={14} />
									{:else}
										<Repeat size={14} />
									{/if}
								</button>
							</div>
						</div>
						<label class="flex items-center gap-2">
							<span class="font-mono text-[10px] text-muted-foreground">gain</span>
							<input
								type="range"
								min="0"
								max="1"
								step="0.05"
								value={gains[key]}
								oninput={(e) => (gains[key] = e.currentTarget.valueAsNumber)}
								class="flex-1 accent-primary"
							/>
							<span class="w-7 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
								{gains[key].toFixed(2)}
							</span>
						</label>
					</div>
				{/each}
			</div>
		</section>
	{/each}
</main>
