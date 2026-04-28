<script lang="ts">
import { t } from '$lib/i18n'

let {
	name,
	you = false
}: {
	name: string
	you?: boolean
} = $props()
</script>

<p class="text-sm {you ? 'text-foreground' : 'text-muted-foreground'}">
	{name}{#if you}&nbsp;<span class="text-muted-foreground">({$t('common.you')})</span>{/if}
</p>
