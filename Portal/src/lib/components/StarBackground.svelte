<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let animationFrameId: number;
	let mouseX = 0, mouseY = 0;
	let targetMouseX = 0, targetMouseY = 0;

	// ── Parallax star layers ──
	interface ParallaxStar {
		x: number; y: number; baseX: number; baseY: number;
		size: number; opacity: number;
		twinklePhase: number; twinkleSpeed: number;
		layer: number; // 0=far, 1=mid, 2=near
		temperature: number; // 0=cool blue, 0.5=white, 1=warm gold
		flare: boolean; // cross flare for near bright stars
	}
	let parallaxStars: ParallaxStar[] = [];

	// ── Nebula blobs ──
	interface NebulaBlob {
		x: number; y: number; baseX: number; baseY: number;
		radius: number; opacity: number;
		color: { r: number; g: number; b: number };
		speed: number; phase: number; noiseOffset: number;
	}
	let nebulaBlobs: NebulaBlob[] = [];

	// ── Cosmic dust particles ──
	interface DustParticle {
		x: number; y: number;
		size: number; opacity: number;
		vx: number; vy: number;
		color: { r: number; g: number; b: number };
		life: number; maxLife: number;
	}
	let dustParticles: DustParticle[] = [];

	// Simple noise for organic movement
	function noise(x: number, y: number, seed: number): number {
		const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
		return n - Math.floor(n);
	}

	function starColor(temperature: number): { r: number; g: number; b: number } {
		// 0 = cool blue-white → 0.5 = pure white → 1 = warm gold
		if (temperature < 0.5) {
			const t = temperature * 2;
			return {
				r: Math.floor(180 + 75 * t),
				g: Math.floor(200 + 55 * t),
				b: Math.floor(255)
			};
		} else {
			const t = (temperature - 0.5) * 2;
			return {
				r: Math.floor(255),
				g: Math.floor(255 - 55 * t),
				b: Math.floor(255 - 155 * t)
			};
		}
	}

	onMount(() => {
		ctx = canvas.getContext('2d');
		if (!ctx) return;

		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);
		window.addEventListener('mousemove', handleMouseMove);

		createParallaxStars();
		createNebulaBlobs();
		createDustParticles();

		animate();
	});

	onDestroy(() => {
		if (!browser) return;
		window.removeEventListener('resize', resizeCanvas);
		window.removeEventListener('mousemove', handleMouseMove);
		if (animationFrameId) cancelAnimationFrame(animationFrameId);
	});

	function resizeCanvas() {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		createParallaxStars();
		createNebulaBlobs();
		createDustParticles();
	}

	function createParallaxStars() {
		parallaxStars = [];
		const w = window.innerWidth, h = window.innerHeight;

		// Far layer: ~2000 tiny stars
		for (let i = 0; i < 2000; i++) {
			parallaxStars.push(createStar(w, h, 0));
		}
		// Mid layer: ~1000 medium stars
		for (let i = 0; i < 1000; i++) {
			parallaxStars.push(createStar(w, h, 1));
		}
		// Near layer: ~300 brighter stars
		for (let i = 0; i < 300; i++) {
			parallaxStars.push(createStar(w, h, 2));
		}
	}

	function createStar(w: number, h: number, layer: number): ParallaxStar {
		const temp = Math.random();
		return {
			x: Math.random() * w, y: Math.random() * h,
			baseX: Math.random() * w, baseY: Math.random() * h,
			size: layer === 0 ? 0.5 + Math.random() * 0.6 :
			      layer === 1 ? 0.8 + Math.random() * 1.0 :
			      1.5 + Math.random() * 2.5,
			opacity: layer === 0 ? 0.15 + Math.random() * 0.35 :
			         layer === 1 ? 0.3 + Math.random() * 0.4 :
			         0.5 + Math.random() * 0.4,
			twinklePhase: Math.random() * Math.PI * 2,
			twinkleSpeed: layer === 0 ? 0.3 + Math.random() * 1.0 :
			              layer === 1 ? 0.4 + Math.random() * 1.2 :
			              0.5 + Math.random() * 1.5,
			layer,
			temperature: temp,
			flare: layer === 2 && Math.random() < 0.08 // 8% of near stars get cross flare
		};
	}

	function createNebulaBlobs() {
		nebulaBlobs = [];
		const colors = [
			{ r: 139, g: 92, b: 246 },   // Purple
			{ r: 59, g: 130, b: 246 },    // Blue
			{ r: 236, g: 72, b: 153 },    // Pink
			{ r: 99, g: 102, b: 241 },    // Indigo
			{ r: 6, g: 182, b: 212 },     // Cyan
			{ r: 180, g: 130, b: 255 }    // Violet
		];
		const w = window.innerWidth, h = window.innerHeight;

		for (let i = 0; i < 6; i++) {
			nebulaBlobs.push({
				x: Math.random() * w, y: Math.random() * h,
				baseX: Math.random() * w, baseY: Math.random() * h,
				radius: 250 + Math.random() * 400,
				opacity: 0.015 + Math.random() * 0.03,
				color: colors[i],
				speed: 0.008 + Math.random() * 0.015,
				phase: Math.random() * Math.PI * 2,
				noiseOffset: Math.random() * 1000
			});
		}
	}

	function createDustParticles() {
		dustParticles = [];
		const w = window.innerWidth, h = window.innerHeight;
		for (let i = 0; i < 180; i++) {
			dustParticles.push(createDust(w, h));
		}
	}

	function createDust(w: number, h: number): DustParticle {
		const colors = [
			{ r: 139, g: 92, b: 246 },
			{ r: 59, g: 130, b: 246 },
			{ r: 236, g: 72, b: 153 },
			{ r: 255, g: 220, b: 180 }
		];
		return {
			x: Math.random() * w, y: Math.random() * h,
			size: 0.5 + Math.random() * 1.5,
			opacity: 0.1 + Math.random() * 0.3,
			vx: (Math.random() - 0.5) * 0.3,
			vy: (Math.random() - 0.5) * 0.3,
			color: colors[Math.floor(Math.random() * colors.length)],
			life: Math.random() * 300,
			maxLife: 200 + Math.random() * 300
		};
	}

	function handleMouseMove(e: MouseEvent) {
		targetMouseX = e.clientX;
		targetMouseY = e.clientY;
	}

	function animate() {
		if (!ctx) return;
		const time = Date.now() * 0.001;

		mouseX += (targetMouseX - mouseX) * 0.03;
		mouseY += (targetMouseY - mouseY) * 0.03;

		const centerX = window.innerWidth / 2;
		const centerY = window.innerHeight / 2;
		const parallaxX = (mouseX - centerX) / centerX;
		const parallaxY = (mouseY - centerY) / centerY;

		// Deep blue-black canvas base
		ctx.fillStyle = '#06060e';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		drawNebulaBlobs(time);
		drawDustParticles(time);
		drawParallaxStars(time, parallaxX, parallaxY);
		drawVignette();

		animationFrameId = requestAnimationFrame(animate);
	}

	// ── Nebula rendering ──
	function drawNebulaBlobs(time: number) {
		for (const blob of nebulaBlobs) {
			const driftX = Math.sin(time * blob.speed + blob.phase) * 60;
			const driftY = Math.cos(time * blob.speed * 0.7 + blob.phase) * 40;
			const noiseX = (noise(time * blob.speed * 3, blob.noiseOffset, 0) - 0.5) * 80;
			const noiseY = (noise(time * blob.speed * 3, blob.noiseOffset, 100) - 0.5) * 80;

			const cx = blob.baseX + driftX + noiseX;
			const cy = blob.baseY + driftY + noiseY;
			const pulse = 0.7 + 0.3 * Math.sin(time * blob.speed * 2 + blob.phase);

			const gradient = ctx!.createRadialGradient(cx, cy, 0, cx, cy, blob.radius);
			gradient.addColorStop(0, `rgba(${blob.color.r},${blob.color.g},${blob.color.b},${blob.opacity * pulse})`);
			gradient.addColorStop(0.35, `rgba(${blob.color.r},${blob.color.g},${blob.color.b},${blob.opacity * pulse * 0.5})`);
			gradient.addColorStop(0.7, `rgba(${blob.color.r},${blob.color.g},${blob.color.b},${blob.opacity * pulse * 0.15})`);
			gradient.addColorStop(1, 'rgba(0,0,0,0)');

			ctx!.fillStyle = gradient;
			ctx!.fillRect(0, 0, canvas.width, canvas.height);
		}
	}

	// ── Dust particles ──
	function drawDustParticles(time: number) {
		for (let i = 0; i < dustParticles.length; i++) {
			const p = dustParticles[i];
			p.x += p.vx;
			p.y += p.vy;
			p.life++;

			const lifeRatio = p.life / p.maxLife;
			const alpha = p.opacity * Math.sin(lifeRatio * Math.PI) * (0.6 + 0.4 * Math.sin(time + i));

			ctx!.beginPath();
			ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
			ctx!.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${alpha})`;
			ctx!.fill();

			if (p.life >= p.maxLife || p.x < -20 || p.x > canvas.width + 20 || p.y < -20 || p.y > canvas.height + 20) {
				dustParticles[i] = createDust(window.innerWidth, window.innerHeight);
			}
		}
	}

	// ── Parallax stars with color & flares ──
	function drawParallaxStars(time: number, parallaxX: number, parallaxY: number) {
		const multipliers = [0.008, 0.02, 0.045];

		for (const star of parallaxStars) {
			const mult = multipliers[star.layer];
			star.x = star.baseX + parallaxX * window.innerWidth * mult;
			star.y = star.baseY + parallaxY * window.innerHeight * mult;

			const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
			const alpha = star.opacity * (0.65 + twinkle * 0.35);
			const color = starColor(star.temperature);

			ctx!.beginPath();
			ctx!.arc(star.x, star.y, star.size, 0, Math.PI * 2);
			ctx!.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`;
			ctx!.fill();

			// Subtle glow for mid/near stars
			if (star.layer >= 1 && alpha > 0.5) {
				ctx!.beginPath();
				ctx!.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
				ctx!.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha * 0.08})`;
				ctx!.fill();
			}

			// Cross flare for near-layer flare stars
			if (star.flare && alpha > 0.6) {
				drawCrossFlare(star.x, star.y, star.size, alpha, color, time);
			}
		}
	}

	function drawCrossFlare(x: number, y: number, size: number, alpha: number, color: { r: number; g: number; b: number }, time: number) {
		const len = size * 12;
		const flareAlpha = alpha * 0.35 * (0.7 + 0.3 * Math.sin(time * 1.5));

		ctx!.save();
		ctx!.translate(x, y);

		// Horizontal and vertical flare lines
		for (const angle of [0, Math.PI / 2]) {
			ctx!.beginPath();
			ctx!.moveTo(-len * Math.cos(angle), -len * Math.sin(angle));
			ctx!.lineTo(len * Math.cos(angle), len * Math.sin(angle));
			ctx!.strokeStyle = `rgba(${color.r},${color.g},${color.b},${flareAlpha})`;
			ctx!.lineWidth = 0.5;
			ctx!.stroke();

			// Wider glow line
			ctx!.beginPath();
			ctx!.moveTo(-len * 0.6 * Math.cos(angle), -len * 0.6 * Math.sin(angle));
			ctx!.lineTo(len * 0.6 * Math.cos(angle), len * 0.6 * Math.sin(angle));
			ctx!.strokeStyle = `rgba(${color.r},${color.g},${color.b},${flareAlpha * 0.4})`;
			ctx!.lineWidth = 2.5;
			ctx!.stroke();
		}

		ctx!.restore();
	}

	// ── Vignette ──
	function drawVignette() {
		const gradient = ctx!.createRadialGradient(
			canvas.width / 2, canvas.height / 2, 0,
			canvas.width / 2, canvas.height / 2,
			Math.max(canvas.width, canvas.height) * 0.65
		);
		gradient.addColorStop(0, 'rgba(0,0,0,0)');
		gradient.addColorStop(0.4, 'rgba(0,0,0,0)');
		gradient.addColorStop(0.75, 'rgba(0,0,0,0.25)');
		gradient.addColorStop(1, 'rgba(0,0,0,0.55)');

		ctx!.fillStyle = gradient;
		ctx!.fillRect(0, 0, canvas.width, canvas.height);
	}
</script>

<canvas bind:this={canvas} class="fixed inset-0 w-full h-full pointer-events-none" />

<style>
	canvas { z-index: 0; }
</style>
