<script lang="ts">
	import { conversationStore } from '$lib/stores';

	interface Props {
		disabled?: boolean;
		placeholder?: string;
		loadingText?: string;
		onsubmit?: (message: string) => void;
	}

	let { disabled = false, placeholder = 'Pour your thoughts into the void...', loadingText = 'The goddess contemplates...', onsubmit }: Props = $props();

	let inputValue = $state('');
	let textareaRef: HTMLTextAreaElement;
	let isFocused = $state(false);
	let isComposing = $state(false);

	// Reactive subscription
	let currentConversation = $state($conversationStore);

	$effect(() => {
		const unsub = conversationStore.subscribe((v) => (currentConversation = v));
		return unsub;
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!inputValue.trim() || disabled || isComposing) return;

		const message = inputValue.trim();
		inputValue = '';

		// Reset textarea height
		if (textareaRef) {
			textareaRef.style.height = 'auto';
		}

		onsubmit?.(message);
	}

	function handleInput() {
		if (isComposing) return;
		// Auto-resize textarea
		if (textareaRef) {
			textareaRef.style.height = 'auto';
			textareaRef.style.height = Math.min(textareaRef.scrollHeight, 120) + 'px';
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (isComposing) return;

		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e);
		}
	}

	function handleCompositionStart() {
		isComposing = true;
	}

	function handleCompositionEnd() {
		isComposing = false;
	}
</script>

<div class="cosmic-input-container" class:disabled>
	<div class="input-glow" class:active={isFocused || inputValue.length > 0}></div>
	<form onsubmit={handleSubmit} class="input-form">
		<div class="input-wrapper" class:focused={isFocused}>
			<textarea
				bind:this={textareaRef}
				bind:value={inputValue}
				oninput={handleInput}
				onkeydown={handleKeyDown}
				oncompositionstart={handleCompositionStart}
				oncompositionend={handleCompositionEnd}
				onfocus={() => (isFocused = true)}
				onblur={() => (isFocused = false)}
				{placeholder}
				{disabled}
				rows="1"
				class="input-field"
			></textarea>
			<button type="submit" disabled={disabled || !inputValue.trim()} class="send-button" aria-label="Send message">
				<!-- Comet-style send icon -->
				<svg viewBox="0 0 24 24" class="comet-icon" xmlns="http://www.w3.org/2000/svg">
					<defs>
						<linearGradient id="comet-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
							<stop offset="0%" style="stop-color: rgba(139, 92, 246, 0.9)" />
							<stop offset="100%" style="stop-color: rgba(59, 130, 246, 0.9)" />
						</linearGradient>
					</defs>
					<path
						d="M12 2L4 20L12 16L20 20L12 2Z"
						fill="url(#comet-gradient)"
						stroke="rgba(255, 255, 255, 0.8)"
						stroke-width="0.5"
					/>
					<!-- Comet tail -->
					<path
						d="M12 16L12 22"
						stroke="rgba(139, 92, 246, 0.6)"
						stroke-width="2"
						stroke-linecap="round"
						class="comet-tail"
					/>
				</svg>
			</button>
		</div>
	</form>

	{#if currentConversation.isLoading}
		<div class="loading-indicator">
			<div class="loading-pulse"></div>
			<span class="loading-text">{loadingText}</span>
		</div>
	{/if}
</div>

<style>
	.cosmic-input-container {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 1rem 1.5rem 1.5rem;
		z-index: 100;
		pointer-events: auto;
	}

	.cosmic-input-container.disabled {
		pointer-events: none;
		opacity: 0.5;
	}

	/* Ambient glow effect behind input */
	.input-glow {
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		max-width: 700px;
		height: 100px;
		background: radial-gradient(ellipse at center bottom, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
		opacity: 0.5;
		transition: opacity 0.5s ease;
		pointer-events: none;
	}

	.input-glow.active {
		opacity: 1;
		background: radial-gradient(ellipse at center bottom, rgba(139, 92, 246, 0.25) 0%, rgba(59, 130, 246, 0.1) 50%, transparent 70%);
	}

	.input-form {
		position: relative;
		max-width: 650px;
		margin: 0 auto;
	}

	.input-wrapper {
		display: flex;
		align-items: flex-end;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		background: rgba(10, 10, 20, 0.8);
		border: 1px solid rgba(139, 92, 246, 0.2);
		border-radius: 1.25rem;
		backdrop-filter: blur(20px);
		transition: all 0.4s ease;
		animation: borderPulse 4s ease-in-out infinite;
	}

	.input-wrapper.focused {
		border-color: rgba(139, 92, 246, 0.5);
		background: rgba(15, 15, 30, 0.9);
		box-shadow:
			0 0 30px rgba(139, 92, 246, 0.2),
			0 0 60px rgba(59, 130, 246, 0.1),
			inset 0 1px 0 rgba(255, 255, 255, 0.05);
	}

	@keyframes borderPulse {
		0%, 100% {
			border-color: rgba(139, 92, 246, 0.2);
			box-shadow: 0 0 20px rgba(139, 92, 246, 0.05);
		}
		50% {
			border-color: rgba(139, 92, 246, 0.35);
			box-shadow: 0 0 30px rgba(139, 92, 246, 0.1);
		}
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
		max-height: 120px;
		font-family: inherit;
	}

	.input-field::placeholder {
		color: rgba(255, 255, 255, 0.35);
		font-style: italic;
	}

	.send-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2));
		border: 1px solid rgba(139, 92, 246, 0.3);
		border-radius: 50%;
		cursor: pointer;
		transition: all 0.3s ease;
		flex-shrink: 0;
	}

	.send-button:hover:not(:disabled) {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(59, 130, 246, 0.4));
		border-color: rgba(139, 92, 246, 0.6);
		transform: scale(1.05);
		box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
	}

	.send-button:active:not(:disabled) {
		transform: scale(0.95);
	}

	.send-button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.comet-icon {
		width: 18px;
		height: 18px;
		transform: rotate(-45deg);
		transition: transform 0.3s ease;
	}

	.send-button:hover:not(:disabled) .comet-icon {
		transform: rotate(-45deg) translateY(-2px);
	}

	.comet-tail {
		animation: tailGlow 1.5s ease-in-out infinite;
	}

	@keyframes tailGlow {
		0%, 100% {
			opacity: 0.4;
		}
		50% {
			opacity: 0.8;
		}
	}

	.loading-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}

	.loading-pulse {
		width: 8px;
		height: 8px;
		background: rgba(139, 92, 246, 0.8);
		border-radius: 50%;
		animation: pulse 1.5s ease-in-out infinite;
		box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
	}

	@keyframes pulse {
		0%, 100% {
			transform: scale(1);
			opacity: 0.8;
		}
		50% {
			transform: scale(1.3);
			opacity: 1;
		}
	}

	.loading-text {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		font-style: italic;
		animation: textFade 2s ease-in-out infinite;
	}

	@keyframes textFade {
		0%, 100% {
			opacity: 0.5;
		}
		50% {
			opacity: 0.7;
		}
	}

	/* Mobile responsive */
	@media (max-width: 640px) {
		.cosmic-input-container {
			padding: 0.75rem 1rem 1rem;
		}

		.input-wrapper {
			padding: 0.75rem;
			gap: 0.5rem;
		}

		.input-field {
			font-size: 16px; /* Prevent zoom on iOS */
		}

		.send-button {
			width: 36px;
			height: 36px;
		}

		.comet-icon {
			width: 16px;
			height: 16px;
		}
	}
</style>
