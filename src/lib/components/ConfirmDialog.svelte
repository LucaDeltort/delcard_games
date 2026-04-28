<script lang="ts">
import { Button } from '$lib/components/ui/button'
import { t } from '$lib/i18n'

let {
	open,
	message,
	confirmLabel,
	cancelLabel,
	onConfirm,
	onCancel
}: {
	open: boolean
	message: string
	confirmLabel?: string
	cancelLabel?: string
	onConfirm: () => void
	onCancel: () => void
} = $props()
</script>

{#if open}
	<button
		class="fixed inset-0 z-60 bg-black/40"
		onclick={onCancel}
		aria-label={cancelLabel ?? $t('common.cancel')}
		tabindex="-1"
	></button>
	<div class="fixed inset-0 z-60 flex items-end justify-center px-4 pb-8 sm:items-center sm:pb-0">
		<div
			class="flex w-full max-w-xs flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-xl"
		>
			<p class="text-sm text-foreground">{message}</p>
			<div class="flex gap-2">
				<Button onclick={onCancel} variant="outline" class="flex-1">
					{cancelLabel ?? $t('common.cancel')}
				</Button>
				<Button onclick={onConfirm} class="flex-1">
					{confirmLabel ?? $t('common.confirm')}
				</Button>
			</div>
		</div>
	</div>
{/if}
