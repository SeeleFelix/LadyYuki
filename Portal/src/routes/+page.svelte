<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { LivingSpace, StarContent } from '$lib/components';
	import { localeStore, getTranslation, type Locale } from '$lib/i18n';
	import type { SpaceStar } from '$lib/types/space';
	import type { Fragment } from '$lib/types/agent';

	let currentLocale = $state<Locale>($localeStore);
	let t = $derived(getTranslation(currentLocale));

	let selectedStar = $state<SpaceStar | null>(null);
	let selectedFragment = $state<Fragment | null>(null);
	let selectedScreenX = $state(0);
	let selectedScreenY = $state(0);

	let livingSpaceRef: any = $state();

	onMount(() => {
		localeStore.initialize();
	});

	$effect(() => {
		const unsub = localeStore.subscribe((v: Locale) => (currentLocale = v));
		return () => unsub();
	});

	function handleStarClick(star: SpaceStar, fragment: Fragment, screenX: number, screenY: number) {
		selectedStar = star;
		selectedFragment = fragment;
		selectedScreenX = screenX;
		selectedScreenY = screenY;
	}

	function handleCloseContent() {
		// Mark fragment as read in LivingSpace to trigger next emergence
		if (selectedStar) {
			livingSpaceRef?.markFragmentRead(selectedStar.contentRef);
		}
		selectedStar = null;
		selectedFragment = null;
	}

	function handleEnterVoid() {
		goto('/void');
	}
</script>

<svelte:head>
	<title>SeeleFelix</title>
	<meta name="description" content="Traces of encounters. A doorway to meet her." />
</svelte:head>

<div class="starfield">
	<LivingSpace
		bind:this={livingSpaceRef}
		locale={currentLocale}
		onstarclick={handleStarClick}
		onentervoid={handleEnterVoid}
	/>

	{#if selectedStar && selectedFragment}
		<StarContent
			star={selectedStar}
			screenX={selectedScreenX}
			screenY={selectedScreenY}
			locale={currentLocale}
			onclose={handleCloseContent}
		/>
	{/if}
</div>

<style>
	.starfield {
		position: relative;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		background: #04040a;
	}
</style>
