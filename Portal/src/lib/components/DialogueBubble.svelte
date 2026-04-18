<script lang="ts">
	import { onMount } from 'svelte';
	import type { Message, Fragment } from '$lib/types/agent';

	interface Props {
		message: Message;
		showFragment?: boolean;
	}

	let { message, showFragment = false }: Props = $props();

	let displayText = $state('');
	let isTyping = $state(true);
	let elementRef: HTMLDivElement;

	onMount(() => {
		if (message.role === 'assistant') {
			// Typewriter effect for assistant messages
			typeText(message.content);
		} else {
			displayText = message.content;
			isTyping = false;
		}
	});

	async function typeText(text: string) {
		const speed = 30; // ms per character
		displayText = '';

		for (let i = 0; i < text.length; i++) {
			displayText += text[i];
			// Small pause at punctuation
			if (['.', ',', '!', '?', '。', '，', '！', '？'].includes(text[i])) {
				await sleep(speed * 5);
			} else {
				await sleep(speed);
			}
		}

		isTyping = false;
	}

	function sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
</script>

<div
	bind:this={elementRef}
	class="message-wrapper"
	class:user={message.role === 'user'}
	class:assistant={message.role === 'assistant'}
>
	<div class="message-bubble">
		{#if message.role === 'user'}
			<p class="text-right text-white/90">{message.content}</p>
		{:else}
			<p class="text-glow-subtle">
				{displayText}{#if isTyping}<span class="cursor">|</span>{/if}
			</p>
			{#if message.fragment && showFragment}
				<div class="fragment-card mt-4">
					<div class="fragment-indicator">✧ Fragment Revealed</div>
					<p class="text-sm text-white/70 italic">{message.fragment.short}</p>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.message-wrapper {
		max-width: 80%;
		margin: 1rem 0;
		opacity: 0;
		animation: fadeIn 0.5s ease forwards;
	}

	.message-wrapper.user {
		margin-left: auto;
	}

	.message-wrapper.assistant {
		margin-right: auto;
	}

	.message-bubble {
		padding: 1rem 1.25rem;
		border-radius: 1rem;
		backdrop-filter: blur(10px);
	}

	.user .message-bubble {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2));
		border: 1px solid rgba(139, 92, 246, 0.3);
	}

	.assistant .message-bubble {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.fragment-card {
		padding: 0.75rem;
		background: rgba(139, 92, 246, 0.1);
		border: 1px solid rgba(139, 92, 246, 0.3);
		border-radius: 0.5rem;
	}

	.fragment-indicator {
		font-size: 0.75rem;
		color: rgba(139, 92, 246, 0.8);
		margin-bottom: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.cursor {
		animation: blink 1s infinite;
		color: rgba(139, 92, 246, 0.8);
		font-weight: 200;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes blink {
		0%,
		50% {
			opacity: 1;
		}
		51%,
		100% {
			opacity: 0;
		}
	}
</style>
