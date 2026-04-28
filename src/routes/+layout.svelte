<script lang="ts">
import './layout.css'
import { Coffee } from 'lucide-svelte'
import { page } from '$app/stores'
import favicon from '$lib/assets/favicon.svg'
import LangToggle from '$lib/components/LangToggle.svelte'
import { t } from '$lib/i18n'

let { children } = $props()

const isGamePage = $derived($page.url.pathname.startsWith('/game/'))
</script>

<svelte:head>
    <title>{$t("common.appTitle")}</title>
    <link rel="icon" href={favicon} />
</svelte:head>
{#if !isGamePage}<LangToggle />{/if}
{@render children()}
{#if !isGamePage}
    <footer class="fixed bottom-0 left-0 right-0 py-4 text-center text-xs text-muted-foreground">
        © 2026 Luca Deltort — MIT License
    </footer>
    <a
        href="https://ko-fi.com/lucadeltort"
        target="_blank"
        rel="noopener noreferrer"
        class="group fixed bottom-4 right-4 flex items-center gap-2 rounded-full bg-linear-to-r from-blue to-pink px-4 py-2 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:brightness-110 active:scale-95"
    >
        <Coffee size={16} class="group-hover:animate-[kofi-rock_1s_ease-in-out_infinite]" />
        Support
    </a>
{/if}
