<script lang="ts">
import Dice from '$lib/components/Dice.svelte'

// Single die demo
let value = $state<1 | 2 | 3 | 4 | 5 | 6>(1)
let rolling = $state(false)
let held = $state(false)

function rollOne() {
	if (rolling) return
	value = Math.ceil(Math.random() * 6) as 1 | 2 | 3 | 4 | 5 | 6
	rolling = true
	setTimeout(() => {
		rolling = false
	}, 1200)
}

// 5-dice Yam's demo
type Die = { value: 1 | 2 | 3 | 4 | 5 | 6; rolling: boolean; held: boolean }

let dice = $state<Die[]>([
	{ value: 1, rolling: false, held: false },
	{ value: 2, rolling: false, held: false },
	{ value: 3, rolling: false, held: false },
	{ value: 4, rolling: false, held: false },
	{ value: 5, rolling: false, held: false }
])
let rollsLeft = $state(3)

function rollAll() {
	if (rollsLeft <= 0) return
	rollsLeft--
	dice = dice.map((d) =>
		d.held
			? d
			: { ...d, value: Math.ceil(Math.random() * 6) as 1 | 2 | 3 | 4 | 5 | 6, rolling: true }
	)
	setTimeout(() => {
		dice = dice.map((d) => (d.rolling ? { ...d, rolling: false } : d))
	}, 1200)
}

function toggleHold(i: number) {
	if (rollsLeft === 3) return // must roll first
	dice = dice.map((d, idx) => (idx === i ? { ...d, held: !d.held } : d))
}

function resetYams() {
	dice = dice.map((d) => ({ ...d, held: false, rolling: false }))
	rollsLeft = 3
}

const anyRolling = $derived(dice.some((d) => d.rolling))

// Custom asset folder preview
type FaceSrcs = Partial<Record<1 | 2 | 3 | 4 | 5 | 6, string>>
let customFaceSrcs = $state<FaceSrcs | undefined>(undefined)
let customFolderName = $state<string>('')

function onFolderPick(e: Event) {
	const input = e.currentTarget as HTMLInputElement
	const files = Array.from(input.files ?? [])

	// Revoke previous object URLs
	if (customFaceSrcs) {
		Object.values(customFaceSrcs).forEach((url) => URL.revokeObjectURL(url as string))
	}

	const srcs: FaceSrcs = {}
	for (const file of files) {
		const base = file.name.replace(/\.svg$/i, '')
		const face = parseInt(base, 10) as 1 | 2 | 3 | 4 | 5 | 6
		if (face >= 1 && face <= 6) {
			srcs[face] = URL.createObjectURL(file)
		}
	}

	customFaceSrcs = Object.keys(srcs).length > 0 ? srcs : undefined
	customFolderName = files[0]?.webkitRelativePath.split('/')[0] ?? ''
}

function clearFolder() {
	if (customFaceSrcs) {
		Object.values(customFaceSrcs).forEach((url) => URL.revokeObjectURL(url as string))
	}
	customFaceSrcs = undefined
	customFolderName = ''
}
</script>

<main class="min-h-dvh bg-background p-8 text-foreground">
	<h1 class="font-heading mb-2 text-4xl">Dice</h1>
	<p class="mb-12 text-sm text-muted-foreground">
		<a href="/lab" class="underline">← lab</a>
	</p>

	<!-- Single die -->
	<section class="mb-14">
		<div class="flex items-start justify-between gap-8">
			<div class="flex flex-col gap-6">
				<h2 class="text-lg font-semibold">Single die</h2>
				<div class="flex items-center gap-8">
					<Dice {value} {rolling} {held} faceSrcs={customFaceSrcs} />

					<div class="flex flex-col gap-3">
						<button
							onclick={rollOne}
							disabled={rolling}
							class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
						>
							{rolling ? 'Rolling…' : 'Roll'}
						</button>

						<label class="flex cursor-pointer items-center gap-2 text-sm">
							<input type="checkbox" bind:checked={held} class="accent-pink-400" />
							Held
						</label>

						<div class="flex items-center gap-2 text-sm">
							<span class="text-muted-foreground">Force:</span>
							{#each [1, 2, 3, 4, 5, 6] as v}
								<button
									onclick={() => {
										value = v as 1 | 2 | 3 | 4 | 5 | 6
										rolling = false
									}}
									class="h-7 w-7 rounded border text-xs font-mono transition-colors"
									class:bg-primary={value === v}
									class:text-white={value === v}
								>
									{v}
								</button>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<div class="flex flex-col items-end gap-1">
				<div class="flex items-center gap-2">
					<label class="inline-flex cursor-pointer items-center">
						<span class="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-card">
							{customFolderName ? `📁 ${customFolderName}` : 'Import folder…'}
						</span>
						<input type="file" accept=".svg" webkitdirectory onchange={onFolderPick} class="sr-only" />
					</label>
					{#if customFaceSrcs}
						<button
							onclick={clearFolder}
							class="rounded-md border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
						>
							✕
						</button>
					{/if}
				</div>
				<span class="text-xs text-muted-foreground">Import your custom assets to see the preview</span>
				<span class="text-xs text-muted-foreground">Folder with <code class="font-mono">1.svg</code> – <code class="font-mono">6.svg</code></span>
			</div>
		</div>
	</section>

	<!-- All 6 faces -->
	<section class="mb-14">
		<h2 class="mb-6 text-lg font-semibold">All faces (static)</h2>
		<div class="flex flex-wrap items-end gap-8">
			{#each [1, 2, 3, 4, 5, 6] as v}
				<div class="flex flex-col items-center gap-2">
					<Dice
						value={v as 1 | 2 | 3 | 4 | 5 | 6}
						rolling={false}
						held={false}
						faceSrcs={customFaceSrcs}
					/>
					<span class="font-mono text-xs text-muted-foreground">{v}</span>
				</div>
			{/each}
		</div>
	</section>

	<!-- 5-dice Yam's demo -->
	<section>
		<h2 class="mb-2 text-lg font-semibold">Five dice (Yam's)</h2>
		<p class="mb-6 text-sm text-muted-foreground">Click a die after rolling to hold it.</p>

		<div class="mb-6 flex gap-4">
			{#each dice as die, i}
				<button
					onclick={() => toggleHold(i)}
					disabled={anyRolling || rollsLeft === 3}
					class="cursor-pointer disabled:cursor-default"
					aria-label="Toggle hold die {i + 1}"
				>
					<Dice value={die.value} rolling={die.rolling} held={die.held} faceSrcs={customFaceSrcs} />
				</button>
			{/each}
		</div>

		<div class="flex items-center gap-4">
			<button
				onclick={rollAll}
				disabled={anyRolling || rollsLeft <= 0}
				class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
			>
				{#if anyRolling}
					Rolling…
				{:else if rollsLeft === 3}
					Roll
				{:else}
					Reroll ({rollsLeft} left)
				{/if}
			</button>

			<button
				onclick={resetYams}
				class="rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-card"
			>
				Reset
			</button>

			<span class="text-sm text-muted-foreground">
				{rollsLeft} roll{rollsLeft !== 1 ? 's' : ''} remaining
			</span>
		</div>
	</section>
</main>
