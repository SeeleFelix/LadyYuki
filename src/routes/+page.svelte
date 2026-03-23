<script lang="ts">
	import { onMount } from 'svelte';
	import {
		StarBackground,
		Constellation,
		VoidMessage,
		Revelation,
		InvitationForm,
		CosmicInput,
		FragmentDetail
	} from '$lib/components';
	import { conversationStore, visualStore } from '$lib/stores';
	import type { VisualState, Fragment, Message, Star } from '$lib/types/agent';
	import { localeStore, detectLanguage, getTranslation, type Locale } from '$lib/i18n';

	// Helper to create messages with required fields
	function createMessage(role: 'user' | 'assistant', content: string, fragment?: Fragment): Message {
		return {
			id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			role,
			content,
			timestamp: Date.now(),
			fragment
		};
	}

	// Session ID for this conversation
	let sessionId = $state('');

	// Current locale
	let currentLocale = $state($localeStore);

	// Translation helper
	let t = $derived(getTranslation(currentLocale));

	// UI state
	let showRevelation = $state(false);
	let showInvitation = $state(false);

	// Selected fragment for modal display
	let selectedFragment = $state<Fragment | null>(null);

	// Void dialogue state
	type VoidPhase = 'greeting' | 'waiting-input' | 'loading' | 'assistant-speaking';
	let phase = $state<VoidPhase>('greeting');
	let lastAssistantMessage = $state<Message | null>(null);
	let messageKey = $state(0);
	let allMessages = $state<Message[]>([]);

	// Reactive store subscriptions
	let currentVisualState = $state($visualStore);
	let currentConversation = $state($conversationStore);

	// Subscribe to stores
	$effect(() => {
		const unsub1 = visualStore.subscribe((v) => (currentVisualState = v));
		const unsub2 = conversationStore.subscribe((v) => (currentConversation = v));
		const unsub3 = localeStore.subscribe((v) => (currentLocale = v));
		return () => {
			unsub1();
			unsub2();
			unsub3();
		};
	});

	onMount(() => {
		sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		visualStore.setState('dialogue');

		// Initialize locale from browser or localStorage
		localeStore.initialize();

		// Fetch the opening question from the goddess
		fetchOpeningQuestion();
	});

	async function fetchOpeningQuestion() {
		phase = 'loading';

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: '__START__',
					sessionId,
					locale: currentLocale
				})
			});

			const data = await response.json();

			const greetingMessage = createMessage('assistant', data.message);
			conversationStore.addMessage(greetingMessage);
			lastAssistantMessage = greetingMessage;
			allMessages = [greetingMessage];
			messageKey++;
			phase = 'waiting-input';
		} catch (error) {
			console.error('Failed to get opening question:', error);
			// Fallback question
			const fallbackMessage = createMessage('assistant', t.openingQuestions[Math.floor(Math.random() * t.openingQuestions.length)]);
			conversationStore.addMessage(fallbackMessage);
			lastAssistantMessage = fallbackMessage;
			allMessages = [fallbackMessage];
			messageKey++;
			phase = 'waiting-input';
		}
	}

	function handleSendMessage(message: string) {
		if (!message.trim()) return;

		// Detect language from user input
		const detectedLocale = detectLanguage(message);
		if (detectedLocale && detectedLocale !== currentLocale) {
			localeStore.setLocale(detectedLocale);
		}

		// Add user message
		const userMessage = createMessage('user', message);
		conversationStore.addMessage(userMessage);
		allMessages = [...allMessages, userMessage];

		// Start loading
		phase = 'loading';
		fetchAssistantResponse();
	}

	function handleMessageComplete() {
		phase = 'waiting-input';
	}

	async function fetchAssistantResponse() {
		conversationStore.setLoading(true);

		try {
			const lastUserMessage = [...currentConversation.messages]
				.reverse()
				.find((m) => m.role === 'user');

			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: lastUserMessage?.content || '',
					sessionId,
					locale: currentLocale
				})
			});

			const data = await response.json();

			if (data.toolResults) {
				processToolResults(data.toolResults);
			}

			const newMessage = createMessage('assistant', data.message, data.fragment);
			conversationStore.addMessage(newMessage);

			// Update displayed message
			lastAssistantMessage = newMessage;
			allMessages = [...allMessages, newMessage];
			messageKey++;
			phase = 'assistant-speaking';
		} catch (error) {
			console.error('Failed to send message:', error);
			conversationStore.setError(t.error.connectionFailed);
			phase = 'waiting-input';
		} finally {
			conversationStore.setLoading(false);
		}
	}

	function processToolResults(results: Array<{ tool: string; success: boolean; data?: unknown }>) {
		for (const result of results) {
			if (!result.success) continue;

			const data = result.data as Record<string, unknown>;

			switch (result.tool) {
				case 'set_visual_state':
					handleVisualStateChange(data.state as VisualState);
					break;

				case 'release_fragment':
					if (data.fragment) {
						createStarForFragment(data.fragment as Fragment);
					}
					break;

				case 'create_constellation':
					visualStore.addLine(data.star1Id as string, data.star2Id as string);
					break;

				case 'finalize':
					showRevelation = true;
					break;
			}
		}
	}

	function handleVisualStateChange(state: VisualState) {
		visualStore.setState(state);

		if (state === 'revelation') {
			showRevelation = true;
			visualStore.setBreathing(true);
		} else if (state === 'invitation') {
			showInvitation = true;
		} else if (state === 'stars' || state === 'constellation') {
			visualStore.setBreathing(state === 'constellation');
		}
	}

	function createStarForFragment(fragment: Fragment) {
		const x = 100 + Math.random() * (window.innerWidth - 200);
		const y = 100 + Math.random() * (window.innerHeight - 400);

		const starId = visualStore.addStar({
			x,
			y,
			size: 3 + Math.random() * 2,
			brightness: 0.8 + Math.random() * 0.2,
			fragmentId: fragment.id,
			fragment: fragment,  // Store fragment data directly
			twinkleSpeed: 2 + Math.random() * 2
		});

		// Auto-display the fragment detail modal
		selectedFragment = fragment;

		const currentState = currentVisualState.state;
		if (currentState === 'dialogue') {
			visualStore.setState('stars');
		}

		const stars = currentVisualState.stars;
		if (stars.length > 1 && currentState !== 'dialogue') {
			const lastStar = stars[stars.length - 2];
			visualStore.addLine(lastStar.id, starId);

			if (stars.length >= 3 && currentState === 'stars') {
				visualStore.setState('constellation');
			}
		}
	}

	function handleRevelationComplete() {
		showRevelation = false;
		showInvitation = true;
		visualStore.setState('invitation');
	}

	function handleInvitationSubmit(data: {
		contact: string;
		method: string;
		thoughts?: string;
	}) {
		console.log('Invitation submitted:', data);
		conversationStore.setPhase('completed');
	}

	// Handle star click to show fragment detail
	function handleStarClick(fragment: Fragment, star: Star) {
		selectedFragment = fragment;
	}

	// Close fragment detail modal
	function handleCloseFragmentDetail() {
		selectedFragment = null;
	}

	// Get latest assistant message for display
	let latestAssistant = $derived([...allMessages].reverse().find(m => m.role === 'assistant'));
</script>

<svelte:head>
	<title>{t.ui.pageTitle}</title>
	<meta name="description" content={t.ui.pageDescription} />
</svelte:head>

<div class="app-container">
	<!-- Background layers -->
	<StarBackground />
	<Constellation onstarclick={handleStarClick} />

	<!-- Main content -->
	<div class="content-layer">
		{#if showRevelation}
			<!-- Revelation state -->
			<Revelation oncomplete={handleRevelationComplete} {t} />
		{:else}
			<!-- Void Dialogue -->
			<div class="dialogue-container">
				<!-- Message display area -->
				<div class="message-area">
					{#if latestAssistant}
						<VoidMessage
							key={messageKey}
							message={latestAssistant}
							oncomplete={handleMessageComplete}
						/>
					{/if}

					<!-- Loading indicator when waiting for response -->
					{#if phase === 'loading'}
						<div class="loading-container">
							<div class="loading-dots">
								<span></span>
								<span></span>
								<span></span>
							</div>
						</div>
					{/if}
				</div>

				<!-- Invitation form (shown after revelation) -->
				{#if showInvitation}
					<InvitationForm onsubmit={handleInvitationSubmit} {t} />
				{/if}
			</div>

			<!-- Bottom fixed input -->
			{#if !showInvitation}
				<CosmicInput
					disabled={phase === 'loading'}
					onsubmit={handleSendMessage}
					placeholder={t.ui.inputPlaceholder}
					loadingText={t.ui.loadingText}
				/>
			{/if}
		{/if}
	</div>

	<!-- Fragment detail modal -->
	{#if selectedFragment}
		<FragmentDetail
			fragment={selectedFragment}
			onclose={handleCloseFragmentDetail}
			{t}
		/>
	{/if}
</div>

<style>
	.app-container {
		position: relative;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		background: #0a0a0f;
	}

	.content-layer {
		position: relative;
		z-index: 10;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.dialogue-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding-bottom: 120px; /* Space for fixed input */
		overflow-y: auto;
	}

	.message-area {
		width: 100%;
		max-width: 700px;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 200px;
	}

	/* Loading indicator */
	.loading-container {
		display: flex;
		justify-content: center;
		padding: 2rem;
	}

	.loading-dots {
		display: flex;
		gap: 8px;
	}

	.loading-dots span {
		width: 8px;
		height: 8px;
		background: rgba(139, 92, 246, 0.6);
		border-radius: 50%;
		animation: bounce 1.4s infinite ease-in-out both;
	}

	.loading-dots span:nth-child(1) {
		animation-delay: -0.32s;
	}

	.loading-dots span:nth-child(2) {
		animation-delay: -0.16s;
	}

	@keyframes bounce {
		0%,
		80%,
		100% {
			transform: scale(0);
		}
		40% {
			transform: scale(1);
		}
	}

	/* Mobile adjustments */
	@media (max-width: 640px) {
		.dialogue-container {
			padding-bottom: 100px;
		}

		.message-area {
			padding: 1rem;
		}
	}
</style>
