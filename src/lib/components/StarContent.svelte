<script lang="ts">
	import { fade } from 'svelte/transition';
	import FormattedText from './FormattedText.svelte';
	import type { SpaceStar } from '$lib/types/space';
	import type { Locale } from '$lib/i18n/detector';
	import { getAreaById } from '$lib/data/constellation';
	import { resolveStarContent } from '$lib/data/stars';

	interface Props {
		star: SpaceStar;
		screenX: number;
		screenY: number;
		locale: Locale;
		onclose: () => void;
		onentervoid?: () => void;
	}

	let { star, screenX, screenY, locale, onclose, onentervoid }: Props = $props();

	let visible = $state(true);

	const colorRgb = $derived.by(() => {
		const a = getAreaById(star.areaId);
		return a ? extractRgb(a.color) : '255, 255, 255';
	});

	const content = $derived(resolveStarContent(star, locale));

	function handleClose() {
		visible = false;
		setTimeout(onclose, 300);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') handleClose();
	}

	function handleVoidEnter() {
		visible = false;
		setTimeout(() => onentervoid?.(), 300);
	}

	function extractRgb(rgba: string): string {
		const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
		return match ? `${match[1]}, ${match[2]}, ${match[3]}` : '255, 255, 255';
	}

	function getTitle(): string {
		if (!content) return star.label;
		const c = content as unknown as Record<string, unknown>;
		if ('title' in content) return c.title as string;
		if ('name' in content) return c.name as string;
		if ('short' in content) return c.short as string;
		return star.label;
	}

	function getBody(): string {
		if (!content || typeof content !== 'object') return '';
		const c = content as unknown as Record<string, unknown>;
		if ('body' in c && typeof c.body === 'string') return c.body;
		if ('description' in c && typeof c.description === 'string') return c.description;
		if ('full' in c && typeof c.full === 'string') return c.full;
		if ('bio' in c && typeof c.bio === 'string') return c.bio;
		return '';
	}

	function getSubtitle(): string {
		if (!content || typeof content !== 'object') return '';
		const c = content as Record<string, unknown>;
		if ('role' in c && typeof c.role === 'string') return c.role;
		if ('author' in c && typeof c.author === 'string') return c.author;
		if ('status' in c && typeof c.status === 'string') return c.status as string;
		if ('theme' in c && typeof c.theme === 'string') return c.theme as string;
		return '';
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if visible}
	<!-- Backdrop -->
	<div class="backdrop" onclick={handleClose} role="presentation"></div>

	<!-- Content panel -->
	<div
		class="star-content"
		style="--star-color: {colorRgb};"
		transition:fade={{ duration: 200 }}
	>
		<div class="content-glow"></div>

		<button class="close-btn" onclick={handleClose} aria-label="Close">
			&times;
		</button>

		{#if star.contentType === 'void-entry'}
			<div class="void-content">
				<h2 class="void-title">Enter the Void</h2>
				<p class="void-desc">Step into an immersive dialogue with the space's consciousness.</p>
				<p class="void-desc">What emerges between you and the AI will prove the thesis.</p>
				<button class="void-btn" onclick={handleVoidEnter}>
					Enter
				</button>
			</div>
		{:else}
			<div class="content-header">
				{#if getSubtitle()}
					<span class="content-subtitle">{getSubtitle()}</span>
				{/if}
				<h2 class="content-title">{getTitle()}</h2>
			</div>

			<div class="content-body">
				{#if getBody()}
					<FormattedText text={getBody()} />
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 50;
	}

	.star-content {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 51;
		max-width: 600px;
		width: 90vw;
		max-height: 80vh;
		overflow-y: auto;
		background: rgba(10, 10, 20, 0.9);
		border: 1px solid rgba(var(--star-color), 0.3);
		border-radius: 12px;
		padding: 2.5rem;
		backdrop-filter: blur(20px);
	}

	.content-glow {
		position: absolute;
		top: -50%;
		left: -50%;
		width: 200%;
		height: 200%;
		background: radial-gradient(
			ellipse at center,
			rgba(var(--star-color), 0.05) 0%,
			rgba(0, 0, 0, 0) 70%
		);
		pointer-events: none;
		z-index: -1;
	}

	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.4);
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		line-height: 1;
		transition: color 0.2s;
	}

	.close-btn:hover {
		color: rgba(255, 255, 255, 0.8);
	}

	.content-header {
		margin-bottom: 1.5rem;
	}

	.content-subtitle {
		display: inline-block;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: rgba(var(--star-color), 0.7);
		margin-bottom: 0.5rem;
	}

	.content-title {
		font-size: 1.5rem;
		font-weight: 300;
		color: rgba(255, 255, 255, 0.95);
		margin: 0;
		text-shadow: 0 0 20px rgba(var(--star-color), 0.3);
	}

	.content-body {
		color: rgba(224, 242, 254, 0.9);
		line-height: 1.8;
	}

	.void-content {
		text-align: center;
		padding: 2rem 0;
	}

	.void-title {
		font-size: 1.8rem;
		font-weight: 300;
		color: rgba(139, 92, 246, 0.9);
		text-shadow: 0 0 30px rgba(139, 92, 246, 0.3);
		margin-bottom: 1.5rem;
	}

	.void-desc {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.95rem;
		margin-bottom: 0.75rem;
	}

	.void-btn {
		margin-top: 2rem;
		padding: 0.75rem 2.5rem;
		background: rgba(139, 92, 246, 0.2);
		border: 1px solid rgba(139, 92, 246, 0.4);
		color: rgba(255, 255, 255, 0.9);
		border-radius: 8px;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.3s;
	}

	.void-btn:hover {
		background: rgba(139, 92, 246, 0.35);
		border-color: rgba(139, 92, 246, 0.6);
		box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
	}

	.star-content::-webkit-scrollbar {
		width: 4px;
	}
	.star-content::-webkit-scrollbar-track {
		background: transparent;
	}
	.star-content::-webkit-scrollbar-thumb {
		background: rgba(var(--star-color), 0.3);
		border-radius: 2px;
	}
</style>
