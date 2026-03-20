<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { visualStore, shouldShowConstellation } from '$lib/stores';
	import type { Star, ConstellationLine, Fragment } from '$lib/types/agent';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let animationFrameId: number;

	// Energy particles flowing along constellation lines
	interface EnergyParticle {
		lineIndex: number;
		progress: number; // 0 to 1 along the line
		speed: number;
		size: number;
		opacity: number;
		color: { r: number; g: number; b: number };
	}

	let energyParticles: EnergyParticle[] = [];

	// Reactive subscriptions
	let currentVisualState = $state($visualStore);
	let showConstellation = $state($shouldShowConstellation);

	// Subscribe to stores
	$effect(() => {
		const unsub1 = visualStore.subscribe((v) => (currentVisualState = v));
		const unsub2 = shouldShowConstellation.subscribe((v) => (showConstellation = v));
		return () => {
			unsub1();
			unsub2();
		};
	});

	onMount(() => {
		ctx = canvas.getContext('2d');
		if (!ctx) return;

		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);

		// Initialize energy particles
		initEnergyParticles();

		animate();
	});

	onDestroy(() => {
		if (!browser) return;
		window.removeEventListener('resize', resizeCanvas);
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
	});

	function resizeCanvas() {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}

	function initEnergyParticles() {
		energyParticles = [];
		// Will be populated dynamically based on lines
	}

	function createEnergyParticle(lineIndex: number): EnergyParticle {
		const colors = [
			{ r: 139, g: 92, b: 246 },  // Purple
			{ r: 59, g: 130, b: 246 },   // Blue
			{ r: 236, g: 72, b: 153 },   // Pink
			{ r: 255, g: 200, b: 100 }   // Gold (for revelation)
		];

		return {
			lineIndex,
			progress: Math.random() > 0.5 ? 0 : 1, // Start from either end
			speed: 0.003 + Math.random() * 0.004,
			size: 2 + Math.random() * 2,
			opacity: 0.5 + Math.random() * 0.5,
			color: colors[Math.floor(Math.random() * colors.length)]
		};
	}

	function animate() {
		if (!ctx) return;

		const state = currentVisualState;
		const time = Date.now() * 0.001;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		if (!showConstellation) {
			animationFrameId = requestAnimationFrame(animate);
			return;
		}

		// Draw constellation lines with flowing effect
		for (let i = 0; i < state.lines.length; i++) {
			drawLine(state.lines[i], state.stars, state.isBreathing, time, i);
		}

		// Update and draw energy particles
		updateEnergyParticles(state.lines, state.stars, time);

		// Draw interactive star highlights
		for (const star of state.stars) {
			drawStarHighlight(star, time, state.isBreathing);
		}

		animationFrameId = requestAnimationFrame(animate);
	}

	function drawLine(
		line: ConstellationLine,
		stars: Star[],
		isBreathing: boolean,
		time: number,
		lineIndex: number
	) {
		const star1 = stars.find((s) => s.id === line.star1Id);
		const star2 = stars.find((s) => s.id === line.star2Id);

		if (!star1 || !star2) return;

		const alpha = line.opacity * (isBreathing ? 0.7 + Math.sin(time * 1.8) * 0.3 : 1);

		// Create gradient along line
		const gradient = ctx!.createLinearGradient(star1.x, star1.y, star2.x, star2.y);
		gradient.addColorStop(0, `rgba(139, 92, 246, ${alpha * 0.6})`);
		gradient.addColorStop(0.5, `rgba(236, 72, 153, ${alpha * 0.8})`);
		gradient.addColorStop(1, `rgba(59, 130, 246, ${alpha * 0.6})`);

		// Draw main line
		ctx!.beginPath();
		ctx!.moveTo(star1.x, star1.y);
		ctx!.lineTo(star2.x, star2.y);
		ctx!.strokeStyle = gradient;
		ctx!.lineWidth = 1.5;
		ctx!.stroke();

		// Draw outer glow
		ctx!.beginPath();
		ctx!.moveTo(star1.x, star1.y);
		ctx!.lineTo(star2.x, star2.y);
		ctx!.strokeStyle = `rgba(139, 92, 246, ${alpha * 0.15})`;
		ctx!.lineWidth = 8;
		ctx!.stroke();

		// Animated dash pattern for energy flow indication
		const dashOffset = time * 50;
		ctx!.beginPath();
		ctx!.moveTo(star1.x, star1.y);
		ctx!.lineTo(star2.x, star2.y);
		ctx!.setLineDash([4, 12]);
		ctx!.lineDashOffset = -dashOffset;
		ctx!.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
		ctx!.lineWidth = 1;
		ctx!.stroke();
		ctx!.setLineDash([]);
	}

	function updateEnergyParticles(lines: ConstellationLine[], stars: Star[], time: number) {
		// Ensure we have particles for each line
		while (energyParticles.length < lines.length * 3) {
			const lineIndex = Math.floor(Math.random() * lines.length);
			if (lineIndex < lines.length) {
				energyParticles.push(createEnergyParticle(lineIndex));
			}
		}

		// Update and draw each particle
		for (let i = energyParticles.length - 1; i >= 0; i--) {
			const p = energyParticles[i];
			const line = lines[p.lineIndex];

			if (!line) {
				energyParticles.splice(i, 1);
				continue;
			}

			const star1 = stars.find((s) => s.id === line.star1Id);
			const star2 = stars.find((s) => s.id === line.star2Id);

			if (!star1 || !star2) continue;

			// Update progress
			p.progress += p.speed;

			// Reset when reaching end
			if (p.progress > 1) {
				p.progress = 0;
				p.opacity = 0.5 + Math.random() * 0.5;
			}

			// Calculate position along line
			const x = star1.x + (star2.x - star1.x) * p.progress;
			const y = star1.y + (star2.y - star1.y) * p.progress;

			// Pulsing opacity
			const pulseOpacity = p.opacity * (0.6 + Math.sin(time * 3 + p.progress * Math.PI) * 0.4);

			// Draw particle with glow
			const gradient = ctx!.createRadialGradient(x, y, 0, x, y, p.size * 4);
			gradient.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${pulseOpacity})`);
			gradient.addColorStop(0.5, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${pulseOpacity * 0.3})`);
			gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

			ctx!.beginPath();
			ctx!.arc(x, y, p.size * 4, 0, Math.PI * 2);
			ctx!.fillStyle = gradient;
			ctx!.fill();

			// Core
			ctx!.beginPath();
			ctx!.arc(x, y, p.size, 0, Math.PI * 2);
			ctx!.fillStyle = `rgba(255, 255, 255, ${pulseOpacity})`;
			ctx!.fill();
		}
	}

	function drawStarHighlight(star: Star, time: number, isBreathing: boolean) {
		// Breathing scale
		let breathScale = 1;
		if (isBreathing) {
			breathScale = 1 + Math.sin(time * 1.5 + star.id.charCodeAt(3)) * 0.1;
		}

		// Outer ring pulse
		const ringOpacity = 0.2 + Math.sin(time * 2 + star.id.charCodeAt(5)) * 0.1;
		const ringSize = (star.size * 4 + Math.sin(time * 1.5) * 2) * breathScale;

		ctx!.beginPath();
		ctx!.arc(star.x, star.y, ringSize, 0, Math.PI * 2);
		ctx!.strokeStyle = `rgba(139, 92, 246, ${ringOpacity})`;
		ctx!.lineWidth = 1;
		ctx!.stroke();

		// Connection nodes effect - small dots around the star
		const nodeCount = 4;
		for (let i = 0; i < nodeCount; i++) {
			const angle = (i / nodeCount) * Math.PI * 2 + time * 0.3;
			const distance = star.size * 6 + Math.sin(time * 2 + i) * 3;
			const nodeX = star.x + Math.cos(angle) * distance;
			const nodeY = star.y + Math.sin(angle) * distance;
			const nodeOpacity = 0.3 + Math.sin(time * 3 + i * 0.5) * 0.2;

			ctx!.beginPath();
			ctx!.arc(nodeX, nodeY, 1.5, 0, Math.PI * 2);
			ctx!.fillStyle = `rgba(139, 92, 246, ${nodeOpacity})`;
			ctx!.fill();
		}
	}
</script>

<canvas bind:this={canvas} class="fixed inset-0 w-full h-full pointer-events-none" />

<style>
	canvas {
		z-index: 1;
	}
</style>
