<script lang="ts">
import { untrack } from 'svelte'

export type EntryAnim =
	| 'slideDown'
	| 'fadeScale'
	| 'letterStagger'
	| 'rollIn'
	| 'glitch'
	| 'flipDown'
	| 'bigEntrance'
export type ExitAnim = 'fadeOut' | 'slideUp' | 'explode' | 'shrink' | 'blur'
export type RotAnim = 'none' | 'sway' | 'wobble' | 'tilt'
export type SizeAnim = 'none' | 'pulse' | 'breathe'
export type ColorProp =
	| 'default'
	| 'purple'
	| 'blue'
	| 'cyan'
	| 'green'
	| 'yellow'
	| 'orange'
	| 'red'
	| 'pink'
	| 'neon-purple'
	| 'neon-blue'
	| 'neon-cyan'
	| 'neon-green'
	| 'neon-yellow'
	| 'neon-orange'
	| 'neon-red'
	| 'neon-pink'
	| 'rainbow'
	| 'fire'
	| 'plasma'
	| 'gold'
	| 'glitch-color'

const colorMap = {
	purple: '#BF35F2',
	blue: '#002FA7',
	cyan: '#1BF2F9',
	green: '#3FF328',
	yellow: '#F4E72F',
	orange: '#FF8228',
	red: '#F73333',
	pink: '#F67CA2'
} as const

let {
	title,
	entry = 'slideDown' as EntryAnim,
	exit = 'fadeOut' as ExitAnim,
	rotation = 'sway' as RotAnim,
	size = 'breathe' as SizeAnim,
	color = 'default' as ColorProp,
	show = true
}: {
	title: string
	entry?: EntryAnim
	exit?: ExitAnim
	rotation?: RotAnim
	size?: SizeAnim
	color?: ColorProp
	show?: boolean
} = $props()

const letters = $derived(title.split('').map((c, i) => ({ char: c === ' ' ? ' ' : c, i })))

let visible = $state(untrack(() => show))
let isExiting = $state(false)
let contentKey = $state(0)

$effect(() => {
	if (show) {
		isExiting = false
		if (!visible) {
			contentKey++
			visible = true
		}
	} else if (visible && !isExiting) {
		isExiting = true
	}
})

function onExitEnd(e: AnimationEvent) {
	if (isExiting && e.target === e.currentTarget && e.animationName.startsWith('exit-')) {
		visible = false
		isExiting = false
	}
}

const rotClass = $derived(
	rotation === 'none' ? '' : rotation === 'tilt' ? 'anim-tilt' : `anim-rot-${rotation}`
)
const sizeClass = $derived(size === 'none' ? '' : `anim-size-${size}`)
const entryClass = $derived(entry !== 'letterStagger' ? `anim-entry-${entry}` : '')
const exitClass = $derived(isExiting ? `anim-exit-${exit}` : '')

const colorStyle = $derived.by((): string => {
	if (color === 'default') return ''
	const base = color.replace('neon-', '') as keyof typeof colorMap
	const hex = colorMap[base]
	if (!hex) return ''
	if (color.startsWith('neon-'))
		return `color: ${hex}; text-shadow: 0 0 8px ${hex}, 0 0 20px ${hex}, 0 0 40px ${hex}`
	return `color: ${hex}`
})
const colorClass = $derived(
	['rainbow', 'fire', 'plasma', 'gold', 'glitch-color'].includes(color) ? `anim-color-${color}` : ''
)
const isGradientColor = $derived(['rainbow', 'fire', 'plasma', 'gold'].includes(color))
</script>

{#if visible}
	<div class="flex justify-center {rotClass}">
		<div class={sizeClass}>
			{#key contentKey}
				<div class="{entryClass} {exitClass}" onanimationend={onExitEnd}>
					<h1 class="font-heading text-7xl uppercase tracking-widest {colorClass}" style={colorStyle}>
						{#if entry === 'letterStagger'}
							{#each letters as { char, i } (i)}
								<span
									class="anim-letter-in {isGradientColor ? colorClass : ''}"
									style="display: inline-block; animation-delay: {i * 0.06}s">{char}</span
								>
							{/each}
						{:else}
							{title}
						{/if}
					</h1>
				</div>
			{/key}
		</div>
	</div>
{/if}

<style>
	/* ── Entry ── */
	@keyframes entry-slide-down {
		from {
			transform: translateY(-120px);
			opacity: 0;
		}
		to {
			transform: none;
			opacity: 1;
		}
	}
	@keyframes entry-fade-scale {
		from {
			transform: scale(0.5);
			opacity: 0;
		}
		to {
			transform: none;
			opacity: 1;
		}
	}
	@keyframes entry-roll-in {
		from {
			transform: translateX(-200px) rotate(-15deg);
			opacity: 0;
		}
		to {
			transform: none;
			opacity: 1;
		}
	}
	@keyframes entry-glitch {
		0% {
			transform: translateX(-8px);
			opacity: 0;
			filter: hue-rotate(180deg);
		}
		20% {
			transform: translateX(6px);
			opacity: 0.5;
			filter: hue-rotate(90deg);
		}
		40% {
			transform: translateX(-4px);
			opacity: 0.7;
			filter: hue-rotate(45deg);
		}
		60% {
			transform: translateX(3px);
			opacity: 0.85;
			filter: none;
		}
		80% {
			transform: translateX(-1px);
			opacity: 0.95;
		}
		100% {
			transform: none;
			opacity: 1;
		}
	}
	@keyframes entry-flip-down {
		from {
			transform: perspective(600px) rotateX(-90deg);
			opacity: 0;
		}
		to {
			transform: none;
			opacity: 1;
		}
	}
	@keyframes letter-in {
		from {
			transform: translateY(60px);
			opacity: 0;
		}
		to {
			transform: none;
			opacity: 1;
		}
	}

	.anim-entry-slideDown {
		animation: entry-slide-down 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
	.anim-entry-fadeScale {
		animation: entry-fade-scale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
	.anim-entry-rollIn {
		animation: entry-roll-in 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
	}
	.anim-entry-glitch {
		animation: entry-glitch 0.6s steps(5, end) both;
	}
	.anim-entry-flipDown {
		animation: entry-flip-down 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
	@keyframes entry-big-entrance {
		0% {
			transform: scale(1.8);
			opacity: 0;
		}
		60% {
			transform: scale(0.94);
			opacity: 1;
		}
		100% {
			transform: none;
			opacity: 1;
		}
	}
	.anim-entry-bigEntrance {
		animation: entry-big-entrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
	.anim-letter-in {
		animation: letter-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}
	/* compound: run letter-in + color-sweep together (higher specificity wins over single-class) */
	.anim-letter-in.anim-color-rainbow {
		animation: letter-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both, color-sweep 3s linear infinite;
	}
	.anim-letter-in.anim-color-fire {
		animation: letter-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both,
			color-sweep 2s ease-in-out infinite;
	}
	.anim-letter-in.anim-color-plasma {
		animation: letter-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both,
			color-sweep 2.5s ease-in-out infinite;
	}
	.anim-letter-in.anim-color-gold {
		animation: letter-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both,
			color-sweep 2.5s ease-in-out infinite;
	}

	/* ── Exit — defined after entries so cascade overrides ── */
	@keyframes exit-fade {
		to {
			opacity: 0;
		}
	}
	@keyframes exit-slide-up {
		to {
			transform: translateY(-100px);
			opacity: 0;
		}
	}
	@keyframes exit-explode {
		to {
			transform: scale(2.5);
			opacity: 0;
		}
	}
	@keyframes exit-shrink {
		to {
			transform: scale(0);
			opacity: 0;
		}
	}
	@keyframes exit-blur {
		to {
			filter: blur(20px);
			opacity: 0;
		}
	}

	.anim-exit-fadeOut {
		animation: exit-fade 0.3s ease-in forwards;
	}
	.anim-exit-slideUp {
		animation: exit-slide-up 0.4s cubic-bezier(0.55, 0, 1, 0.45) forwards;
	}
	.anim-exit-explode {
		animation: exit-explode 0.4s cubic-bezier(0.55, 0, 1, 0.45) forwards;
	}
	.anim-exit-shrink {
		animation: exit-shrink 0.3s cubic-bezier(0.55, 0, 1, 0.45) forwards;
	}
	.anim-exit-blur {
		animation: exit-blur 0.4s ease-in forwards;
	}

	/* ── Rotation (infinite) ── */
	@keyframes rot-sway {
		0%,
		100% {
			transform: rotate(-4deg);
		}
		50% {
			transform: rotate(4deg);
		}
	}
	@keyframes rot-wobble {
		0%,
		100% {
			transform: none;
		}
		15% {
			transform: translateX(-8px) rotate(-3deg);
		}
		30% {
			transform: translateX(6px) rotate(2deg);
		}
		45% {
			transform: translateX(-4px) rotate(-1.5deg);
		}
		60% {
			transform: translateX(3px) rotate(1deg);
		}
		75% {
			transform: translateX(-2px);
		}
	}

	.anim-rot-sway {
		animation: rot-sway 3s ease-in-out infinite;
	}
	.anim-rot-wobble {
		animation: rot-wobble 1.4s ease-in-out infinite;
	}
	.anim-tilt {
		transform: rotate(2deg);
	}

	/* ── Size ── */
	@keyframes size-pulse {
		0%,
		100% {
			transform: scale(1);
		}
		14% {
			transform: scale(1.1);
		}
		28% {
			transform: scale(1);
		}
		42% {
			transform: scale(1.06);
		}
		56% {
			transform: scale(1);
		}
	}
	@keyframes size-breathe {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.05);
		}
	}
	.anim-size-pulse {
		animation: size-pulse 2.2s ease-in-out infinite;
	}
	.anim-size-breathe {
		animation: size-breathe 4s ease-in-out infinite;
	}

	/* ── Color ── */
	@keyframes color-sweep {
		from {
			background-position: 0% 50%;
		}
		to {
			background-position: 200% 50%;
		}
	}

	.anim-color-rainbow {
		background: linear-gradient(
			90deg,
			#f73333,
			#ff8228,
			#f4e72f,
			#3ff328,
			#1bf2f9,
			#002fa7,
			#bf35f2,
			#f67ca2,
			#f73333
		);
		background-size: 300% 100%;
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		color: transparent;
		animation: color-sweep 3s linear infinite;
	}
	.anim-color-fire {
		background: linear-gradient(90deg, #f4e72f, #ff8228, #f73333, #ff8228, #f4e72f);
		background-size: 300% 100%;
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		color: transparent;
		animation: color-sweep 2s ease-in-out infinite;
	}
	.anim-color-plasma {
		background: linear-gradient(90deg, #bf35f2, #002fa7, #1bf2f9, #002fa7, #bf35f2);
		background-size: 300% 100%;
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		color: transparent;
		animation: color-sweep 2.5s ease-in-out infinite;
	}
	.anim-color-gold {
		background: linear-gradient(90deg, #b8860b 0%, #ffd700 30%, #fffacd 50%, #ffd700 70%, #b8860b 100%);
		background-size: 300% 100%;
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		color: transparent;
		animation: color-sweep 2.5s ease-in-out infinite;
	}

	@keyframes color-glitch {
		0% {
			filter: hue-rotate(0deg);
		}
		20% {
			filter: hue-rotate(120deg);
		}
		40% {
			filter: hue-rotate(240deg);
		}
		60% {
			filter: hue-rotate(60deg);
		}
		80% {
			filter: hue-rotate(300deg);
		}
		100% {
			filter: hue-rotate(0deg);
		}
	}
	.anim-color-glitch-color {
		color: hsl(0, 100%, 60%);
		animation: color-glitch 0.5s steps(5, end) infinite;
	}
</style>
