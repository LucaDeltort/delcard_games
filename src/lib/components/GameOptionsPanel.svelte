<script lang="ts">
import type { OptionSchema } from '$lib/engine'
import { t } from '$lib/i18n'

let {
	schema,
	options,
	isHost,
	onChange
}: {
	schema: OptionSchema[]
	options: Record<string, unknown>
	isHost: boolean
	onChange: (key: string, value: unknown) => void
} = $props()
</script>

{#if schema.length > 0}
	<div class="w-full">
		<div class="flex flex-col gap-2">
			{#each schema as opt}
				{@const isDisabled =
					!isHost
					|| (opt.disabledWhen != null && options[opt.disabledWhen.key] === opt.disabledWhen.value)
					|| (opt.type === 'boolean' && opt.disabledIf != null && options[opt.disabledIf] !== true)}
				{#if opt.type === 'boolean'}
					{@const active = options[opt.key] === true}
					<div class="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 {isDisabled ? 'opacity-40' : ''}">
						<div class="flex flex-col gap-0.5">
							<span class="text-sm text-foreground">{$t(opt.label)}</span>
							{#if opt.description}
								<span class="text-xs text-muted-foreground">{$t(opt.description)}</span>
							{/if}
						</div>
						<button
							onclick={() => !isDisabled && onChange(opt.key, !active)}
							disabled={isDisabled}
							class="ml-4 shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors
								{active && !isDisabled
									? 'bg-primary text-primary-foreground'
									: 'bg-secondary text-muted-foreground'}
								{isDisabled ? 'cursor-default' : 'cursor-pointer hover:opacity-80'}"
							aria-pressed={active}
						>
							{active && !isDisabled ? 'ON' : 'OFF'}
						</button>
					</div>
				{:else if opt.type === 'number'}
					{@const val = typeof options[opt.key] === 'number' ? (options[opt.key] as number) : opt.default}
					{@const step = opt.step ?? 1}
					<div class="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 {isDisabled ? 'opacity-40' : ''}">
						<div class="flex flex-col gap-0.5">
							<span class="text-sm text-foreground">{$t(opt.label)}</span>
							{#if opt.description}
								<span class="text-xs text-muted-foreground">{$t(opt.description)}</span>
							{/if}
						</div>
						<div class="ml-4 flex shrink-0 items-center gap-2">
							<button
								onclick={() => !isDisabled && val - step >= opt.min && onChange(opt.key, val - step)}
								disabled={isDisabled || val <= opt.min}
								class="flex size-7 items-center justify-center rounded-full bg-secondary text-sm font-bold transition-colors
									{isDisabled || val <= opt.min ? 'cursor-default opacity-40' : 'cursor-pointer hover:opacity-80'}"
							>−</button>
							<span class="w-8 text-center text-sm font-medium tabular-nums">{val}</span>
							<button
								onclick={() => !isDisabled && val + step <= opt.max && onChange(opt.key, val + step)}
								disabled={isDisabled || val >= opt.max}
								class="flex size-7 items-center justify-center rounded-full bg-secondary text-sm font-bold transition-colors
									{isDisabled || val >= opt.max ? 'cursor-default opacity-40' : 'cursor-pointer hover:opacity-80'}"
							>+</button>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</div>
{/if}
