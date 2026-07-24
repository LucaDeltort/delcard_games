<script lang="ts">
import { MessageSquare, Send, X } from 'lucide-svelte'
import { fly } from 'svelte/transition'
import { t } from '$lib/i18n'
import { chatMessages, clearChat, pushChatMessage } from '$lib/stores/chat'

let {
	isHost,
	onSend
}: {
	isHost: boolean
	onSend: (text: string) => void
} = $props()

let open = $state(false)
let inputText = $state('')
let scrollContainer: HTMLElement | null = $state(null)

function send() {
	const text = inputText.trim()
	if (!text) return
	onSend(text)
	inputText = ''
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Enter' && !e.shiftKey) {
		e.preventDefault()
		send()
	}
}

// Auto-scroll to bottom when new messages arrive
$effect(() => {
	void $chatMessages.length
	if (open && scrollContainer) {
		queueMicrotask(() => {
			scrollContainer?.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' })
		})
	}
})
</script>

<!-- Toggle button -->
<button
	onclick={() => (open = !open)}
	class="fixed right-4 z-40 flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-2 text-sm text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground"
	style="bottom: calc(4rem + env(safe-area-inset-bottom))"
	aria-label={$t('chat.title')}
>
	<MessageSquare size={16} />
	{#if $chatMessages.length > 0}
		<span class="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
			{$chatMessages.length > 99 ? '99+' : $chatMessages.length}
		</span>
	{/if}
</button>

{#if open}
	<div
		in:fly={{ y: 20, duration: 200 }}
		class="fixed right-4 z-50 flex w-80 max-w-[85vw] flex-col rounded-xl border border-border bg-card shadow-2xl"
		style="bottom: calc(7rem + env(safe-area-inset-bottom)); height: 60vh; max-height: 400px;"
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-border px-3 py-2">
			<span class="font-heading text-xs tracking-widest text-muted-foreground uppercase">
				{$t('chat.title')}
			</span>
			<button
				onclick={() => (open = false)}
				class="text-muted-foreground transition-colors hover:text-foreground"
				aria-label="Close"
			>
				<X size={14} />
			</button>
		</div>

		<!-- Messages -->
		<div bind:this={scrollContainer} class="flex-1 space-y-1 overflow-y-auto p-3">
			{#if $chatMessages.length === 0}
				<p class="pt-8 text-center text-xs text-muted-foreground">{$t('chat.empty')}</p>
			{:else}
				{#each $chatMessages as msg (msg.timestamp)}
					<div class="rounded-lg px-2 py-1">
						<span class="text-xs font-medium text-foreground">{msg.playerName}</span>
						<span class="ml-1 text-xs text-muted-foreground">
							{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
						</span>
						<p class="mt-0.5 break-words text-sm text-foreground/90">{msg.text}</p>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Input -->
		<div class="border-t border-border p-2">
			<div class="flex items-center gap-1.5">
				<input
					bind:value={inputText}
					onkeydown={handleKeydown}
					placeholder={$t('chat.placeholder')}
					maxlength={200}
					class="flex-1 rounded-md border border-border bg-secondary/30 px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none"
				/>
				<button
					onclick={send}
					disabled={!inputText.trim()}
					class="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
					aria-label={$t('chat.send')}
				>
					<Send size={14} />
				</button>
			</div>
		</div>
	</div>
{/if}
