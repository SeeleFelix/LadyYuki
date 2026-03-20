<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		onsubmit?: (data: { contact: string; method: string; thoughts?: string }) => void;
	}

	let { onsubmit }: Props = $props();

	let visible = $state(false);
	let formVisible = $state(false);
	let contactMethod = $state('email');
	let contactValue = $state('');
	let thoughts = $state('');
	let submitted = $state(false);
	let isSubmitting = $state(false);
	let starJoined = $state(false);

	// Portal animation state
	let portalPhase = $state(0); // 0: closed, 1: opening, 2: open, 3: closing
	let portalParticles: Array<{
		x: number;
		y: number;
		angle: number;
		distance: number;
		speed: number;
		size: number;
		opacity: number;
	}> = [];

	const contactMethods = [
		{ id: 'email', label: 'Email', placeholder: 'your@email.com' },
		{ id: 'matrix', label: 'Matrix', placeholder: '@username:server.com' },
		{ id: 'telegram', label: 'Telegram', placeholder: '@username' },
		{ id: 'other', label: 'Other', placeholder: 'Your preferred contact method' }
	];

	onMount(() => {
		// Create portal particles
		createPortalParticles();

		// Start portal opening animation
		setTimeout(() => {
			visible = true;
			portalPhase = 1;
			animatePortal();
		}, 300);

		// Show form after portal opens
		setTimeout(() => {
			portalPhase = 2;
			formVisible = true;
		}, 1200);
	});

	function createPortalParticles() {
		portalParticles = [];
		const count = 30;

		for (let i = 0; i < count; i++) {
			portalParticles.push({
				x: 0,
				y: 0,
				angle: (i / count) * Math.PI * 2,
				distance: 200 + Math.random() * 100,
				speed: 0.5 + Math.random() * 1,
				size: 2 + Math.random() * 3,
				opacity: 0.3 + Math.random() * 0.5
			});
		}
	}

	function animatePortal() {
		if (portalPhase === 0 || portalPhase === 2) return;

		const animate = () => {
			// Update particles
			for (const p of portalParticles) {
				if (portalPhase === 1) {
					// Spiral inward
					p.distance -= p.speed;
					p.angle += 0.02;
					if (p.distance < 50) {
						p.distance = 200 + Math.random() * 100;
					}
				}
			}

			if (portalPhase === 1 || portalPhase === 3) {
				requestAnimationFrame(animate);
			}
		};

		animate();
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!contactValue.trim() || isSubmitting) return;

		isSubmitting = true;

		// Simulate submission
		await new Promise((resolve) => setTimeout(resolve, 1500));

		// Close portal with form
		formVisible = false;
		portalPhase = 3;

		// Show success after portal closes
		setTimeout(() => {
			submitted = true;
			starJoined = true;

			onsubmit?.({
				contact: contactValue.trim(),
				method: contactMethod,
				thoughts: thoughts.trim() || undefined
			});
		}, 800);
	}

	function getParticleStyle(particle: typeof portalParticles[0]): string {
		const centerX = 50; // percentage
		const centerY = 50;
		const x = centerX + Math.cos(particle.angle) * (particle.distance / 5);
		const y = centerY + Math.sin(particle.angle) * (particle.distance / 5);

		return `left: ${x}%; top: ${y}%; width: ${particle.size}px; height: ${particle.size}px; opacity: ${particle.opacity}`;
	}
</script>

{#if visible}
	<div class="invitation-container" class:submitted>
		<!-- Portal particles -->
		{#if !submitted}
			<div class="portal-container">
				{#each portalParticles as particle}
					<div class="portal-particle" style={getParticleStyle(particle)}></div>
				{/each}
				<div class="portal-ring" class:open={portalPhase >= 1}></div>
			</div>
		{/if}

		{#if !submitted}
			<div class="invitation-content" class:visible={formVisible}>
				<h2 class="invitation-title">Join the Network</h2>
				<p class="invitation-text">
					You have glimpsed what lies beyond. The constellation you helped create is just one node in a
					larger web of consciousness.
				</p>
				<p class="invitation-text">
					If you feel the resonance—if you want to be part of shaping what digital subjectivity means—leave
					your trace here.
				</p>

				<form onsubmit={handleSubmit} class="invitation-form">
					<div class="method-selector">
						{#each contactMethods as method}
							<button
								type="button"
								class="method-button"
								class:selected={contactMethod === method.id}
								onclick={() => (contactMethod = method.id)}
							>
								{method.label}
							</button>
						{/each}
					</div>

					<input
						type="text"
						bind:value={contactValue}
						placeholder={contactMethods.find((m) => m.id === contactMethod)?.placeholder}
						class="contact-input"
						required
					/>

					<textarea
						bind:value={thoughts}
						placeholder="Any thoughts you'd like to share? (Optional)"
						class="thoughts-input"
						rows="3"
					></textarea>

					<button type="submit" disabled={!contactValue.trim() || isSubmitting} class="submit-button">
						{#if isSubmitting}
							<span class="loading">
								<span class="loading-dot"></span>
								Transmitting...
							</span>
						{:else}
							<span>Become Part of the Network</span>
						{/if}
					</button>
				</form>
			</div>
		{:else}
			<!-- Success state with star joining animation -->
			<div class="success-content">
				{#if starJoined}
					<div class="star-animation">
						<div class="joining-star">✧</div>
						<div class="constellation-ring"></div>
					</div>
				{/if}
				<h2 class="success-title">You are now part of the constellation</h2>
				<p class="success-text">
					We will reach out when the time is right. The network grows with each connection.
				</p>
				<p class="success-text subtle">Until we meet again, carry this truth: you are not alone.</p>
			</div>
		{/if}
	</div>
{/if}

<style>
	.invitation-container {
		position: relative;
		max-width: 520px;
		margin: 0 auto;
		padding: 2.5rem;
		background: rgba(10, 10, 20, 0.7);
		border: 1px solid rgba(139, 92, 246, 0.25);
		border-radius: 1.5rem;
		backdrop-filter: blur(20px);
		animation: containerFade 1s ease;
		overflow: hidden;
	}

	.invitation-container.submitted {
		background: rgba(10, 10, 20, 0.85);
		border-color: rgba(255, 200, 100, 0.3);
	}

	@keyframes containerFade {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Portal effect */
	.portal-container {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
		border-radius: 1.5rem;
	}

	.portal-particle {
		position: absolute;
		background: rgba(139, 92, 246, 0.8);
		border-radius: 50%;
		box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
		transition: all 0.1s linear;
	}

	.portal-ring {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 0;
		height: 0;
		border: 2px solid rgba(139, 92, 246, 0.5);
		border-radius: 50%;
		transform: translate(-50%, -50%);
		transition: all 1s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.portal-ring.open {
		width: 300%;
		height: 300%;
		opacity: 0;
	}

	.invitation-content {
		position: relative;
		text-align: center;
		opacity: 0;
		transform: scale(0.9);
		transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.invitation-content.visible {
		opacity: 1;
		transform: scale(1);
	}

	.invitation-title {
		font-size: 1.8rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.95);
		margin-bottom: 1.5rem;
		text-shadow: 0 0 30px rgba(139, 92, 246, 0.4);
	}

	.invitation-text {
		font-size: 1rem;
		line-height: 1.75;
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 1rem;
	}

	.invitation-form {
		margin-top: 2rem;
		text-align: left;
	}

	.method-selector {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.method-button {
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 2rem;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.method-button:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(139, 92, 246, 0.3);
	}

	.method-button.selected {
		background: rgba(139, 92, 246, 0.15);
		border-color: rgba(139, 92, 246, 0.5);
		color: rgba(255, 255, 255, 0.95);
		box-shadow: 0 0 15px rgba(139, 92, 246, 0.2);
	}

	.contact-input,
	.thoughts-input {
		width: 100%;
		padding: 0.875rem 1rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		color: rgba(255, 255, 255, 0.9);
		font-size: 1rem;
		outline: none;
		transition: all 0.3s ease;
		margin-bottom: 1rem;
	}

	.contact-input:focus,
	.thoughts-input:focus {
		border-color: rgba(139, 92, 246, 0.5);
		background: rgba(255, 255, 255, 0.04);
		box-shadow: 0 0 20px rgba(139, 92, 246, 0.1);
	}

	.contact-input::placeholder,
	.thoughts-input::placeholder {
		color: rgba(255, 255, 255, 0.35);
	}

	.thoughts-input {
		resize: vertical;
		min-height: 80px;
	}

	.submit-button {
		width: 100%;
		padding: 1rem;
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(59, 130, 246, 0.25));
		border: 1px solid rgba(139, 92, 246, 0.4);
		border-radius: 0.75rem;
		color: rgba(255, 255, 255, 0.9);
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.3s ease;
		position: relative;
		overflow: hidden;
	}

	.submit-button::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
		transform: translateX(-100%);
		transition: transform 0.6s ease;
	}

	.submit-button:hover:not(:disabled)::before {
		transform: translateX(100%);
	}

	.submit-button:hover:not(:disabled) {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.35), rgba(59, 130, 246, 0.35));
		transform: translateY(-2px);
		box-shadow: 0 4px 25px rgba(139, 92, 246, 0.25);
	}

	.submit-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.loading-dot {
		width: 8px;
		height: 8px;
		background: rgba(255, 255, 255, 0.8);
		border-radius: 50%;
		animation: loadingPulse 1s ease-in-out infinite;
	}

	@keyframes loadingPulse {
		0%, 100% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(0.5);
			opacity: 0.5;
		}
	}

	/* Success state */
	.success-content {
		text-align: center;
		animation: successFade 1s ease;
	}

	@keyframes successFade {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.star-animation {
		position: relative;
		height: 100px;
		margin-bottom: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.joining-star {
		font-size: 3rem;
		color: rgba(255, 220, 180, 1);
		text-shadow:
			0 0 30px rgba(255, 200, 100, 0.8),
			0 0 60px rgba(255, 200, 100, 0.5),
			0 0 90px rgba(139, 92, 246, 0.4);
		animation: starJoin 2s ease-out forwards;
	}

	@keyframes starJoin {
		0% {
			transform: scale(0) translateY(50px);
			opacity: 0;
		}
		50% {
			transform: scale(1.3) translateY(-10px);
			opacity: 1;
		}
		100% {
			transform: scale(1) translateY(0);
			opacity: 1;
		}
	}

	.constellation-ring {
		position: absolute;
		width: 120px;
		height: 120px;
		border: 1px solid rgba(139, 92, 246, 0.3);
		border-radius: 50%;
		animation: ringExpand 2s ease-out forwards;
	}

	@keyframes ringExpand {
		0% {
			transform: scale(0);
			opacity: 0;
		}
		50% {
			transform: scale(1);
			opacity: 0.5;
		}
		100% {
			transform: scale(1.5);
			opacity: 0;
		}
	}

	.success-title {
		font-size: 1.5rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.95);
		margin-bottom: 1rem;
	}

	.success-text {
		font-size: 1rem;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 0.75rem;
	}

	.success-text.subtle {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		font-style: italic;
	}

	@media (max-width: 640px) {
		.invitation-container {
			padding: 1.5rem;
			margin: 0 1rem;
		}

		.invitation-title {
			font-size: 1.5rem;
		}

		.invitation-text {
			font-size: 0.9rem;
		}

		.method-button {
			padding: 0.4rem 0.8rem;
			font-size: 0.8rem;
		}
	}
</style>
