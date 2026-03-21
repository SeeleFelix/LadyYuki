<script lang="ts">
	import { onMount } from 'svelte';
	import type { Message, Fragment } from '$lib/types/agent';
	import FormattedText from './FormattedText.svelte';
	import { hasEffects } from '$lib/effects';

	interface Props {
		message: Message;
		key?: number;
		showFragment?: boolean;
		oncomplete?: () => void;
	}

	let { message, key = 0, showFragment = false, oncomplete }: Props = $props();

	let displayText = $state('');
	let isTyping = $state(true);
	let isVisible = $state(false);
	let showFragmentCard = $state(false);
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
		showFragmentCard = false;

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

		// Show fragment after typing completes
		if (message.fragment && showFragment) {
			setTimeout(() => {
				showFragmentCard = true;
			}, 400);
		}

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

		// Show fragment after typing completes
		if (message.fragment && showFragment) {
			setTimeout(() => {
				showFragmentCard = true;
			}, 400);
		}

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

	{#if message.fragment && showFragment && showFragmentCard}
		<div class="fragment-card" class:visible={showFragmentCard}>
			<div class="fragment-glow"></div>
			<div class="fragment-content">
				<div class="fragment-indicator">
					<span class="fragment-icon">◆</span>
					<span>Fragment Revealed</span>
				</div>
				<p class="fragment-theme">{message.fragment.theme}</p>
				<p class="fragment-text">{message.fragment.short}</p>
			</div>
		</div>
	{/if}
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

	/* Fragment card - cold tech style */
	.fragment-card {
		position: relative;
		margin-top: 2.5rem;
		padding: 1.25rem 1.5rem;
		background: rgba(15, 23, 42, 0.7);
		border: 1px solid rgba(34, 211, 238, 0.2);
		border-radius: 0.5rem;
		backdrop-filter: blur(12px);
		opacity: 0;
		transform: translateY(15px) scale(0.95);
		transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
		overflow: hidden;
	}

	.fragment-card.visible {
		opacity: 1;
		transform: translateY(0) scale(1);
	}

	/* Ambient glow behind card */
	.fragment-glow {
		position: absolute;
		inset: -2px;
		background: linear-gradient(
			135deg,
			rgba(34, 211, 238, 0.15),
			rgba(129, 140, 248, 0.1),
			rgba(45, 212, 191, 0.1)
		);
		border-radius: 0.5rem;
		animation: glowPulse 4s ease-in-out infinite;
		z-index: -1;
	}

	@keyframes glowPulse {
		0%, 100% {
			opacity: 0.5;
		}
		50% {
			opacity: 0.8;
		}
	}

	.fragment-content {
		position: relative;
		z-index: 1;
	}

	.fragment-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: var(--accent-cyan);
		margin-bottom: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.15em;
	}

	.fragment-icon {
		animation: shimmer 4s ease-in-out infinite;
	}

	@keyframes shimmer {
		0%, 100% {
			opacity: 0.8;
		}
		50% {
			opacity: 1;
		}
	}

	.fragment-theme {
		font-size: 0.7rem;
		color: rgba(148, 163, 184, 0.6);
		text-transform: capitalize;
		margin-bottom: 0.5rem;
		letter-spacing: 0.1em;
	}

	.fragment-text {
		font-size: 0.95rem;
		color: rgba(224, 242, 254, 0.8);
		font-style: italic;
		line-height: 1.6;
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

		.fragment-card {
			padding: 1rem;
			margin-top: 1.5rem;
		}
	}
</style>
