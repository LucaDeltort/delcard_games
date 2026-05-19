<script lang="ts">
import type {
	ColorProp,
	EntryAnim,
	ExitAnim,
	RotAnim,
	SizeAnim
} from '$lib/components/GameTitle.svelte'
import GameTitle from '$lib/components/GameTitle.svelte'

// --- Interactive ---
let iTitle = $state('BATTLE')
let iEntry = $state<EntryAnim>('slideDown')
let iExit = $state<ExitAnim>('fadeOut')
let iRot = $state<RotAnim>('sway')
let iSize = $state<SizeAnim>('breathe')
let iColor = $state<ColorProp>('rainbow')
let iShow = $state(true)

function replay() {
	iShow = false
	setTimeout(() => (iShow = true), 400)
}

let copied = $state(false)
async function copyParams() {
	const title = (iTitle || 'BATTLE').replace(/\\/g, '\\\\').replace(/"/g, '\\"')
	const snippet = `<GameTitle title="${title}" entry="${iEntry}" exit="${iExit}" rotation="${iRot}" size="${iSize}" color="${iColor}" />`
	try {
		await navigator.clipboard.writeText(snippet)
		copied = true
		setTimeout(() => (copied = false), 1500)
	} catch {
		// clipboard unavailable (non-secure context or denied permission)
	}
}

// --- Grid data ---
const entries: EntryAnim[] = [
	'slideDown',
	'fadeScale',
	'letterStagger',
	'rollIn',
	'glitch',
	'flipDown',
	'bigEntrance'
]
const exits: ExitAnim[] = ['fadeOut', 'slideUp', 'explode', 'shrink', 'blur']
const rots: RotAnim[] = ['none', 'sway', 'wobble', 'tilt']
const sizes: SizeAnim[] = ['none', 'pulse', 'breathe']
const colorsSolid: ColorProp[] = [
	'purple',
	'blue',
	'cyan',
	'green',
	'yellow',
	'orange',
	'red',
	'pink'
]
const colorsNeon: ColorProp[] = [
	'neon-purple',
	'neon-blue',
	'neon-cyan',
	'neon-green',
	'neon-yellow',
	'neon-orange',
	'neon-red',
	'neon-pink'
]
const colorsAnimated: ColorProp[] = ['rainbow', 'fire', 'plasma', 'gold', 'glitch-color']

let entryKeys = $state(entries.map(() => 0))
let exitShows = $state(exits.map(() => true))
let exitKeys = $state(exits.map(() => 0))

function replayEntry(i: number) {
	entryKeys[i]++
}

function triggerExit(i: number) {
	exitShows[i] = false
}

function resetExit(i: number) {
	exitKeys[i]++
	exitShows[i] = true
}
</script>

<main class="min-h-dvh bg-background p-8 text-foreground">
	<h1 class="font-heading mb-2 text-4xl">GameTitle</h1>
	<p class="mb-12 text-sm text-muted-foreground">
		<a href="/lab" class="underline">← lab</a>
	</p>

	<!-- Interactive -->
	<section class="mb-16">
		<h2 class="font-heading mb-6 text-2xl uppercase tracking-widest text-muted-foreground">
			Interactive
		</h2>
		<div class="mb-6 flex flex-wrap gap-4 text-sm">
			<label class="flex flex-col gap-1">
				<span class="text-muted-foreground">title</span>
				<input
					bind:value={iTitle}
					class="rounded border border-border bg-card px-2 py-1 uppercase"
					placeholder="BATTLE"
				/>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-muted-foreground">entry</span>
				<select bind:value={iEntry} class="rounded border border-border bg-card px-2 py-1">
					{#each entries as e}<option value={e}>{e}</option>{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-muted-foreground">exit</span>
				<select bind:value={iExit} class="rounded border border-border bg-card px-2 py-1">
					{#each exits as e}<option value={e}>{e}</option>{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-muted-foreground">rotation</span>
				<select bind:value={iRot} class="rounded border border-border bg-card px-2 py-1">
					{#each rots as r}<option value={r}>{r}</option>{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-muted-foreground">size</span>
				<select bind:value={iSize} class="rounded border border-border bg-card px-2 py-1">
					{#each sizes as s}<option value={s}>{s}</option>{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-muted-foreground">color</span>
				<select bind:value={iColor} class="rounded border border-border bg-card px-2 py-1">
					<option value="default">default</option>
					<optgroup label="solid">
						{#each colorsSolid as c}<option value={c}>{c}</option>{/each}
					</optgroup>
					<optgroup label="neon">
						{#each colorsNeon as c}<option value={c}>{c}</option>{/each}
					</optgroup>
					<optgroup label="animated">
						{#each colorsAnimated as c}<option value={c}>{c}</option>{/each}
					</optgroup>
				</select>
			</label>
		</div>
		<div class="mb-4 flex gap-3">
			<button
				onclick={replay}
				class="rounded border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-secondary"
			>
				↺ Replay entry
			</button>
			<button
				onclick={() => (iShow = !iShow)}
				class="rounded border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-secondary"
			>
				{iShow ? '← Trigger exit' : '→ Trigger entry'}
			</button>
			<button
				onclick={copyParams}
				class="rounded border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-secondary"
			>
				{copied ? '✓ Copied' : '⧉ Copy'}
			</button>
		</div>
		<div class="flex h-40 items-center justify-center rounded-lg border border-border bg-card">
			<GameTitle
				title={iTitle || 'BATTLE'}
				entry={iEntry}
				exit={iExit}
				rotation={iRot}
				size={iSize}
				color={iColor}
				show={iShow}
			/>
		</div>
	</section>

	<!-- Entry animations -->
	<section class="mb-16">
		<h2 class="font-heading mb-6 text-2xl uppercase tracking-widest text-muted-foreground">
			Entry
		</h2>
		<div class="grid grid-cols-2 gap-4 md:grid-cols-3">
			{#each entries as anim, i}
				<div class="flex flex-col gap-2">
					<div class="flex h-32 items-center justify-center rounded-lg border border-border bg-card">
						{#key entryKeys[i]}
							<GameTitle title="WAR" entry={anim} rotation="none" size="none" />
						{/key}
					</div>
					<div class="flex items-center justify-between">
						<span class="font-mono text-xs text-muted-foreground">{anim}</span>
						<button
							onclick={() => replayEntry(i)}
							class="rounded border border-border px-2 py-0.5 text-xs transition-colors hover:bg-secondary"
							>↺</button
						>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Exit animations -->
	<section class="mb-16">
		<h2 class="font-heading mb-6 text-2xl uppercase tracking-widest text-muted-foreground">
			Exit
		</h2>
		<div class="grid grid-cols-2 gap-4 md:grid-cols-3">
			{#each exits as anim, i}
				<div class="flex flex-col gap-2">
					<div class="flex h-32 items-center justify-center rounded-lg border border-border bg-card">
						{#key exitKeys[i]}
							<GameTitle title="WAR" exit={anim} rotation="none" size="none" show={exitShows[i]} />
						{/key}
					</div>
					<div class="flex items-center justify-between">
						<span class="font-mono text-xs text-muted-foreground">{anim}</span>
						<div class="flex gap-1">
							<button
								onclick={() => triggerExit(i)}
								class="rounded border border-border px-2 py-0.5 text-xs transition-colors hover:bg-secondary"
								>exit</button
							>
							<button
								onclick={() => resetExit(i)}
								class="rounded border border-border px-2 py-0.5 text-xs transition-colors hover:bg-secondary"
								>↺</button
							>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Rotation animations -->
	<section class="mb-16">
		<h2 class="font-heading mb-6 text-2xl uppercase tracking-widest text-muted-foreground">
			Rotation
		</h2>
		<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
			{#each rots as anim}
				<div class="flex flex-col gap-2">
					<div
						class="flex h-32 items-center justify-center overflow-hidden rounded-lg border border-border bg-card"
					>
						<GameTitle title="ACE" rotation={anim} size="none" entry="fadeScale" />
					</div>
					<span class="font-mono text-center text-xs text-muted-foreground">{anim}</span>
				</div>
			{/each}
		</div>
	</section>

	<!-- Size animations -->
	<section class="mb-16">
		<h2 class="font-heading mb-6 text-2xl uppercase tracking-widest text-muted-foreground">
			Size
		</h2>
		<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
			{#each sizes as anim}
				<div class="flex flex-col gap-2">
					<div
						class="flex h-32 items-center justify-center overflow-hidden rounded-lg border border-border bg-card"
					>
						<GameTitle title="ACE" size={anim} rotation="none" entry="fadeScale" />
					</div>
					<span class="font-mono text-center text-xs text-muted-foreground">{anim}</span>
				</div>
			{/each}
		</div>
	</section>

	<!-- Color -->
	<section class="mb-16">
		<h2 class="font-heading mb-6 text-2xl uppercase tracking-widest text-muted-foreground">
			Color
		</h2>
		<p class="mb-4 font-mono text-xs text-muted-foreground">solid</p>
		<div class="mb-8 grid grid-cols-4 gap-4 md:grid-cols-8">
			{#each colorsSolid as c}
				<div class="flex flex-col gap-2">
					<div
						class="flex h-24 items-center justify-center rounded-lg border border-border bg-card"
					>
						<GameTitle title="A" color={c} entry="bigEntrance" rotation="none" size="none" />
					</div>
					<span class="font-mono text-center text-xs text-muted-foreground">{c}</span>
				</div>
			{/each}
		</div>
		<p class="mb-4 font-mono text-xs text-muted-foreground">neon</p>
		<div class="mb-8 grid grid-cols-4 gap-4 md:grid-cols-8">
			{#each colorsNeon as c}
				<div class="flex flex-col gap-2">
					<div
						class="flex h-24 items-center justify-center rounded-lg border border-border bg-card"
					>
						<GameTitle title="A" color={c} entry="bigEntrance" rotation="none" size="none" />
					</div>
					<span class="font-mono text-center text-xs text-muted-foreground">{c}</span>
				</div>
			{/each}
		</div>
		<p class="mb-4 font-mono text-xs text-muted-foreground">animated</p>
		<div class="grid grid-cols-2 gap-4 md:grid-cols-5">
			{#each colorsAnimated as c}
				<div class="flex flex-col gap-2">
					<div
						class="flex h-32 items-center justify-center rounded-lg border border-border bg-card"
					>
						<GameTitle title="ACE" color={c} entry="bigEntrance" rotation="none" size="none" />
					</div>
					<span class="font-mono text-center text-xs text-muted-foreground">{c}</span>
				</div>
			{/each}
		</div>
	</section>
</main>
