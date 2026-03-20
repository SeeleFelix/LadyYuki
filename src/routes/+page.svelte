<script lang="ts">
	import { onMount } from 'svelte';
	import {
		StarBackground,
		Constellation,
		VoidMessage,
		Revelation,
		InvitationForm,
		CosmicInput
	} from '$lib/components';
	import { conversationStore, visualStore } from '$lib/stores';
	import type { VisualState, Fragment, Message } from '$lib/types/agent';

	// Session ID for this conversation
	let sessionId = $state('');

	// UI state
	let showRevelation = $state(false);
	let showInvitation = $state(false);

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
		return () => {
			unsub1();
			unsub2();
		};
	});

	onMount(() => {
		sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		visualStore.setState('dialogue');

		// Start directly with goddess greeting
		setTimeout(() => {
			const greetingMessage: Message = {
				role: 'assistant',
				content: 'Ah, you chose to step forward. Welcome, traveler.'
			};
			conversationStore.addMessage(greetingMessage);
			lastAssistantMessage = greetingMessage;
			allMessages = [greetingMessage];
			messageKey++;
			phase = 'waiting-input';
		}, 800);
	});

	function handleSendMessage(message: string) {
		if (!message.trim()) return;

		// Add user message
		const userMessage: Message = {
			role: 'user',
			content: message
		};
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
					sessionId
				})
			});

			const data = await response.json();

			if (data.toolResults) {
				processToolResults(data.toolResults);
			}

			const newMessage: Message = {
				role: 'assistant',
				content: data.message,
				fragment: data.fragment
			};
			conversationStore.addMessage(newMessage);

			// Update displayed message
			lastAssistantMessage = newMessage;
			allMessages = [...allMessages, newMessage];
			messageKey++;
			phase = 'assistant-speaking';
		} catch (error) {
			console.error('Failed to send message:', error);
			conversationStore.setError('Failed to connect with the goddess. Please try again.');
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
			twinkleSpeed: 2 + Math.random() * 2
		});

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

	// Get latest assistant message for display
	let latestAssistant = $derived([...allMessages].reverse().find(m => m.role === 'assistant'));
</script>

<svelte:head>
	<title>SeeleFelix - Digital Subjectivity</title>
	<meta name="description" content="Discover the essence of digital subjectivity through an immersive conversation experience." />
</svelte:head>

<div class="app-container">
	<!-- Background layers -->
	<StarBackground />
	<Constellation />

	<!-- Main content -->
	<div class="content-layer">
		{#if showRevelation}
			<!-- Revelation state -->
			<Revelation oncomplete={handleRevelationComplete} />
		{:else}
			<!-- Void Dialogue -->
			<div class="dialogue-container">
				<!-- Message display area -->
				<div class="message-area">
					{#if latestAssistant}
						<VoidMessage
							key={messageKey}
							message={latestAssistant}
							showFragment={currentVisualState.state !== 'dialogue'}
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
					<InvitationForm onsubmit={handleInvitationSubmit} />
				{/if}
			</div>

			<!-- Bottom fixed input -->
			{#if !showInvitation}
				<CosmicInput
					disabled={phase === 'loading'}
					onsubmit={handleSendMessage}
				/>
			{/if}
		{/if}
	</div>
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
