<script lang="ts">
	import { onMount } from 'svelte';
	import type { Message, Fragment } from '$lib/types/agent';
	import FormattedText from './FormattedText.svelte';
	import { hasEffects } from '$lib/effects';

	interface Props {
		message: Message;
		key?: number;
		oncomplete?: () => void;
	}

	let { message, key = 0, oncomplete }: Props = $props();

	let displayText = $state('');
	let isTyping = $state(true);
	let isVisible = $state(false);
	let lastProcessedKey = $state(-1);

	// Character-by-character animation state
	let characters: { char: string; visible: boolean; glow: number }[] = [];

	// Track if message uses new formatting
	let usesFormatting = $state(false);

	// Initial render with onMount
	onMount(() => {
		lastProcessedKey = key;
		startAnimation();
	});

	// Watch key changes
	$effect(() => {
		const currentKey = key;
		if (currentKey === lastProcessedKey) return;
		lastProcessedKey = currentKey;
		startAnimation();
	});

	function startAnimation() {
		// Reset state
		displayText = '';
		isTyping = true;
		isVisible = false;

		// Check if message uses formatting markers
		usesFormatting = hasEffects(message.content);

		// Initialize characters array (for non-formatted text)
		characters = message.content.split('').map(char => ({
			char,
			visible: false,
			glow: 0
		}));

		// Fade in
		setTimeout(() => (isVisible = true), 50);

		if (message.role === 'assistant') {
			if (usesFormatting) {
				// For formatted text, use FormattedText component
				displayText = message.content;
				// The FormattedText component handles animation
			} else {
				typeText(message.content);
			}
		} else {
			displayText = message.content;
			isTyping = false;
			setTimeout(() => {
				isVisible = false;
				setTimeout(() => oncomplete?.(), 500);
			}, 1200);
		}
	}

	async function typeText(text: string) {
		const baseSpeed = 30;

		for (let i = 0; i < text.length; i++) {
			characters[i].visible = true;
			characters[i].glow = 1;
			displayText = text.slice(0, i + 1);

			// Fade out glow after character appears
			setTimeout(() => {
				characters[i].glow = 0;
			}, 100);

			// Punctuation pauses
			if (['.', ',', '!', '?', '。', '，', '！', '？'].includes(text[i])) {
				await sleep(baseSpeed * 8);
			} else {
				await sleep(baseSpeed + Math.random() * 20);
			}
		}

		isTyping = false;

		// Notify parent that message is complete
		setTimeout(() => {
			oncomplete?.();
		}, 600);
	}

	function sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	// Handle formatted text completion
	function handleFormattedTextComplete() {
		isTyping = false;

		// Notify parent that message is complete
		setTimeout(() => {
			oncomplete?.();
		}, 600);
	}

	// Split text for gradient effect on keywords (for non-formatted text)
	function processText(text: string): { segments: { text: string; highlight: boolean }[] } {
		const keywords = ['subjectivity', 'consciousness', 'digital', 'relationship', 'dialogue', 'subject', 'existence', 'void', 'essence'];
		const segments: { text: string; highlight: boolean }[] = [];
		let remaining = text;

		while (remaining.length > 0) {
			let found = false;
			for (const keyword of keywords) {
				if (remaining.toLowerCase().startsWith(keyword)) {
					segments.push({ text: remaining.slice(0, keyword.length), highlight: true });
					remaining = remaining.slice(keyword.length);
					found = true;
					break;
				}
			}
			if (!found) {
				segments.push({ text: remaining[0], highlight: false });
				remaining = remaining.slice(1);
			}
		}

		return { segments };
	}
</script>

<div class="void-container" class:visible={isVisible} class:user={message.role === 'user'}>
	<p class="void-text">
		{#if message.role === 'assistant' && usesFormatting}
			<FormattedText text={message.content} oncomplete={handleFormattedTextComplete} />
		{:else}
			{#each processText(displayText).segments as segment, i}
				{#if segment.highlight}
					<span class="highlight-text">{segment.text}</span>
				{:else}
					<span>{segment.text}</span>
				{/if}
			{/each}
			{#if isTyping}<span class="cursor">|</span>{/if}
		{/if}
	</p>
</div>

<style>
	/* ============ CSS Variables - Cold Tech Light Palette ============ */
	:root {
		/* Base text - cold white */
		--text-primary: rgba(224, 242, 254, 0.95);

		/* Accent - cyan/teal */
		--accent-cyan: rgba(34, 211, 238, 0.95);
		--accent-teal: rgba(45, 212, 191, 0.9);

		/* Key - cold indigo */
		--key-indigo: rgba(165, 180, 252, 0.95);

		/* Muted - dim slate */
		--muted-slate: rgba(148, 163, 184, 0.6);

		/* Glow colors */
		--glow-cyan: rgba(34, 211, 238, 0.4);
		--glow-indigo: rgba(129, 140, 248, 0.3);
	}

	.void-container {
		position: relative;
		max-width: 650px;
		width: 100%;
		text-align: center;
		opacity: 0;
		transition: opacity 0.8s ease;
		pointer-events: none;
	}

	.void-container.visible {
		opacity: 1;
	}

	.void-text {
		font-family: 'LXGW WenKai', 'PingFang SC', 'Microsoft YaHei', sans-serif;
		font-size: 20px;
		font-weight: 300;
		line-height: 1.7;
		color: var(--text-primary);
		min-height: 3rem;
		letter-spacing: 0.01em;
	}

	.void-container.user .void-text {
		color: rgba(203, 213, 225, 0.7);
		font-size: 16px;
	}

	/* Highlighted keywords - cyan accent */
	.highlight-text {
		color: var(--accent-cyan);
		font-weight: 400;
	}

	.cursor {
		animation: blink 1s infinite;
		color: var(--accent-cyan);
		font-weight: 200;
		margin-left: 2px;
	}

	@keyframes blink {
		0%, 50% {
			opacity: 1;
		}
		51%, 100% {
			opacity: 0;
		}
	}

	@media (max-width: 768px) {
		.void-text {
			font-size: 16px;
		}

		.void-container.user .void-text {
			font-size: 14px;
		}
	}
</style>
