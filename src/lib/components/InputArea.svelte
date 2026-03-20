<script lang="ts">
	import { conversationStore } from '$lib/stores';

	interface Props {
		disabled?: boolean;
		placeholder?: string;
		onsubmit?: (message: string) => void;
	}

	let { disabled = false, placeholder = 'Speak your thoughts...', onsubmit }: Props = $props();

	let inputValue = $state('');
	let textareaRef: HTMLTextAreaElement;
	let isFocused = $state(false);

	// Reactive subscription
	let currentConversation = $state($conversationStore);

	$effect(() => {
		const unsub = conversationStore.subscribe((v) => (currentConversation = v));
		return unsub;
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!inputValue.trim() || disabled) return;

		const message = inputValue.trim();
		inputValue = '';

		// Reset textarea height
		if (textareaRef) {
			textareaRef.style.height = 'auto';
		}

		onsubmit?.(message);
	}

	function handleInput() {
		// Auto-resize textarea
		if (textareaRef) {
			textareaRef.style.height = 'auto';
			textareaRef.style.height = Math.min(textareaRef.scrollHeight, 150) + 'px';
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e);
		}
	}
</script>

<form
	onsubmit={handleSubmit}
	class="input-container"
	class:disabled
	class:focused={isFocused}
>
	<div class="input-wrapper">
		<textarea
			bind:this={textareaRef}
			bind:value={inputValue}
			oninput={handleInput}
			onkeydown={handleKeyDown}
			onfocus={() => (isFocused = true)}
			onblur={() => (isFocused = false)}
			{placeholder}
			{disabled}
			rows="1"
			class="input-field"
		></textarea>
		<button type="submit" disabled={disabled || !inputValue.trim()} class="send-button">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<line x1="22" y1="2" x2="11" y2="13"></line>
				<polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
			</svg>
		</button>
	</div>

	{#if currentConversation.isLoading}
		<div class="loading-indicator">
			<div class="loading-dots">
				<span></span>
				<span></span>
				<span></span>
			</div>
			<span class="loading-text">The goddess is contemplating...</span>
		</div>
	{/if}
</form>

<style>
	.input-container {
		position: relative;
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
		transition: all 0.3s ease;
	}

	.input-wrapper {
		display: flex;
		align-items: flex-end;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 1.5rem;
		transition: all 0.3s ease;
	}

	.input-container.focused .input-wrapper {
		border-color: rgba(139, 92, 246, 0.4);
		background: rgba(255, 255, 255, 0.05);
		box-shadow: 0 0 20px rgba(139, 92, 246, 0.1);
	}

	.input-container.disabled .input-wrapper {
		opacity: 0.5;
		pointer-events: none;
	}

	.input-field {
		flex: 1;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.9);
		font-size: 1rem;
		line-height: 1.5;
		resize: none;
		outline: none;
		min-height: 24px;
		max-height: 150px;
	}

	.input-field::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}

	.send-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3));
		border: 1px solid rgba(139, 92, 246, 0.4);
		border-radius: 50%;
		color: rgba(255, 255, 255, 0.8);
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.send-button:hover:not(:disabled) {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.5), rgba(59, 130, 246, 0.5));
		transform: scale(1.05);
	}

	.send-button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.loading-indicator {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.75rem;
		padding-left: 1rem;
	}

	.loading-dots {
		display: flex;
		gap: 4px;
	}

	.loading-dots span {
		width: 6px;
		height: 6px;
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

	.loading-text {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		font-style: italic;
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
</style>
