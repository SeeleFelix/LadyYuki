<script lang="ts">
	interface Props {
		disabled?: boolean;
		onsubmit: (message: string) => void;
	}

	let { disabled = false, onsubmit }: Props = $props();
	let value = $state('');
	let isFocused = $state(false);

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!value.trim() || disabled) return;
		onsubmit(value.trim());
		value = '';
	}
</script>

<form class="light-input-wrap" onsubmit={handleSubmit}>
	<div class="input-container" class:focused={isFocused}>
		<input
			type="text"
			bind:value
			onfocus={() => (isFocused = true)}
			onblur={() => (isFocused = false)}
			disabled={disabled}
			placeholder="Speak to the space..."
			class="light-field"
			autocomplete="off"
		/>
		<button type="submit" class="send-btn" disabled={disabled || !value.trim()} aria-label="Send message">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" />
			</svg>
		</button>
	</div>
</form>

<style>
	.light-input-wrap {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		width: min(500px, 90vw);
		z-index: 40;
	}

	.input-container {
		display: flex;
		align-items: center;
		background: rgba(10, 10, 20, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 24px;
		padding: 0.5rem 0.75rem;
		backdrop-filter: blur(12px);
		transition: border-color 0.3s, box-shadow 0.3s;
	}

	.input-container.focused {
		border-color: rgba(139, 92, 246, 0.3);
		box-shadow: 0 0 20px rgba(139, 92, 246, 0.08);
	}

	.light-field {
		flex: 1;
		background: none;
		border: none;
		outline: none;
		color: rgba(255, 255, 255, 0.85);
		font-size: 0.9rem;
		font-family: 'Inter', sans-serif;
		padding: 0.4rem 0.5rem;
	}

	.light-field::placeholder {
		color: rgba(255, 255, 255, 0.25);
		font-style: italic;
	}

	.light-field:disabled {
		opacity: 0.4;
	}

	.send-btn {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.3);
		padding: 0.35rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		transition: color 0.2s;
	}

	.send-btn:hover:not(:disabled) {
		color: rgba(139, 92, 246, 0.8);
	}

	.send-btn:disabled {
		opacity: 0.2;
		cursor: default;
	}
</style>
