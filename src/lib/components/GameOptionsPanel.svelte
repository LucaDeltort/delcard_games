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
				{#if opt.type === 'boolean'}
					{@const active = options[opt.key] === true}
					{@const depDisabled = opt.disabledIf ? options[opt.disabledIf] !== true : false}
					<div class="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 {depDisabled ? 'opacity-40' : ''}">
						<div class="flex flex-col gap-0.5">
							<span class="text-sm text-foreground">{$t(opt.label)}</span>
							{#if opt.description}
								<span class="text-xs text-muted-foreground">{$t(opt.description)}</span>
							{/if}
						</div>
						<button
							onclick={() => isHost && !depDisabled && onChange(opt.key, !active)}
							disabled={!isHost || depDisabled}
							class="ml-4 shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors
								{active && !depDisabled
									? 'bg-primary text-primary-foreground'
									: 'bg-secondary text-muted-foreground'}
								{isHost && !depDisabled ? 'cursor-pointer hover:opacity-80' : 'cursor-default opacity-60'}"
							aria-pressed={active}
						>
							{active && !depDisabled ? 'ON' : 'OFF'}
						</button>
					</div>
				{/if}
			{/each}
		</div>
	</div>
{/if}
