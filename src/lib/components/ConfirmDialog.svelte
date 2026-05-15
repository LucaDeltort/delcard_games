<script lang="ts">
import { AlertDialog } from 'bits-ui'
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

let confirming = false

function handleOpenChange(v: boolean) {
	if (v) return
	if (confirming) {
		confirming = false
		return
	}
	onCancel()
}

function handleConfirm() {
	confirming = true
	onConfirm()
}
</script>

<AlertDialog.Root {open} onOpenChange={handleOpenChange}>
	<AlertDialog.Portal>
		<AlertDialog.Overlay class="fixed inset-0 z-60 bg-black/40" />
		<AlertDialog.Content
			class="fixed inset-0 z-60 flex items-end justify-center px-4 pb-8 focus:outline-none sm:items-center sm:pb-0"
		>
			<div
				class="flex w-full max-w-xs flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-xl"
			>
				<AlertDialog.Title class="sr-only">{$t('common.confirm')}</AlertDialog.Title>
				<AlertDialog.Description class="text-sm text-foreground">{message}</AlertDialog.Description>
				<div class="flex gap-2">
					<AlertDialog.Cancel>
						{#snippet child({ props })}
							<Button {...props} variant="outline" class="flex-1">
								{cancelLabel ?? $t('common.cancel')}
							</Button>
						{/snippet}
					</AlertDialog.Cancel>
					<AlertDialog.Action onclick={handleConfirm}>
						{#snippet child({ props })}
							<Button {...props} class="flex-1">
								{confirmLabel ?? $t('common.confirm')}
							</Button>
						{/snippet}
					</AlertDialog.Action>
				</div>
			</div>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
