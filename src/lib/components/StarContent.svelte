<script lang="ts">
	import { fade, fly } from 'svelte/transition';
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
		setTimeout(onclose, 400);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') handleClose();
	}

	function handleVoidEnter() {
		visible = false;
		setTimeout(() => onentervoid?.(), 400);
	}

	function handleAmbientClick() {
		handleClose();
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
	<!-- Ambient darkening layer -->
	<div
		class="ambient"
		onclick={handleAmbientClick}
		transition:fade={{ duration: 400 }}
	></div>

	<!-- Content emerges from star position -->
	<div
		class="star-reveal"
		style="--star-color: {colorRgb}; --origin-x: {screenX}px; --origin-y: {screenY}px;"
		transition:fly={{
			y: Math.round((screenY - window.innerHeight / 2) * 0.3),
			x: Math.round((screenX - window.innerWidth / 2) * 0.3),
			duration: 400
		}}
	>
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
	.ambient {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: radial-gradient(
			ellipse at var(--origin-x, 50%) var(--origin-y, 50%),
			rgba(0, 0, 0, 0.6) 0%,
			rgba(0, 0, 0, 0.3) 40%,
			rgba(0, 0, 0, 0.1) 100%
		);
		cursor: pointer;
	}

	.star-reveal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 51;
		max-width: 620px;
		width: 88vw;
		max-height: 80vh;
		overflow-y: auto;
		padding: 3rem 2.5rem;
	}

	.content-header {
		margin-bottom: 2rem;
	}

	.content-subtitle {
		display: inline-block;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: rgba(var(--star-color), 0.6);
		margin-bottom: 0.6rem;
	}

	.content-title {
		font-size: 1.6rem;
		font-weight: 300;
		color: rgba(255, 255, 255, 0.95);
		margin: 0;
		text-shadow: 0 0 30px rgba(var(--star-color), 0.2);
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
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.95rem;
		margin-bottom: 0.75rem;
	}

	.void-btn {
		margin-top: 2rem;
		padding: 0.75rem 2.5rem;
		background: rgba(139, 92, 246, 0.15);
		border: 1px solid rgba(139, 92, 246, 0.3);
		color: rgba(255, 255, 255, 0.85);
		border-radius: 8px;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.3s;
	}

	.void-btn:hover {
		background: rgba(139, 92, 246, 0.3);
		border-color: rgba(139, 92, 246, 0.5);
		box-shadow: 0 0 25px rgba(139, 92, 246, 0.15);
	}

	.star-reveal::-webkit-scrollbar {
		width: 3px;
	}
	.star-reveal::-webkit-scrollbar-track {
		background: transparent;
	}
	.star-reveal::-webkit-scrollbar-thumb {
		background: rgba(var(--star-color), 0.2);
		border-radius: 2px;
	}
</style>
