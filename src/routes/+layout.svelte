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
		class="fixed right-4 z-50 rounded-md border border-border bg-card px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
		style="top: calc(1rem + env(safe-area-inset-top))"
		aria-label={$t('settings.title')}
	>
		<SettingsIcon size={16} />
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
    <div
        class="fixed right-4 flex items-center gap-2"
        style="bottom: calc(1rem + env(safe-area-inset-bottom))"
    >
        <a
            href="https://github.com/LucaDeltort/delcard_games"
            target="_blank"
            rel="noopener noreferrer"
            class="group flex items-center gap-2 rounded-full bg-card border border-border px-3 py-2 text-sm font-bold text-foreground shadow-lg transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95 sm:px-4"
            aria-label="GitHub"
        >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="group-hover:animate-[kofi-rock_1s_ease-in-out_infinite]">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            <span class="hidden sm:inline">Contribute</span>
        </a>
        <a
            href="https://ko-fi.com/lucadeltort"
            target="_blank"
            rel="noopener noreferrer"
            class="group flex items-center gap-2 rounded-full bg-linear-to-r from-blue to-pink px-3 py-2 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95 sm:px-4"
        >
            <Coffee size={16} class="group-hover:animate-[kofi-rock_1s_ease-in-out_infinite]" />
            <span class="hidden sm:inline">Support</span>
        </a>
    </div>
{/if}
