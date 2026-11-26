<script lang="ts">
import { ArrowLeft, ChevronRight } from 'lucide-svelte'
import Seo from '$lib/components/Seo.svelte'
import { gameList } from '$lib/games/index'
import { playerRange } from '$lib/games/seo'
import { t } from '$lib/i18n'
</script>

<Seo
	title="Online Card & Dice Games to Play with Friends | Delcard"
	description="All Delcard games and their rules: War, Presidents, Werewolf, Blackjack, Yams and more. Play online with friends for free, no sign-up, no download."
	canonical="/games"
	titleFr="Jeux de cartes et de dés en ligne entre amis | Delcard"
	descriptionFr="Tous les jeux Delcard et leurs règles : Bataille, Président, Loup-Garou, Blackjack, Yams et plus. Jouez en ligne entre amis, gratuit, sans inscription."
/>

<div class="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
	<div class="mb-6">
		<a
			href="/"
			class="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<ArrowLeft size={14} />
			{$t('common.backHome')}
		</a>
	</div>

	<h1 class="mb-8 text-2xl tracking-tight">{$t('gamesPage.title')}</h1>

	<div class="flex flex-col gap-3">
		{#each gameList as game}
			<a
				href="/games/{game.id}"
				class="group flex items-center gap-5 rounded-2xl border border-border bg-card px-5 py-4 transition-all hover:border-primary/40 hover:bg-card/80"
			>
				<div class="min-w-0 flex-1">
					<h2 class="font-medium">{$t(`${game.id}.name`)}</h2>
					<p class="mt-1 text-xs text-muted-foreground">{playerRange(game)}&nbsp;{$t('common.players')}</p>
				</div>
				<ChevronRight
					size={16}
					class="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
				/>
			</a>
		{/each}
	</div>
</div>
