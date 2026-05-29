export function tally(votes: Record<string, string>): Array<[string, number]> {
	const counts: Record<string, number> = {}
	for (const t of Object.values(votes)) counts[t] = (counts[t] ?? 0) + 1
	return Object.entries(counts).sort((a, b) => b[1] - a[1])
}

export function majority(votes: Record<string, string>): string | undefined {
	return tally(votes)[0]?.[0]
}

export function isTie(votes: Record<string, string>): boolean {
	const t = tally(votes)
	return t.length >= 2 && t[0][1] === t[1][1]
}
