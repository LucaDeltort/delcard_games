<script lang="ts">
import { ArrowLeft, Trophy } from 'lucide-svelte'
import StatsContent from '$lib/components/StatsContent.svelte'
import { t } from '$lib/i18n'
</script>

<svelte:head>
	<title>{$t('stats.title')} - Delcard</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8">
	<a
		href="/"
		class="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
	>
		<ArrowLeft size={16} />
		{$t('common.backHome')}
	</a>

	<h1 class="mb-8 flex items-center gap-3 font-heading text-3xl text-foreground">
		<Trophy size={28} />
		{$t('stats.title')}
	</h1>

	<StatsContent />
</div>
