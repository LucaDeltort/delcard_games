export type OptionSchema =
	| {
			key: string
			label: string
			description?: string
			type: 'boolean'
			default: boolean
			disabledIf?: string
			disabledWhen?: { key: string; value: unknown }
	  }
	| {
			key: string
			label: string
			description?: string
			type: 'select'
			default: string
			choices: { value: string; label: string }[]
			disabledWhen?: { key: string; value: unknown }
	  }
	| {
			key: string
			label: string
			description?: string
			type: 'number'
			default: number
			min: number
			max: number
			step?: number
			disabledWhen?: { key: string; value: unknown }
	  }

export function defaultOptions(schema: OptionSchema[]): Record<string, unknown> {
	return Object.fromEntries(schema.map((s) => [s.key, s.default]))
}
