<script lang="ts">
import { Lock } from 'lucide-svelte'
import { onDestroy } from 'svelte'
import { resolveDicePack } from '$lib/dice/registry'
import { dicePacks, resolvePackFor } from '$lib/stores/dicePacks'

let {
	value = 1,
	rolling = false,
	held = false,
	diceSlug = 'd6',
	packId = undefined,
	faceSrcs = undefined
}: {
	value?: 1 | 2 | 3 | 4 | 5 | 6
	rolling?: boolean
	held?: boolean
	diceSlug?: string
	packId?: string // explicit override (lab/testing); otherwise uses dicePacks store
	faceSrcs?: Partial<Record<1 | 2 | 3 | 4 | 5 | 6, string>>
} = $props()

const pack = $derived(
	packId ? resolveDicePack(diceSlug, packId) : resolvePackFor($dicePacks, diceSlug)
)

function faceSrc(face: number): string {
	if (faceSrcs?.[face as 1 | 2 | 3 | 4 | 5 | 6]) return faceSrcs[face as 1 | 2 | 3 | 4 | 5 | 6]!
	const ext = pack?.ext ?? '.svg'
	return `${pack?.basePath ?? '/dice/D6/classic'}/${face}${ext}`
}

let diceEl: HTMLElement | undefined = $state()
let currentAnimation: Animation | null = null

const rotationMap: Record<number, { x: number; y: number }> = {
	1: { x: 0, y: 0 },
	2: { x: 0, y: -90 },
	3: { x: -90, y: 0 },
	4: { x: 90, y: 0 },
	5: { x: 0, y: 90 },
	6: { x: 0, y: 180 }
}

function cubeTransform(x: number, y: number): string {
	return `rotateX(${x}deg) rotateY(${y}deg)`
}

function randBetween(lo: number, hi: number): number {
	return lo + Math.floor(Math.random() * (hi - lo))
}

$effect(() => {
	if (!diceEl) return

	const { x, y } = rotationMap[value]

	if (!rolling) {
		currentAnimation?.cancel()
		currentAnimation = null
		diceEl.style.transform = cubeTransform(x, y)
		return
	}

	const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
	if (prefersReduced) {
		currentAnimation?.cancel()
		currentAnimation = null
		diceEl.style.transform = cubeTransform(x, y)
		return
	}

	const currentTransform = diceEl.style.transform || cubeTransform(x, y)
	currentAnimation?.cancel()

	const keyframes: Keyframe[] = [
		{ transform: currentTransform, offset: 0 },
		{
			transform: cubeTransform(randBetween(90, 180), randBetween(90, 180)),
			offset: 0.35,
			easing: 'ease-in'
		},
		{
			transform: cubeTransform(randBetween(180, 360), randBetween(180, 360)),
			offset: 0.7,
			easing: 'ease-out'
		},
		{ transform: cubeTransform(x, y), offset: 1.0 }
	]

	currentAnimation = diceEl.animate(keyframes, {
		duration: 1200,
		easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
		fill: 'forwards'
	})

	return () => {
		currentAnimation?.cancel()
		currentAnimation = null
	}
})

onDestroy(() => {
	currentAnimation?.cancel()
})
</script>

<div
	class="dice-scene"
	class:held
	role="img"
	aria-label="Die showing {value}"
	aria-live="polite"
>
	<div class="dice-cube" bind:this={diceEl}>
		{#each [1, 2, 3, 4, 5, 6] as face (face)}
			<div class="face face-{face}">
				<img src={faceSrc(face)} alt="" width="60" height="60" draggable="false" />
			</div>
		{/each}
	</div>

	{#if held}
		<div class="held-badge">
			<Lock size={12} />
		</div>
	{/if}
</div>

<style>
	.dice-scene {
		position: relative;
		width: 60px;
		height: 60px;
		perspective: 200px;
		transition: box-shadow 200ms ease;
	}

	.dice-scene.held {
		box-shadow:
			0 0 0 3px var(--accent),
			0 0 12px color-mix(in oklch, var(--accent) 50%, transparent);
	}

	.dice-cube {
		width: 60px;
		height: 60px;
		position: relative;
		transform-style: preserve-3d;
	}

	.face {
		position: absolute;
		width: 60px;
		height: 60px;
		border-radius: 8px;
		overflow: hidden;
		backface-visibility: hidden;
		background: #002fa7;
	}

	.face img {
		display: block;
		width: 60px;
		height: 60px;
		pointer-events: none;
		user-select: none;
	}

	.face-1 {
		transform: translateZ(30px);
	}
	.face-2 {
		transform: rotateY(90deg) translateZ(30px);
	}
	.face-3 {
		transform: rotateX(90deg) translateZ(30px);
	}
	.face-4 {
		transform: rotateX(-90deg) translateZ(30px);
	}
	.face-5 {
		transform: rotateY(-90deg) translateZ(30px);
	}
	.face-6 {
		transform: rotateY(180deg) translateZ(30px);
	}

	.held-badge {
		position: absolute;
		bottom: -6px;
		right: -6px;
		z-index: 10;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--accent);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
