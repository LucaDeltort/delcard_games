<script lang="ts">
import { locale } from '$lib/i18n'
</script>

<button
	onclick={() => locale.update((l) => (l === 'fr' ? 'en' : 'fr'))}
	class="fixed top-4 right-4 z-50 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
>
	{$locale === 'fr' ? 'EN' : 'FR'}
</button>
