<script lang="ts">
	import FormattedText from './FormattedText.svelte';
	import type { SpaceTextItem } from '$lib/types/space';

	interface Props {
		items: SpaceTextItem[];
	}

	let { items }: Props = $props();
</script>

{#each items as item (item.id)}
	<div
		class="space-text"
		style="left: {item.x}%; top: {item.y}%; opacity: {item.opacity};"
	>
		<FormattedText text={item.text} />
	</div>
{/each}

<style>
	.space-text {
		position: absolute;
		max-width: 400px;
		padding: 1rem 1.25rem;
		background: rgba(10, 10, 20, 0.5);
		border-left: 2px solid rgba(139, 92, 246, 0.3);
		border-radius: 0 8px 8px 0;
		backdrop-filter: blur(8px);
		pointer-events: none;
		transition: opacity 1s ease-in-out;
		font-size: 0.85rem;
		line-height: 1.6;
		color: rgba(224, 242, 254, 0.85);
	}
</style>
