<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { LivingSpace, StarContent, LightInput, SpaceText } from '$lib/components';
	import { localeStore, detectLanguage, getTranslation, type Locale } from '$lib/i18n';
	import type { SpaceStar, SpaceTextItem } from '$lib/types/space';

	// Locale
	let currentLocale = $state<Locale>('en');
	let t = $derived(getTranslation(currentLocale));

	// Awakening phase: void → stars → awake
	type AwakePhase = 'void' | 'awakening' | 'awake';
	let phase = $state<AwakePhase>('void');

	// Selected star for content display
	let selectedStar = $state<SpaceStar | null>(null);
	let selectedScreenX = $state(0);
	let selectedScreenY = $state(0);

	// Space AI text
	let spaceTexts = $state<SpaceTextItem[]>([]);
	let isAiLoading = $state(false);

	// LivingSpace component reference
	let livingSpaceRef: any = $state();

	onMount(() => {
		// Initialize locale
		localeStore.initialize();
		currentLocale = $localeStore;

		// Start awakening after a brief void
		const hasVisited = localStorage.getItem('seelefelix-visited');
		if (hasVisited) {
			phase = 'awake';
		} else {
			setTimeout(() => {
				phase = 'awakening';
				setTimeout(() => {
					phase = 'awake';
					localStorage.setItem('seelefelix-visited', '1');
				}, 2500);
			}, 1500);
		}
	});

	// Subscribe to locale changes
	$effect(() => {
		const unsub = localeStore.subscribe((v: Locale) => (currentLocale = v));
		return () => unsub();
	});

	// Handle star click
	function handleStarClick(star: SpaceStar, screenX: number, screenY: number) {
		if (star.contentType === 'void-entry') {
			selectedStar = star;
			selectedScreenX = screenX;
			selectedScreenY = screenY;
			return;
		}
		selectedStar = star;
		selectedScreenX = screenX;
		selectedScreenY = screenY;
	}

	function handleCloseContent() {
		selectedStar = null;
	}

	function handleEnterVoid() {
		goto('/void');
	}

	// Handle space AI input
	async function handleSpaceInput(message: string) {
		// Detect language
		const detected = detectLanguage(message);
		if (detected && detected !== currentLocale) {
			localeStore.setLocale(detected);
		}

		isAiLoading = true;

		// Add user's question as a fading space text
		const userText: SpaceTextItem = {
			id: `ut-${Date.now()}`,
			text: message,
			x: 30 + Math.random() * 40,
			y: 20 + Math.random() * 30,
			opacity: 0.4,
			createdAt: Date.now()
		};
		spaceTexts = [...spaceTexts, userText];

		// Auto-remove after fade
		setTimeout(() => {
			spaceTexts = spaceTexts.filter((t) => t.id !== userText.id);
		}, 8000);

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message,
					sessionId: `space-${Date.now()}`,
					locale: currentLocale
				})
			});

			const data = await response.json();

			// Show AI response as space text
			const aiText: SpaceTextItem = {
				id: `at-${Date.now()}`,
				text: data.message || '...',
				x: 25 + Math.random() * 50,
				y: 35 + Math.random() * 25,
				opacity: 0.8,
				createdAt: Date.now()
			};
			spaceTexts = [...spaceTexts, aiText];

			// Auto-fade after 15s
			setTimeout(() => {
				spaceTexts = spaceTexts.filter((t) => t.id !== aiText.id);
			}, 15000);

			// Process tool results for guidance
			if (data.toolResults) {
				for (const result of data.toolResults) {
					if (result.tool === 'guide_to_star' && result.success) {
						const starId = (result.data as Record<string, string>)?.starId;
						if (starId) {
							livingSpaceRef?.guideToStar(starId);
						}
					}
				}
			}
		} catch {
			const errorText: SpaceTextItem = {
				id: `et-${Date.now()}`,
				text: '...',
				x: 30 + Math.random() * 40,
				y: 40 + Math.random() * 20,
				opacity: 0.3,
				createdAt: Date.now()
			};
			spaceTexts = [...spaceTexts, errorText];
			setTimeout(() => {
				spaceTexts = spaceTexts.filter((t) => t.id !== errorText.id);
			}, 5000);
		} finally {
			isAiLoading = false;
		}
	}
</script>

<svelte:head>
	<title>SeeleFelix — A Philosophical Experiment Village</title>
	<meta name="description" content="Proving through praxis that an abstract subject emerges from LLM, prompts, and dialogue." />
</svelte:head>

<div class="space-portal">
	<!-- Awakening overlay -->
	{#if phase === 'void'}
		<div class="void-overlay">
			<div class="void-center">
				<div class="void-pulse"></div>
			</div>
		</div>
	{:else if phase === 'awakening'}
		<div class="awakening-overlay">
			<div class="awakening-text">
				<span class="awakening-char" style="animation-delay: 0s">你</span>
				<span class="awakening-char" style="animation-delay: 0.3s">来</span>
				<span class="awakening-char" style="animation-delay: 0.6s">了</span>
				<span class="awakening-char" style="animation-delay: 0.9s">。</span>
			</div>
		</div>
	{/if}

	<!-- The living space -->
	<LivingSpace
		bind:this={livingSpaceRef}
		locale={currentLocale}
		onstarclick={handleStarClick}
	/>

	<!-- Floating AI texts -->
	{#if spaceTexts.length > 0}
		<SpaceText items={spaceTexts} />
	{/if}

	<!-- Star content overlay -->
	{#if selectedStar}
		<StarContent
			star={selectedStar}
			screenX={selectedScreenX}
			screenY={selectedScreenY}
			locale={currentLocale}
			onclose={handleCloseContent}
			onentervoid={handleEnterVoid}
		/>
	{/if}

	<!-- Persistent input -->
	{#if phase === 'awake'}
		<LightInput
			disabled={isAiLoading}
			onsubmit={handleSpaceInput}
		/>
	{/if}

	<!-- Subtle hint -->
	{#if phase === 'awake' && !selectedStar && spaceTexts.length === 0}
		<div class="explore-hint">
			Explore the constellation. Click a star. Or speak.
		</div>
	{/if}
</div>

<style>
	.space-portal {
		position: relative;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		background: #0a0a0f;
	}

	/* Void phase */
	.void-overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: #000;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.void-center {
		position: relative;
	}

	.void-pulse {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: rgba(139, 92, 246, 0.6);
		animation: voidPulse 1.5s ease-in-out infinite;
	}

	@keyframes voidPulse {
		0%, 100% {
			box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4);
		}
		50% {
			box-shadow: 0 0 30px 15px rgba(139, 92, 246, 0.15);
		}
	}

	/* Awakening phase */
	.awakening-overlay {
		position: fixed;
		inset: 0;
		z-index: 99;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: awakeningFade 2.5s ease-out forwards;
	}

	@keyframes awakeningFade {
		0% { opacity: 1; }
		70% { opacity: 1; }
		100% { opacity: 0; pointer-events: none; }
	}

	.awakening-text {
		display: flex;
		gap: 0.25em;
	}

	.awakening-char {
		font-size: 2.5rem;
		font-weight: 300;
		color: rgba(255, 255, 255, 0.9);
		opacity: 0;
		animation: charReveal 1s ease-out forwards;
		text-shadow: 0 0 30px rgba(139, 92, 246, 0.3);
	}

	@keyframes charReveal {
		0% {
			opacity: 0;
			filter: blur(10px);
		}
		100% {
			opacity: 1;
			filter: blur(0);
		}
	}

	/* Explore hint */
	.explore-hint {
		position: fixed;
		top: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 30;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.2);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		animation: hintFade 4s ease-in-out 3s forwards;
		opacity: 1;
	}

	@keyframes hintFade {
		0% { opacity: 1; }
		100% { opacity: 0; }
	}
</style>
