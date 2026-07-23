<script lang="ts">
import { AlertTriangle, WifiOff } from 'lucide-svelte'
import { t } from '$lib/i18n'

type Props = {
	quality?: 'good' | 'warn' | 'poor' | null
	migrating?: boolean
	reconnecting?: boolean
}

let { quality = null, migrating = false, reconnecting = false }: Props = $props()

const showBanner = $derived(quality === 'warn' || quality === 'poor' || migrating)
</script>

{#if showBanner}
	<div
		class="fixed inset-x-0 top-0 z-40 flex items-center justify-center gap-2 px-4 py-1.5 text-sm text-white {migrating
			? 'bg-yellow-500/90'
			: quality === 'poor'
				? 'bg-red-500/90'
				: 'bg-yellow-500/80'}"
	>
		{#if migrating}
			<AlertTriangle size={14} />
			<span>{$t('network.migrating')}</span>
		{:else if quality === 'poor'}
			<WifiOff size={14} />
			<span>{$t('network.quality.poor')}</span>
		{:else}
			<AlertTriangle size={14} />
			<span>{$t('network.quality.warn')}</span>
		{/if}
	</div>
{/if}
