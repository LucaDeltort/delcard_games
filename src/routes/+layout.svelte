<script lang="ts">
import './layout.css'
import { Coffee, Settings as SettingsIcon } from 'lucide-svelte'
import { page } from '$app/stores'
import favicon from '$lib/assets/favicon.svg'
import SettingsModal from '$lib/components/SettingsModal.svelte'
import { t } from '$lib/i18n'
import { settingsOpen } from '$lib/stores/settings'

let { children } = $props()

const isGamePage = $derived($page.url.pathname.startsWith('/game/'))
</script>

<svelte:head>
    <title>{$t("common.appTitle")}</title>
    <link rel="icon" href={favicon} />
</svelte:head>
{#if !isGamePage}
	<button
		onclick={() => ($settingsOpen = true)}
		class="fixed right-4 z-50 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
		style="top: calc(1rem + env(safe-area-inset-top))"
		aria-label={$t('settings.title')}
	>
		<SettingsIcon size={14} />
	</button>
{/if}
<SettingsModal />
<div class="flex min-h-dvh flex-col">
    {@render children()}
    {#if !isGamePage}
    <footer class="py-4 text-center text-xs text-muted-foreground">
        © 2026 Luca Deltort — MIT License
    </footer>
    {/if}
</div>
{#if !isGamePage}
    <a
        href="https://ko-fi.com/lucadeltort"
        target="_blank"
        rel="noopener noreferrer"
        class="group fixed right-4 flex items-center gap-2 rounded-full bg-linear-to-r from-blue to-pink px-3 py-2 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95 sm:px-4"
        style="bottom: calc(1rem + env(safe-area-inset-bottom))"
    >
        <Coffee size={16} class="group-hover:animate-[kofi-rock_1s_ease-in-out_infinite]" />
        <span class="hidden sm:inline">Support</span>
    </a>
{/if}
