<script lang="ts">
import { locale } from '$lib/i18n'
</script>

<button
	onclick={() => locale.update((l) => (l === 'fr' ? 'en' : 'fr'))}
	class="fixed right-4 z-50 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
	style="top: calc(1rem + env(safe-area-inset-top))"
>
	{$locale === 'fr' ? 'EN' : 'FR'}
</button>
