<script lang="ts">
	import { onMount } from 'svelte';
	import { parseFormattedText, getEffect, ANIMATION_CONFIG } from '$lib/effects';
	import type { TextSegment } from '$lib/effects';

	interface Props {
		text: string;
		oncomplete?: () => void;
	}

	let { text, oncomplete }: Props = $props();

	let segments = $state<TextSegment[]>([]);
	let renderedContent = $state<{ segment: TextSegment; visible: boolean; html: string }[]>([]);
	let isAnimating = $state(false);
	let lastText = $state('');
	let animationAborted = $state(false);

	onMount(() => {
		// Initial animation
		startAnimation(text);
	});

	// Watch for text changes
	$effect(() => {
		if (text !== lastText && text) {
			startAnimation(text);
		}
	});

	async function startAnimation(newText: string) {
		// Abort previous animation if running
		if (isAnimating) {
			animationAborted = true;
			await sleep(50); // Give time for abort to take effect
		}

		animationAborted = false;
		isAnimating = true;
		lastText = newText;

		// Reset and parse new text
		segments = parseFormattedText(newText);
		renderedContent = segments.map((segment) => ({
			segment,
			visible: false,
			html: renderSegment(segment)
		}));

		// Animate segments
		await animateSegments();
	}

	async function animateSegments() {
		for (let i = 0; i < renderedContent.length; i++) {
			// Check if animation was aborted
			if (animationAborted) {
				return;
			}

			const item = renderedContent[i];
			const segment = item.segment;

			// Handle timing effects (pause)
			if (segment.type === 'pause') {
				const duration = segment.params?.value ?? ANIMATION_CONFIG.pauseDelay;
				await sleep(typeof duration === 'number' ? duration : ANIMATION_CONFIG.pauseDelay);
				continue;
			}

			// Handle structural effects (break)
			if (segment.type === 'break') {
				renderedContent[i] = { ...item, visible: true };
				await sleep(ANIMATION_CONFIG.segmentDelay);
				continue;
			}

			// For text and effect segments - show instantly, then wait
			renderedContent[i] = { ...item, visible: true };

			// Add delay based on content length (segment-level pacing)
			const content = segment.content;
			if (content) {
				const charDelay = Math.min(content.length * 15, 80);
				const punctuationCount = (content.match(/[.,!?。！？、]/g) || []).length;
				const totalDelay = charDelay + punctuationCount * 50;
				await sleep(Math.max(ANIMATION_CONFIG.segmentDelay, totalDelay));
			} else {
				await sleep(ANIMATION_CONFIG.segmentDelay);
			}
		}

		isAnimating = false;
		await sleep(ANIMATION_CONFIG.afterComplete);

		// Only call oncomplete if not aborted
		if (!animationAborted) {
			oncomplete?.();
		}
	}

	function renderSegment(segment: TextSegment): string {
		if (segment.type === 'break') {
			return '';
		}

		if (segment.type === 'pause') {
			return '';
		}

		const content = escapeHtml(segment.content);

		if (segment.type === 'text' || !segment.effect) {
			return content;
		}

		// Get effect definition
		const effect = getEffect(segment.effect);
		if (!effect) {
			return content;
		}

		// Build class string
		const classes = [effect.style, `effect-${segment.effect}`]
			.filter(Boolean)
			.join(' ');

		// Build animation attribute
		let animationAttr = '';
		if (effect.animation) {
			animationAttr = `data-animation="${effect.animation.type}"`;
		}

		return `<span class="${classes}" ${animationAttr}>${content}</span>`;
	}

	function escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	function sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
</script>

<div class="formatted-text">
	{#each renderedContent as item, i (i)}
		{#if item.visible}
			{#if item.segment.type === 'break'}
				<br class="effect-break" />
			{:else}
				{@html item.html}
			{/if}
		{/if}
	{/each}
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

	/* Container - clean, minimal */
	.formatted-text {
		display: inline;
		font-family: 'LXGW WenKai', 'PingFang SC', 'Microsoft YaHei', sans-serif;
		font-size: 20px;
		font-weight: 300;
		line-height: 1.7;
		letter-spacing: 0.01em;
		color: var(--text-primary);
	}

	/* ============ Minimal Animations ============ */

	/* Shimmer - extremely subtle brightness variation, 4s cycle */
	@keyframes shimmer {
		0%, 100% {
			opacity: 0.95;
		}
		50% {
			opacity: 1;
		}
	}

	/* TypeIn - brief highlight for new text */
	@keyframes typeIn {
		0% {
			text-shadow: 0 0 8px var(--glow-cyan);
			opacity: 0.7;
		}
		100% {
			text-shadow: none;
			opacity: 1;
		}
	}

	/* ============ Effect Styles - Code Highlighting Feel ============ */

	/* em - Cyan keyword (like syntax keyword) */
	:global(.effect-em) {
		color: var(--accent-cyan);
		font-weight: 400;
		animation: shimmer 4s ease-in-out infinite;
	}

	/* pulse - Cyan-indigo gradient (like function name) */
	:global(.effect-pulse) {
		background: linear-gradient(90deg, #22d3ee, #a5b4fc);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		font-weight: 400;
	}

	/* glow - Bright white with subtle glow (like string literal) */
	:global(.effect-glow) {
		color: rgba(255, 255, 255, 1);
		text-shadow: 0 0 12px var(--glow-cyan);
		font-weight: 350;
	}

	/* void - Gray-blue (like comment) */
	:global(.effect-void) {
		color: rgba(148, 163, 184, 0.8);
	}

	/* whisper - Dim gray (like meta) */
	:global(.effect-whisper) {
		color: var(--muted-slate);
		font-size: 0.9em;
	}

	/* ============ Structural Effects ============ */

	/* break - Paragraph break */
	.effect-break {
		display: block;
		width: 100%;
		margin-top: 1rem;
	}
</style>
