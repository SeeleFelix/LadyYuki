<script lang="ts">
  import { conversationStore } from "$lib/stores";

  interface Props {
    disabled?: boolean;
    placeholder?: string;
    loadingText?: string;
    onsubmit?: (message: string) => void;
  }

  let {
    disabled = false,
    placeholder = "向虚空倾诉...",
    loadingText = "沉思中...",
    onsubmit,
  }: Props = $props();

  let inputValue = $state("");
  let textareaRef: HTMLTextAreaElement;
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
    inputValue = "";

    // Reset textarea height
    if (textareaRef) {
      textareaRef.style.height = "auto";
    }

    onsubmit?.(message);
  }

  function handleInput() {
    if (isComposing) return;
    // Auto-resize textarea
    if (textareaRef) {
      textareaRef.style.height = "auto";
      textareaRef.style.height = Math.min(textareaRef.scrollHeight, 120) + "px";
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (isComposing) return;

    if (e.key === "Enter" && !e.shiftKey) {
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
  <form onsubmit={handleSubmit} class="input-form">
    <div class="input-wrapper">
      <textarea
        bind:this={textareaRef}
        bind:value={inputValue}
        oninput={handleInput}
        onkeydown={handleKeyDown}
        oncompositionstart={handleCompositionStart}
        oncompositionend={handleCompositionEnd}
        {placeholder}
        {disabled}
        rows="1"
        class="input-field"
      ></textarea>
      <button
        type="submit"
        disabled={disabled || !inputValue.trim()}
        class="send-button"
        aria-label="Send message"
      >
      </button>
    </div>
  </form>

  {#if currentConversation.isLoading}
    <div class="loading-indicator">
      <div class="loading-breath"></div>
      <span class="loading-text">{loadingText}</span>
    </div>
  {/if}
</div>

<style>
  /*
	 * Divine Input - The Void's Opening
	 * Not a "form", but an opening in the void where you pour your thoughts
	 * No borders, no backgrounds - pure emptiness with a blinking cursor
	 */

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

  .input-form {
    position: relative;
    max-width: 650px;
    margin: 0 auto;
  }

  /* The void opening - no visible container */
  .input-wrapper {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
    padding: 0.5rem 0;
    /* Completely dissolved - no visual presence */
    background: transparent;
    border: none;
    border-radius: 0;
    box-shadow: none;
    outline: none;
  }

  /* Text emerges from the void */
  .input-field {
    flex: 1;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.85);
    font-size: 1rem;
    line-height: 1.6;
    resize: none;
    outline: none;
    min-height: 24px;
    max-height: 120px;
    font-family: inherit;
    /* Subtle purple cursor - a guiding light in the void */
    caret-color: rgba(139, 92, 246, 0.6);
  }

  .input-field::placeholder {
    color: rgba(255, 255, 255, 0.2);
    font-style: italic;
  }

  /* The send button - a tiny light point, a prayer gesture */
  .send-button {
    width: 8px;
    height: 8px;
    background: rgba(139, 92, 246, 0.4);
    border-radius: 50%;
    border: none;
    cursor: pointer;
    flex-shrink: 0;
    margin-bottom: 8px;
    /* Gentle breathing glow on hover */
    transition: all 0.8s ease-in-out;
    box-shadow: 0 0 6px rgba(139, 92, 246, 0.3);
  }

  .send-button:hover:not(:disabled) {
    background: rgba(139, 92, 246, 0.6);
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
  }

  .send-button:disabled {
    opacity: 0.15;
    cursor: not-allowed;
    box-shadow: none;
  }

  /* Loading - organic breathing, not pulsing */
  .loading-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .loading-breath {
    width: 6px;
    height: 6px;
    background: rgba(139, 92, 246, 0.5);
    border-radius: 50%;
    /* Slow, organic breathing - not technical pulsing */
    animation: breathe 4s ease-in-out infinite;
  }

  @keyframes breathe {
    0%,
    100% {
      opacity: 0.4;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.1);
    }
  }

  .loading-text {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.35);
    font-style: italic;
    /* Gentle fade, like a whisper */
    animation: whisperFade 5s ease-in-out infinite;
  }

  @keyframes whisperFade {
    0%,
    100% {
      opacity: 0.35;
    }
    50% {
      opacity: 0.5;
    }
  }

  /* Mobile responsive */
  @media (max-width: 640px) {
    .cosmic-input-container {
      padding: 0.75rem 1rem 1rem;
    }

    .input-wrapper {
      padding: 0.5rem 0;
      gap: 0.75rem;
    }

    .input-field {
      font-size: 16px; /* Prevent zoom on iOS */
    }
  }
</style>
