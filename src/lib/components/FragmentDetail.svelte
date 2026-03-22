<script lang="ts">
	import type { Fragment } from '$lib/types/agent';

	interface Props {
		fragment: Fragment;
		onclose: () => void;
	}

	let { fragment, onclose }: Props = $props();

	let isVisible = $state(false);

	// Animate in on mount
	$effect(() => {
		setTimeout(() => (isVisible = true), 10);
	});

	function handleClose() {
		isVisible = false;
		setTimeout(() => onclose(), 300);
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}
</script>

<svelte:body on:keydown={(e) => e.key === 'Escape' && handleClose()} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="backdrop" class:visible={isVisible} onclick={handleBackdropClick} onkeydown={(e) => e.key === 'Enter' && handleClose()} role="button" tabindex="-1">
	<div class="modal" class:visible={isVisible} role="dialog" aria-modal="true">
		<button class="close-btn" onclick={handleClose} aria-label="Close">
			<span>&times;</span>
		</button>

		<div class="modal-content">
			<div class="fragment-header">
				<span class="fragment-icon">◆</span>
				<span class="fragment-label">Fragment Revealed</span>
			</div>

			<p class="fragment-theme">{fragment.theme}</p>

			<div class="fragment-divider"></div>

			<p class="fragment-full">{fragment.full}</p>

			<div class="fragment-footer">
				<span class="fragment-id">{fragment.id}</span>
			</div>
		</div>

		<div class="modal-glow"></div>
	</div>
</div>

<style>
	/* Cold tech light palette */
	:root {
		--text-primary: rgba(224, 242, 254, 0.95);
		--accent-cyan: rgba(34, 211, 238, 0.95);
		--accent-teal: rgba(45, 212, 191, 0.9);
		--key-indigo: rgba(165, 180, 252, 0.95);
		--muted-slate: rgba(148, 163, 184, 0.6);
		--glow-cyan: rgba(34, 211, 238, 0.4);
		--glow-indigo: rgba(129, 140, 248, 0.3);
	}

	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.backdrop.visible {
		opacity: 1;
	}

	.modal {
		position: relative;
		max-width: 480px;
		width: 90%;
		background: rgba(15, 23, 42, 0.85);
		border: 1px solid rgba(34, 211, 238, 0.25);
		border-radius: 0.75rem;
		padding: 2rem;
		transform: scale(0.9) translateY(20px);
		opacity: 0;
		transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		overflow: hidden;
	}

	.modal.visible {
		transform: scale(1) translateY(0);
		opacity: 1;
	}

	.modal-glow {
		position: absolute;
		inset: -4px;
		background: linear-gradient(
			135deg,
			rgba(34, 211, 238, 0.12),
			rgba(129, 140, 248, 0.08),
			rgba(45, 212, 191, 0.08)
		);
		border-radius: 0.75rem;
		animation: glowPulse 4s ease-in-out infinite;
		z-index: -1;
		pointer-events: none;
	}

	@keyframes glowPulse {
		0%, 100% {
			opacity: 0.5;
		}
		50% {
			opacity: 0.9;
		}
	}

	.close-btn {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 1px solid rgba(148, 163, 184, 0.2);
		border-radius: 0.375rem;
		color: var(--muted-slate);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.close-btn:hover {
		border-color: var(--accent-cyan);
		color: var(--accent-cyan);
	}

	.close-btn span {
		font-size: 1.25rem;
		line-height: 1;
	}

	.modal-content {
		position: relative;
		z-index: 1;
	}

	.fragment-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.fragment-icon {
		color: var(--accent-cyan);
		font-size: 0.875rem;
		animation: shimmer 3s ease-in-out infinite;
	}

	@keyframes shimmer {
		0%, 100% {
			opacity: 0.7;
		}
		50% {
			opacity: 1;
		}
	}

	.fragment-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--accent-cyan);
	}

	.fragment-theme {
		font-size: 0.65rem;
		text-transform: capitalize;
		color: var(--muted-slate);
		letter-spacing: 0.1em;
		margin-bottom: 1rem;
	}

	.fragment-divider {
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(34, 211, 238, 0.3),
			rgba(129, 140, 248, 0.3),
			transparent
		);
		margin-bottom: 1.25rem;
	}

	.fragment-full {
		font-family: 'LXGW WenKai', 'PingFang SC', 'Microsoft YaHei', sans-serif;
		font-size: 1.05rem;
		line-height: 1.8;
		color: var(--text-primary);
		font-style: italic;
		margin-bottom: 1.5rem;
	}

	.fragment-footer {
		display: flex;
		justify-content: flex-end;
	}

	.fragment-id {
		font-size: 0.6rem;
		color: rgba(148, 163, 184, 0.4);
		font-family: monospace;
		letter-spacing: 0.05em;
	}

	@media (max-width: 640px) {
		.modal {
			padding: 1.5rem;
			margin: 1rem;
		}

		.fragment-full {
			font-size: 0.95rem;
		}
	}
</style>
