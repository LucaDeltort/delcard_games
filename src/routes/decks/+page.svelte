<script lang="ts">
    import { ArrowLeft } from "lucide-svelte";
    import { deckRegistry } from "$lib/decks/registry";
    import { t } from "$lib/i18n";
    import { deckPacks, resolvePackFor } from "$lib/stores/deckPacks";
</script>

<div class="mx-auto w-3xl flex-1 px-4 py-8">
    <div class="mb-6 flex items-center gap-3">
        <a
            href="/"
            class="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
            <ArrowLeft size={14} />
            {$t("common.backHome")}
        </a>
    </div>

    <h1 class="mb-8 text-2xl font-bold tracking-tight">{$t("decks.title")}</h1>

    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {#each deckRegistry as deck}
            {@const pack = resolvePackFor($deckPacks, deck.slug)}
            {@const ext = pack.ext ?? ".png"}
            <a
                href="/decks/{deck.slug}"
                class="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-card/80"
            >
                <img
                    src="{pack.basePath}/card_back{ext}"
                    alt={deck.name}
                    class="h-24 w-17 rounded object-contain shadow-md transition-transform group-hover:scale-105"
                    draggable="false"
                />
                <div class="text-center">
                    <p class="text-sm font-medium">{deck.name}</p>
                    <p class="text-xs text-muted-foreground">
                        {$t("decks.packs", { n: deck.packs.length })}
                    </p>
                </div>
            </a>
        {/each}
    </div>
</div>
