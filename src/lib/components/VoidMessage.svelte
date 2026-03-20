<script lang="ts">
	import { onMount } from 'svelte';
	import type { Message, Fragment } from '$lib/types/agent';

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

		// Initialize characters array
		characters = message.content.split('').map(char => ({
			char,
			visible: false,
			glow: 0
		}));

		// Fade in
		setTimeout(() => (isVisible = true), 50);

		if (message.role === 'assistant') {
			typeText(message.content);
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

	// Split text for gradient effect on keywords
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
		{#each processText(displayText).segments as segment, i}
			{#if segment.highlight}
				<span class="highlight-text">{segment.text}</span>
			{:else}
				<span>{segment.text}</span>
			{/if}
		{/each}
		{#if isTyping}<span class="cursor">|</span>{/if}
	</p>

	{#if message.fragment && showFragment && showFragmentCard}
		<div class="fragment-card" class:visible={showFragmentCard}>
			<div class="fragment-glow"></div>
			<div class="fragment-content">
				<div class="fragment-indicator">
					<span class="fragment-icon">✧</span>
					<span>Fragment Revealed</span>
				</div>
				<p class="fragment-theme">{message.fragment.theme}</p>
				<p class="fragment-text">{message.fragment.short}</p>
			</div>
		</div>
	{/if}
</div>

<style>
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
		font-size: 1.4rem;
		font-weight: 300;
		line-height: 1.9;
		color: rgba(255, 255, 255, 0.95);
		min-height: 3rem;
		letter-spacing: 0.02em;
		/* Floating animation for immersive void effect */
		animation: float 4s ease-in-out infinite;
	}

	.void-container.user .void-text {
		color: rgba(255, 255, 255, 0.7);
		font-size: 1.15rem;
		animation: float 5s ease-in-out infinite;
	}

	/* Highlighted keywords with gradient */
	.highlight-text {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(236, 72, 153, 0.8));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		font-weight: 400;
		animation: keywordGlow 3s ease-in-out infinite;
	}

	@keyframes keywordGlow {
		0%, 100% {
			filter: brightness(1);
		}
		50% {
			filter: brightness(1.2);
		}
	}

	/* Float animation - gentle vertical sway */
	@keyframes float {
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-4px);
		}
	}

	.cursor {
		animation: blink 1s infinite;
		color: rgba(139, 92, 246, 0.8);
		font-weight: 200;
		margin-left: 2px;
	}

	/* Fragment card with holographic effect */
	.fragment-card {
		position: relative;
		margin-top: 2.5rem;
		padding: 1.25rem 1.5rem;
		background: rgba(10, 10, 20, 0.6);
		border: 1px solid rgba(139, 92, 246, 0.3);
		border-radius: 1rem;
		backdrop-filter: blur(15px);
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
			rgba(139, 92, 246, 0.2),
			rgba(236, 72, 153, 0.15),
			rgba(59, 130, 246, 0.2)
		);
		border-radius: 1rem;
		animation: glowRotate 6s linear infinite;
		z-index: -1;
	}

	@keyframes glowRotate {
		0% {
			filter: hue-rotate(0deg);
		}
		100% {
			filter: hue-rotate(360deg);
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
		color: rgba(139, 92, 246, 0.9);
		margin-bottom: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.15em;
	}

	.fragment-icon {
		animation: iconPulse 2s ease-in-out infinite;
	}

	@keyframes iconPulse {
		0%, 100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.2);
			opacity: 0.8;
		}
	}

	.fragment-theme {
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.4);
		text-transform: capitalize;
		margin-bottom: 0.5rem;
		letter-spacing: 0.1em;
	}

	.fragment-text {
		font-size: 0.95rem;
		color: rgba(255, 255, 255, 0.75);
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
			font-size: 1.15rem;
		}

		.void-container.user .void-text {
			font-size: 1rem;
		}

		.fragment-card {
			padding: 1rem;
			margin-top: 1.5rem;
		}
	}
</style>
