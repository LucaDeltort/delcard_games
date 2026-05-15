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
	<div class="w-full max-w-xs">
		<p class="mb-3 text-xs tracking-widest text-muted-foreground uppercase">
			{$t('game.rules')}
		</p>
		<div class="flex flex-col gap-2">
			{#each schema as opt}
				{#if opt.type === 'boolean'}
					{@const active = options[opt.key] === true}
					<div class="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
						<div class="flex flex-col gap-0.5">
							<span class="text-sm text-foreground">{$t(opt.label)}</span>
							{#if opt.description}
								<span class="text-xs text-muted-foreground">{$t(opt.description)}</span>
							{/if}
						</div>
						<button
							onclick={() => isHost && onChange(opt.key, !active)}
							disabled={!isHost}
							class="ml-4 shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors
								{active
									? 'bg-primary text-primary-foreground'
									: 'bg-secondary text-muted-foreground'}
								{isHost ? 'cursor-pointer hover:opacity-80' : 'cursor-default opacity-60'}"
							aria-pressed={active}
						>
							{active ? 'ON' : 'OFF'}
						</button>
					</div>
				{/if}
			{/each}
		</div>
	</div>
{/if}
