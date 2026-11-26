<script lang="ts">
import { ArrowLeft } from 'lucide-svelte'
import { page } from '$app/stores'
import Seo from '$lib/components/Seo.svelte'
import { Button } from '$lib/components/ui/button'
import { gameList, gameRules } from '$lib/games/index'
import { gameNames, playerRange } from '$lib/games/seo'
import { locale, t } from '$lib/i18n'

const id = $derived($page.params.id ?? '')
const game = $derived(gameList.find((g) => g.id === id))
const names = $derived(gameNames(id))
const players = $derived(game ? playerRange(game) : '')
const rules = $derived(gameRules[id]?.[$locale] ?? null)
const others = $derived(gameList.filter((g) => g.id !== id))
</script>

<Seo
	title={game ? `Play ${names.en} Online with Friends, Free | Delcard` : 'Game | Delcard'}
	description={game
		? `Play ${names.en} online with friends: ${players} players, free, no sign-up, no download. Read the rules and start a game in your browser in seconds.`
		: ''}
	canonical="/games/{id}"
	noindex={!game}
	titleFr={game ? `${names.fr} : jouer en ligne entre amis, gratuit | Delcard` : 'Jeu | Delcard'}
	descriptionFr={game
		? `Jouez à ${names.fr} en ligne entre amis : ${players} joueurs, gratuit, sans inscription ni téléchargement. Lisez les règles et lancez une partie.`
		: ''}
/>

<div class="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
	<div class="mb-6">
		<a
			href="/games"
			class="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<ArrowLeft size={14} />
			{$t('gamesPage.title')}
		</a>
	</div>

	{#if game}
		<h1 class="mb-2 text-2xl tracking-tight">{$t('gamesPage.h1', { name: $t(`${id}.name`) })}</h1>
		<p class="mb-6 text-sm text-muted-foreground">{players}&nbsp;{$t('common.players')}</p>
		<p class="mb-6 text-sm">{$t('gamesPage.intro')}</p>
		<Button href="/?game={id}" class="mb-10">{$t('gamesPage.play')}</Button>

		{#if rules}
			<h2 class="mb-3 text-lg tracking-tight">{$t('gamesPage.rules')}</h2>
			<div class="mb-10 whitespace-pre-wrap rounded-2xl border border-border bg-card px-5 py-4 text-sm leading-relaxed text-muted-foreground">{rules}</div>
		{/if}

		<h2 class="mb-3 text-lg tracking-tight">{$t('gamesPage.otherGames')}</h2>
		<ul class="flex flex-wrap gap-2">
			{#each others as other}
				<li>
					<a
						href="/games/{other.id}"
						class="block rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:border-primary/40"
					>
						{$t(`${other.id}.name`)}
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<h1 class="text-2xl tracking-tight">{$t('gamesPage.title')}</h1>
	{/if}
</div>
