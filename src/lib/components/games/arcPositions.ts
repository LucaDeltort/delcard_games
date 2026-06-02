export function computeArcPositions(
	opponents: string[],
	arcW: number,
	arcH: number
): Array<{ pid: string; left: string; top: string }> {
	const n = opponents.length
	if (n === 0) return []
	const RX = 40
	const RY = 44
	const maxAngle = Math.PI * (165 / 180)
	const minAngle = Math.PI * (15 / 180)
	const pos = (angle: number) => ({
		left: `${50 + RX * Math.cos(angle)}%`,
		top: `${62 - RY * Math.sin(angle)}%`
	})
	if (n === 1) return [{ pid: opponents[0], ...pos(Math.PI / 2) }]
	const w = arcW || 100
	const h = arcH || 100
	const STEPS = 400
	const samples: Array<{ angle: number; len: number }> = []
	let len = 0
	let prev: { x: number; y: number } | null = null
	for (let i = 0; i <= STEPS; i++) {
		const angle = maxAngle - (i / STEPS) * (maxAngle - minAngle)
		const x = (RX / 100) * w * Math.cos(angle)
		const y = (RY / 100) * h * Math.sin(angle)
		if (prev) len += Math.hypot(x - prev.x, y - prev.y)
		samples.push({ angle, len })
		prev = { x, y }
	}
	const total = len
	return opponents.map((pid, i) => {
		const targetLen = (i / (n - 1)) * total
		const s = samples.find((sm) => sm.len >= targetLen) ?? samples[samples.length - 1]
		return { pid, ...pos(s.angle) }
	})
}
