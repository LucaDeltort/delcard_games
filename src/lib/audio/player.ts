// WebAudio sound player. Decode each file once into an AudioBuffer, then spawn
// a fresh BufferSourceNode per play -> unlimited overlap, no clones, no leaks.
//
// Localized sounds resolve per current locale, so buffers are keyed by the
// resolved file path (not SoundId) — switching language picks the right file.
//
// Mute (settings.muted) is an on/off gate at play time.
// Browsers block audio until a user gesture: call unlockAudio() on first click.

import { get } from 'svelte/store'
import { browser } from '$app/environment'
import { locale } from '$lib/i18n'
import { settings } from '$lib/stores/settings'
import { ALL_SOUNDS, type SoundDef, soundFile } from './sounds'

let ctx: AudioContext | null = null
const buffers = new Map<string, AudioBuffer>() // path -> buffer
const loading = new Map<string, Promise<AudioBuffer | null>>()

function ensureCtx(): AudioContext | null {
	if (!browser) return null
	if (!ctx) ctx = new AudioContext()
	return ctx
}

function pathFor(s: SoundDef): string {
	return soundFile(s, get(locale))
}

async function loadBuffer(path: string): Promise<AudioBuffer | null> {
	if (buffers.has(path)) return buffers.get(path)!
	const existing = loading.get(path)
	if (existing) return existing
	const ac = ensureCtx()
	if (!ac) return null
	const p = fetch(path)
		.then((r) => r.arrayBuffer())
		.then((b) => ac.decodeAudioData(b))
		.then((buf) => {
			buffers.set(path, buf)
			loading.delete(path)
			return buf
		})
		.catch(() => {
			loading.delete(path)
			return null
		})
	loading.set(path, p)
	return p
}

/** Resume the AudioContext. Call from a user gesture (click) once. */
export function unlockAudio() {
	const ac = ensureCtx()
	if (ac && ac.state === 'suspended')
		ac.resume().catch(() => {
			// no gesture yet — will retry on next unlock
		})
}

/** Warm the buffer cache for the current locale. */
export function preloadSounds(sounds: SoundDef[] = ALL_SOUNDS) {
	for (const s of sounds) loadBuffer(pathFor(s))
}

/**
 * Connect src to destination directly (gain=1) or via a GainNode.
 * Extracted to avoid duplicating the wiring in start() and playSoundUntilEnd().
 */
function wireGain(ac: AudioContext, src: AudioBufferSourceNode, gain: number): void {
	if (gain === 1) {
		src.connect(ac.destination)
	} else {
		const g = ac.createGain()
		g.gain.value = gain
		src.connect(g).connect(ac.destination)
	}
}

function start(path: string, loop: boolean, gain: number): AudioBufferSourceNode | null {
	const ac = ensureCtx()
	if (!ac) return null
	const buf = buffers.get(path)
	if (!buf) {
		// Not decoded yet: load, then fire once ready (skip if looping race).
		loadBuffer(path).then((b) => {
			if (b && !loop && !get(settings).muted) start(path, false, gain)
		})
		return null
	}
	const src = ac.createBufferSource()
	src.buffer = buf
	src.loop = loop
	wireGain(ac, src, gain)
	src.start()
	return src
}

/**
 * Play a one-shot. Overlaps freely with itself and other sounds.
 * @param volume optional 0..1 override of the sound's baseline gain.
 */
export function playSound(s: SoundDef, volume?: number): void {
	if (get(settings).muted) return
	start(pathFor(s), false, volume ?? s.gain)
}

/**
 * Play a looping sound. Returns a stop() function.
 * @param volume optional 0..1 override of the sound's baseline gain.
 */
export function playLoop(s: SoundDef, volume?: number): () => void {
	if (get(settings).muted) {
		return () => {
			// nothing playing — stop() is a no-op
		}
	}
	const src = start(pathFor(s), true, volume ?? s.gain)
	return () => {
		try {
			src?.stop()
		} catch {
			// already stopped
		}
	}
}

/**
 * Play a one-shot and resolve when its audio finishes — so callers can chain
 * cues with no overlap regardless of clip length. Resolves immediately if
 * muted, missing, or audio is unavailable.
 * @param volume optional 0..1 override of the sound's baseline gain.
 */
export function playSoundUntilEnd(s: SoundDef, volume?: number): Promise<void> {
	return new Promise((resolve) => {
		if (get(settings).muted) {
			resolve()
			return
		}
		const ac = ensureCtx()
		if (!ac || ac.state === 'suspended') {
			// Context suspended (no user gesture yet): onended would never fire,
			// so resolve immediately rather than stalling the narration chain.
			resolve()
			return
		}
		loadBuffer(pathFor(s))
			.then((buf) => {
				if (!buf || get(settings).muted) {
					resolve() // missing file or muted mid-load — skip
					return
				}
				const src = ac.createBufferSource()
				src.buffer = buf
				wireGain(ac, src, volume ?? s.gain)
				src.onended = () => resolve()
				src.start()
			})
			.catch(() => resolve())
	})
}
