<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { visualStore, shouldShowStars } from '$lib/stores';
	import type { Star, VisualState } from '$lib/types/agent';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let animationFrameId: number;
	let mouseX = 0;
	let mouseY = 0;
	let targetMouseX = 0;
	let targetMouseY = 0;

	// Reactive subscriptions
	let currentVisualState = $state($visualStore);
	let showStars = $state($shouldShowStars);

	// Multi-layer parallax stars
	interface ParallaxStar {
		x: number;
		y: number;
		baseX: number;
		baseY: number;
		size: number;
		opacity: number;
		twinklePhase: number;
		twinkleSpeed: number;
		layer: number; // 0 = far, 1 = mid, 2 = close
		color: string;
	}

	let parallaxStars: ParallaxStar[] = [];

	// Fragment stars (from the store)
	interface FragmentStar {
		star: Star;
		glowIntensity: number;
		pulsePhase: number;
	}

	let fragmentStars: FragmentStar[] = [];

	// Nebula blobs for atmospheric depth
	interface NebulaBlob {
		x: number;
		y: number;
		radius: number;
		opacity: number;
		color: string;
		speed: number;
		phase: number;
		noiseOffset: number;
	}

	let nebulaBlobs: NebulaBlob[] = [];

	// Flowing particles
	interface Particle {
		x: number;
		y: number;
		size: number;
		speed: number;
		opacity: number;
		angle: number;
		life: number;
		maxLife: number;
		color: { r: number; g: number; b: number };
	}

	let particles: Particle[] = [];

	// Simple noise function for organic movement
	function noise(x: number, y: number, seed: number): number {
		const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
		return n - Math.floor(n);
	}

	// Subscribe to stores
	$effect(() => {
		const unsub1 = visualStore.subscribe((v) => (currentVisualState = v));
		const unsub2 = shouldShowStars.subscribe((v) => (showStars = v));
		return () => {
			unsub1();
			unsub2();
		};
	});

	onMount(() => {
		ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Set canvas size
		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);

		// Create background elements
		createParallaxStars();
		createNebulaBlobs();
		createParticles();

		// Start animation
		animate();

		// Track mouse for parallax effect
		window.addEventListener('mousemove', handleMouseMove);
	});

	onDestroy(() => {
		if (!browser) return;
		window.removeEventListener('resize', resizeCanvas);
		window.removeEventListener('mousemove', handleMouseMove);
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
	});

	function resizeCanvas() {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		createParallaxStars();
		createNebulaBlobs();
		createParticles();
	}

	function createParallaxStars() {
		parallaxStars = [];
		const width = window.innerWidth;
		const height = window.innerHeight;

		// Layer 0: Far stars (slowest parallax)
		const farCount = Math.floor((width * height) / 25000);
		for (let i = 0; i < farCount; i++) {
			parallaxStars.push(createParallaxStar(width, height, 0));
		}

		// Layer 1: Mid stars
		const midCount = Math.floor((width * height) / 35000);
		for (let i = 0; i < midCount; i++) {
			parallaxStars.push(createParallaxStar(width, height, 1));
		}

		// Layer 2: Close stars (fastest parallax)
		const closeCount = Math.floor((width * height) / 50000);
		for (let i = 0; i < closeCount; i++) {
			parallaxStars.push(createParallaxStar(width, height, 2));
		}
	}

	function createParallaxStar(width: number, height: number, layer: number): ParallaxStar {
		const colors = [
			'rgba(255, 255, 255, 1)', // White
			'rgba(200, 200, 255, 1)', // Blue-white
			'rgba(255, 220, 200, 1)', // Warm white
			'rgba(180, 180, 255, 1)'  // Purple-white
		];

		const baseX = Math.random() * width;
		const baseY = Math.random() * height;

		return {
			x: baseX,
			y: baseY,
			baseX,
			baseY,
			size: layer === 0 ? 0.5 + Math.random() * 0.5 :
				  layer === 1 ? 0.8 + Math.random() * 0.7 :
				  1.2 + Math.random() * 1.0,
			opacity: layer === 0 ? 0.2 + Math.random() * 0.3 :
					 layer === 1 ? 0.3 + Math.random() * 0.4 :
					 0.4 + Math.random() * 0.4,
			twinklePhase: Math.random() * Math.PI * 2,
			twinkleSpeed: 0.5 + Math.random() * 1.5,
			layer,
			color: colors[Math.floor(Math.random() * colors.length)]
		};
	}

	function createNebulaBlobs() {
		nebulaBlobs = [];
		const count = 6;
		for (let i = 0; i < count; i++) {
			nebulaBlobs.push({
				x: Math.random() * window.innerWidth,
				y: Math.random() * window.innerHeight,
				radius: 200 + Math.random() * 300,
				opacity: 0.015 + Math.random() * 0.025,
				color: i % 3 === 0 ? '139, 92, 246' :
					   i % 3 === 1 ? '59, 130, 246' :
					   '236, 72, 153',
				speed: 0.0001 + Math.random() * 0.0002,
				phase: Math.random() * Math.PI * 2,
				noiseOffset: Math.random() * 1000
			});
		}
	}

	function createParticles() {
		particles = [];
		const count = Math.floor((window.innerWidth * window.innerHeight) / 25000);
		for (let i = 0; i < count; i++) {
			particles.push(createParticle());
		}
	}

	function createParticle(): Particle {
		const colors = [
			{ r: 139, g: 92, b: 246 }, // Purple
			{ r: 59, g: 130, b: 246 }, // Blue
			{ r: 236, g: 72, b: 153 }, // Pink
			{ r: 255, g: 255, b: 255 } // White
		];

		return {
			x: Math.random() * window.innerWidth,
			y: Math.random() * window.innerHeight,
			size: Math.random() * 2 + 0.5,
			speed: 0.15 + Math.random() * 0.3,
			opacity: Math.random() * 0.3 + 0.1,
			angle: Math.random() * Math.PI * 2,
			life: Math.random() * 100,
			maxLife: 100 + Math.random() * 150,
			color: colors[Math.floor(Math.random() * colors.length)]
		};
	}

	function handleMouseMove(e: MouseEvent) {
		targetMouseX = e.clientX;
		targetMouseY = e.clientY;
	}

	function animate() {
		if (!ctx) return;

		const time = Date.now() * 0.001;
		const state = currentVisualState.state;

		// Smooth mouse following
		mouseX += (targetMouseX - mouseX) * 0.05;
		mouseY += (targetMouseY - mouseY) * 0.05;

		// Calculate parallax offset based on mouse position
		const centerX = window.innerWidth / 2;
		const centerY = window.innerHeight / 2;
		const parallaxX = (mouseX - centerX) / centerX;
		const parallaxY = (mouseY - centerY) / centerY;

		// Clear canvas with base background
		ctx.fillStyle = getBackgroundColor(state, time);
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Draw nebula blobs
		drawNebulaBlobs(time);

		// Draw particles
		drawParticles(time);

		// Draw parallax stars
		drawParallaxStars(time, parallaxX, parallaxY, state);

		// Draw fragment stars (from the store)
		if (showStars) {
			for (const star of currentVisualState.stars) {
				drawFragmentStar(star, time, currentVisualState.isBreathing, state);
			}
		}

		// Subtle vignette effect
		drawVignette();

		animationFrameId = requestAnimationFrame(animate);
	}

	function getBackgroundColor(state: VisualState, time: number): string {
		const baseColor = { r: 10, g: 10, b: 15 };

		switch (state) {
			case 'revelation':
				// Deep purple/gold tint
				return `rgb(${Math.floor(baseColor.r + Math.sin(time * 0.2) * 5)}, ${baseColor.g}, ${Math.floor(baseColor.b + 10)})`;
			case 'invitation':
				// Warm golden tint
				return `rgb(${Math.floor(baseColor.r + 8)}, ${Math.floor(baseColor.g + 5)}, ${baseColor.b})`;
			case 'constellation':
				// Slightly more blue
				return `rgb(${baseColor.r}, ${baseColor.g}, ${Math.floor(baseColor.b + 5)})`;
			default:
				return `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
		}
	}

	function drawNebulaBlobs(time: number) {
		for (const blob of nebulaBlobs) {
			// Organic movement using noise
			const noiseVal1 = noise(time * blob.speed * 1000, blob.noiseOffset, 0);
			const noiseVal2 = noise(time * blob.speed * 1000, blob.noiseOffset, 100);

			const offsetX = (noiseVal1 - 0.5) * 100;
			const offsetY = (noiseVal2 - 0.5) * 100;

			const pulseOpacity = blob.opacity * (0.6 + 0.4 * Math.sin(time * blob.speed * 1000 + blob.phase));

			const gradient = ctx!.createRadialGradient(
				blob.x + offsetX + Math.sin(time * 0.05 + blob.phase) * 30,
				blob.y + offsetY + Math.cos(time * 0.05 + blob.phase) * 20,
				0,
				blob.x + offsetX,
				blob.y + offsetY,
				blob.radius
			);

			gradient.addColorStop(0, `rgba(${blob.color}, ${pulseOpacity})`);
			gradient.addColorStop(0.4, `rgba(${blob.color}, ${pulseOpacity * 0.4})`);
			gradient.addColorStop(0.7, `rgba(${blob.color}, ${pulseOpacity * 0.1})`);
			gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

			ctx!.fillStyle = gradient;
			ctx!.fillRect(0, 0, canvas.width, canvas.height);
		}
	}

	function drawParticles(time: number) {
		for (let i = 0; i < particles.length; i++) {
			const p = particles[i];

			// Update position with gentle drift
			p.x += Math.cos(p.angle) * p.speed;
			p.y += Math.sin(p.angle) * p.speed;
			p.life++;

			// Slowly rotate angle for organic movement
			p.angle += 0.008;

			// Fade based on life
			const lifeRatio = p.life / p.maxLife;
			const currentOpacity = p.opacity * Math.sin(lifeRatio * Math.PI);

			// Draw particle
			ctx!.beginPath();
			ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
			ctx!.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${currentOpacity})`;
			ctx!.fill();

			// Reset particle if dead or off-screen
			if (p.life >= p.maxLife || p.x < -50 || p.x > canvas.width + 50 || p.y < -50 || p.y > canvas.height + 50) {
				particles[i] = createParticle();
			}
		}
	}

	function drawParallaxStars(time: number, parallaxX: number, parallaxY: number, state: VisualState) {
		// Parallax multipliers for each layer
		const parallaxMultipliers = [0.01, 0.025, 0.05]; // far, mid, close

		for (const star of parallaxStars) {
			// Calculate parallax offset
			const multiplier = parallaxMultipliers[star.layer];
			const offsetX = parallaxX * window.innerWidth * multiplier;
			const offsetY = parallaxY * window.innerHeight * multiplier;

			// Update position with parallax
			star.x = star.baseX + offsetX;
			star.y = star.baseY + offsetY;

			// Twinkle effect
			const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
			const opacity = star.opacity * (0.7 + twinkle * 0.3);

			// Enhance brightness during revelation
			const brightnessMultiplier = state === 'revelation' ? 1.5 : 1;

			// Draw star
			ctx!.beginPath();
			ctx!.arc(star.x, star.y, star.size, 0, Math.PI * 2);
			ctx!.fillStyle = star.color.replace('1)', `${opacity * brightnessMultiplier})`);
			ctx!.fill();

			// Add subtle glow for close stars
			if (star.layer === 2 && opacity > 0.5) {
				ctx!.beginPath();
				ctx!.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
				ctx!.fillStyle = `rgba(255, 255, 255, ${opacity * 0.1})`;
				ctx!.fill();
			}
		}
	}

	function drawFragmentStar(star: Star, time: number, isBreathing: boolean, state: VisualState) {
		if (!ctx) return;

		const age = (Date.now() - star.createdAt) / 1000;
		const entranceScale = Math.min(1, age * 2);

		// Calculate breathing effect
		let breathScale = 1;
		if (isBreathing) {
			breathScale = 1 + Math.sin(time * 1.5) * 0.15;
		}

		// Twinkle
		const twinkle = Math.sin(time * star.twinkleSpeed + star.id.charCodeAt(5));

		const size = star.size * entranceScale * breathScale;
		const brightness = star.brightness + twinkle * 0.15;

		// Different glow colors based on state
		const glowColors = {
			dialogue: { inner: '139, 92, 246', outer: '59, 130, 246' },
			stars: { inner: '139, 92, 246', outer: '236, 72, 153' },
			constellation: { inner: '236, 72, 153', outer: '139, 92, 246' },
			revelation: { inner: '255, 200, 100', outer: '255, 150, 50' },
			invitation: { inner: '255, 220, 150', outer: '200, 150, 100' }
		};

		const colors = glowColors[state] || glowColors.dialogue;

		// Outer glow
		const glowGradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, size * 10);
		glowGradient.addColorStop(0, `rgba(${colors.inner}, ${brightness * 0.4})`);
		glowGradient.addColorStop(0.3, `rgba(${colors.outer}, ${brightness * 0.2})`);
		glowGradient.addColorStop(0.6, `rgba(${colors.inner}, ${brightness * 0.1})`);
		glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

		ctx.beginPath();
		ctx.arc(star.x, star.y, size * 10, 0, Math.PI * 2);
		ctx.fillStyle = glowGradient;
		ctx.fill();

		// Core star
		ctx.beginPath();
		ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
		ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
		ctx.fill();

		// Inner bright core
		ctx.beginPath();
		ctx.arc(star.x, star.y, size * 0.5, 0, Math.PI * 2);
		ctx.fillStyle = 'rgba(255, 255, 255, 1)';
		ctx.fill();

		// Add spark effect during revelation
		if (state === 'revelation') {
			drawSparkles(star.x, star.y, size, time);
		}
	}

	function drawSparkles(x: number, y: number, size: number, time: number) {
		const sparkCount = 4;
		for (let i = 0; i < sparkCount; i++) {
			const angle = (i / sparkCount) * Math.PI * 2 + time * 0.5;
			const distance = size * 3 + Math.sin(time * 2 + i) * size;

			const sparkX = x + Math.cos(angle) * distance;
			const sparkY = y + Math.sin(angle) * distance;

			ctx!.beginPath();
			ctx!.arc(sparkX, sparkY, 1, 0, Math.PI * 2);
			ctx!.fillStyle = `rgba(255, 220, 150, ${0.5 + Math.sin(time * 3 + i) * 0.3})`;
			ctx!.fill();
		}
	}

	function drawVignette() {
		const gradient = ctx!.createRadialGradient(
			canvas.width / 2,
			canvas.height / 2,
			0,
			canvas.width / 2,
			canvas.height / 2,
			Math.max(canvas.width, canvas.height) * 0.7
		);
		gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
		gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
		gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');

		ctx!.fillStyle = gradient;
		ctx!.fillRect(0, 0, canvas.width, canvas.height);
	}
</script>

<canvas bind:this={canvas} class="fixed inset-0 w-full h-full pointer-events-none" />

<style>
	canvas {
		z-index: 0;
	}
</style>
