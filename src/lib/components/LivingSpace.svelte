<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { areas, stars, connections, getStarById, getAreaById } from '$lib/data/constellation';
	import type { SpaceStar, SpaceArea, SpaceViewport, StarHighlight } from '$lib/types/space';
	import type { Locale } from '$lib/i18n/detector';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let animationFrameId: number;

	// Viewport state (space coordinates)
	let viewport = $state<SpaceViewport>({
		x: 0,
		y: 0,
		zoom: 0.6,
		targetX: 0,
		targetY: 0,
		targetZoom: 0.6
	});

	// Mouse state
	let mouseX = 0;
	let mouseY = 0;
	let targetMouseX = 0;
	let targetMouseY = 0;
	let isDragging = false;
	let dragStartX = 0;
	let dragStartY = 0;
	let dragStartViewX = 0;
	let dragStartViewY = 0;

	// Highlight state (set by parent via AI guidance)
	let highlights: StarHighlight[] = $state([]);

	// Props (event callbacks from parent)
	interface Props {
		locale?: Locale;
		onstarclick?: (star: SpaceStar, screenX: number, screenY: number) => void;
		onviewportchange?: (viewport: SpaceViewport) => void;
	}

	let { locale = 'en', onstarclick, onviewportchange }: Props = $props();

	// Background parallax stars
	interface BgStar {
		x: number;
		y: number;
		size: number;
		opacity: number;
		twinklePhase: number;
		twinkleSpeed: number;
		layer: number;
	}

	let bgStars: BgStar[] = [];

	// Particles
	interface Particle {
		x: number;
		y: number;
		size: number;
		speed: number;
		opacity: number;
		angle: number;
		life: number;
		maxLife: number;
	}

	let particles: Particle[] = [];

	// ── Coordinate transforms ──

	function spaceToScreen(sx: number, sy: number): { x: number; y: number } {
		return {
			x: (sx - viewport.x) * viewport.zoom + canvas.width / 2,
			y: (sy - viewport.y) * viewport.zoom + canvas.height / 2
		};
	}

	function screenToSpace(screenX: number, screenY: number): { x: number; y: number } {
		return {
			x: (screenX - canvas.width / 2) / viewport.zoom + viewport.x,
			y: (screenY - canvas.height / 2) / viewport.zoom + viewport.y
		};
	}

	// ── Initialization ──

	onMount(() => {
		ctx = canvas.getContext('2d');
		if (!ctx) return;

		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('wheel', handleWheel, { passive: false });
		canvas.addEventListener('mousedown', handleMouseDown);
		canvas.addEventListener('mouseup', handleMouseUp);
		canvas.addEventListener('mouseleave', handleMouseUp);
		canvas.addEventListener('click', handleClick);
		canvas.addEventListener('dblclick', handleDblClick);

		// Touch events
		canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
		canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
		canvas.addEventListener('touchend', handleTouchEnd);

		animate();
	});

	onDestroy(() => {
		if (!browser) return;
		window.removeEventListener('resize', resizeCanvas);
		window.removeEventListener('mousemove', handleMouseMove);
		window.removeEventListener('wheel', handleWheel);
		canvas.removeEventListener('mousedown', handleMouseDown);
		canvas.removeEventListener('mouseup', handleMouseUp);
		canvas.removeEventListener('mouseleave', handleMouseUp);
		canvas.removeEventListener('click', handleClick);
		canvas.removeEventListener('dblclick', handleDblClick);
		canvas.removeEventListener('touchstart', handleTouchStart);
		canvas.removeEventListener('touchmove', handleTouchMove);
		canvas.removeEventListener('touchend', handleTouchEnd);
		if (animationFrameId) cancelAnimationFrame(animationFrameId);
	});

	function resizeCanvas() {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		createBgStars();
		createParticles();
	}

	// ── Background stars ──

	function createBgStars() {
		bgStars = [];
		const area = canvas.width * canvas.height;
		const count = Math.floor(area / 15000);
		for (let i = 0; i < count; i++) {
			bgStars.push({
				x: Math.random() * canvas.width * 2 - canvas.width * 0.5,
				y: Math.random() * canvas.height * 2 - canvas.height * 0.5,
				size: 0.3 + Math.random() * 1.2,
				opacity: 0.15 + Math.random() * 0.35,
				twinklePhase: Math.random() * Math.PI * 2,
				twinkleSpeed: 0.3 + Math.random() * 1.2,
				layer: Math.floor(Math.random() * 3)
			});
		}
	}

	function createParticles() {
		particles = [];
		const count = Math.floor((canvas.width * canvas.height) / 40000);
		for (let i = 0; i < count; i++) {
			particles.push({
				x: Math.random() * canvas.width,
				y: Math.random() * canvas.height,
				size: Math.random() * 1.5 + 0.3,
				speed: 0.1 + Math.random() * 0.2,
				opacity: Math.random() * 0.2 + 0.05,
				angle: Math.random() * Math.PI * 2,
				life: Math.random() * 100,
				maxLife: 100 + Math.random() * 150
			});
		}
	}

	// ── Viewport bounds ──

	const BOUNDS = { minX: -1000, maxX: 1200, minY: -800, maxY: 1000 };
	const ZOOM_MIN = 0.4;
	const ZOOM_MAX = 2.0;

	function clampViewport() {
		viewport.targetZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, viewport.targetZoom));
		viewport.targetX = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, viewport.targetX));
		viewport.targetY = Math.max(BOUNDS.minY, Math.min(BOUNDS.maxY, viewport.targetY));
	}

	// ── Input handlers ──

	function handleMouseMove(e: MouseEvent) {
		targetMouseX = e.clientX;
		targetMouseY = e.clientY;

		if (isDragging) {
			const dx = (e.clientX - dragStartX) / viewport.zoom;
			const dy = (e.clientY - dragStartY) / viewport.zoom;
			viewport.targetX = dragStartViewX - dx;
			viewport.targetY = dragStartViewY - dy;
			clampViewport();
		}
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
		viewport.targetZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, viewport.targetZoom * zoomFactor));

		// Zoom toward mouse position
		const spacePos = screenToSpace(e.clientX, e.clientY);
		const newZoom = viewport.targetZoom;
		viewport.targetX = spacePos.x - (e.clientX - canvas.width / 2) / newZoom;
		viewport.targetY = spacePos.y - (e.clientY - canvas.height / 2) / newZoom;
		clampViewport();
	}

	function handleMouseDown(e: MouseEvent) {
		isDragging = true;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		dragStartViewX = viewport.targetX;
		dragStartViewY = viewport.targetY;
		canvas.style.cursor = 'grabbing';
	}

	function handleMouseUp() {
		isDragging = false;
		canvas.style.cursor = 'default';
	}

	function handleClick(e: MouseEvent) {
		if (Math.abs(e.clientX - dragStartX) > 5 || Math.abs(e.clientY - dragStartY) > 5) return;

		const spacePos = screenToSpace(e.clientX, e.clientY);
		const hitStar = findStarAtPosition(spacePos.x, spacePos.y);

		if (hitStar && onstarclick) {
			const screen = spaceToScreen(hitStar.x, hitStar.y);
			onstarclick(hitStar, screen.x, screen.y);
		}
	}

	function handleDblClick(e: MouseEvent) {
		// Double-click zooms in toward that point
		const spacePos = screenToSpace(e.clientX, e.clientY);
		viewport.targetZoom = Math.min(ZOOM_MAX, viewport.targetZoom * 1.5);
		viewport.targetX = spacePos.x;
		viewport.targetY = spacePos.y;
		clampViewport();
	}

	// Touch support
	let lastTouchDist = 0;
	let touchStartViewX = 0;
	let touchStartViewY = 0;

	function handleTouchStart(e: TouchEvent) {
		e.preventDefault();
		if (e.touches.length === 1) {
			isDragging = true;
			dragStartX = e.touches[0].clientX;
			dragStartY = e.touches[0].clientY;
			dragStartViewX = viewport.targetX;
			dragStartViewY = viewport.targetY;
		} else if (e.touches.length === 2) {
			lastTouchDist = getTouchDist(e);
			touchStartViewX = viewport.targetX;
			touchStartViewY = viewport.targetY;
		}
	}

	function handleTouchMove(e: TouchEvent) {
		e.preventDefault();
		if (e.touches.length === 1 && isDragging) {
			const dx = (e.touches[0].clientX - dragStartX) / viewport.zoom;
			const dy = (e.touches[0].clientY - dragStartY) / viewport.zoom;
			viewport.targetX = dragStartViewX - dx;
			viewport.targetY = dragStartViewY - dy;
			clampViewport();
		} else if (e.touches.length === 2) {
			const dist = getTouchDist(e);
			const scale = dist / lastTouchDist;
			viewport.targetZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, viewport.targetZoom * scale));
			lastTouchDist = dist;
			clampViewport();
		}
	}

	function handleTouchEnd(e: TouchEvent) {
		if (e.touches.length === 0) {
			// Single tap = click
			if (!isDragging) return;
			isDragging = false;
		}
	}

	function getTouchDist(e: TouchEvent): number {
		const dx = e.touches[0].clientX - e.touches[1].clientX;
		const dy = e.touches[0].clientY - e.touches[1].clientY;
		return Math.sqrt(dx * dx + dy * dy);
	}

	// Find star near a position (hit test with radius)
	function findStarAtPosition(sx: number, sy: number): SpaceStar | null {
		const hitRadius = 15 / viewport.zoom; // consistent screen-space hit area
		let closest: SpaceStar | null = null;
		let closestDist = Infinity;

		for (const star of stars) {
			const dx = star.x - sx;
			const dy = star.y - sy;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist < hitRadius && dist < closestDist) {
				closest = star;
				closestDist = dist;
			}
		}
		return closest;
	}

	// ── Public methods (called by parent) ──

	export function guideToStar(starId: string) {
		const star = getStarById(starId);
		if (!star) return;
		viewport.targetX = star.x;
		viewport.targetY = star.y;
		viewport.targetZoom = 1.5;
		clampViewport();
		setHighlight(starId, 1);
	}

	export function setHighlight(starId: string, intensity: number) {
		highlights = highlights.filter((h) => h.starId !== starId);
		highlights.push({ starId, intensity });
	}

	export function clearHighlights() {
		highlights = [];
	}

	export function resetView() {
		viewport.targetX = 0;
		viewport.targetY = 0;
		viewport.targetZoom = 0.6;
	}

	// ── Animation loop ──

	function animate() {
		if (!ctx) return;
		const time = Date.now() * 0.001;

		// Smooth viewport interpolation
		const lerp = 0.08;
		viewport.x += (viewport.targetX - viewport.x) * lerp;
		viewport.y += (viewport.targetY - viewport.y) * lerp;
		viewport.zoom += (viewport.targetZoom - viewport.zoom) * lerp;

		// Smooth mouse
		mouseX += (targetMouseX - mouseX) * 0.05;
		mouseY += (targetMouseY - mouseY) * 0.05;

		// Notify parent of viewport changes
		if (onviewportchange) {
			onviewportchange({ ...viewport });
		}

		// Clear
		ctx.fillStyle = '#0a0a0f';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Draw layers
		drawBgStars(time);
		drawParticles(time);
		drawAreaNebulae(time);
		drawConnections(time);
		drawConstellationStars(time);
		drawStarLabels(time);
		drawVignette();

		animationFrameId = requestAnimationFrame(animate);
	}

	// ── Drawing functions ──

	function drawBgStars(time: number) {
		const parallaxMult = [0.01, 0.025, 0.05];
		const cx = canvas.width / 2;
		const cy = canvas.height / 2;
		const px = (mouseX - cx) / cx;
		const py = (mouseY - cy) / cy;

		for (const star of bgStars) {
			const mult = parallaxMult[star.layer];
			const ox = px * canvas.width * mult;
			const oy = py * canvas.height * mult;
			const sx = star.x + ox;
			const sy = star.y + oy;

			// Skip if off-screen
			if (sx < -10 || sx > canvas.width + 10 || sy < -10 || sy > canvas.height + 10) continue;

			const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
			const opacity = star.opacity * (0.7 + twinkle * 0.3);

			ctx!.beginPath();
			ctx!.arc(sx, sy, star.size, 0, Math.PI * 2);
			ctx!.fillStyle = `rgba(255, 255, 255, ${opacity})`;
			ctx!.fill();
		}
	}

	function drawParticles(time: number) {
		for (let i = 0; i < particles.length; i++) {
			const p = particles[i];
			p.x += Math.cos(p.angle) * p.speed;
			p.y += Math.sin(p.angle) * p.speed;
			p.life++;
			p.angle += 0.006;

			const lifeRatio = p.life / p.maxLife;
			const opacity = p.opacity * Math.sin(lifeRatio * Math.PI);

			ctx!.beginPath();
			ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
			ctx!.fillStyle = `rgba(139, 92, 246, ${opacity})`;
			ctx!.fill();

			if (p.life >= p.maxLife || p.x < -50 || p.x > canvas.width + 50 || p.y < -50 || p.y > canvas.height + 50) {
				particles[i] = {
					x: Math.random() * canvas.width,
					y: Math.random() * canvas.height,
					size: Math.random() * 1.5 + 0.3,
					speed: 0.1 + Math.random() * 0.2,
					opacity: Math.random() * 0.2 + 0.05,
					angle: Math.random() * Math.PI * 2,
					life: 0,
					maxLife: 100 + Math.random() * 150
				};
			}
		}
	}

	function drawAreaNebulae(time: number) {
		for (const area of areas) {
			const screen = spaceToScreen(area.centerX, area.centerY);
			const screenRadius = area.radius * viewport.zoom;

			// Skip if fully off-screen
			if (screen.x + screenRadius < -100 || screen.x - screenRadius > canvas.width + 100) continue;
			if (screen.y + screenRadius < -100 || screen.y - screenRadius > canvas.height + 100) continue;

			const pulse = 1 + Math.sin(time * 0.5 + area.centerX * 0.01) * 0.1;

			const gradient = ctx!.createRadialGradient(
				screen.x, screen.y, 0,
				screen.x, screen.y, screenRadius * pulse
			);

			gradient.addColorStop(0, area.nebulaColor);
			gradient.addColorStop(0.5, area.nebulaColor.replace(/[\d.]+\)$/, '0.1)'));
			gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

			ctx!.fillStyle = gradient;
			ctx!.beginPath();
			ctx!.arc(screen.x, screen.y, screenRadius * pulse, 0, Math.PI * 2);
			ctx!.fill();
		}
	}

	function drawConnections(time: number) {
		ctx!.lineWidth = 1;

		for (const conn of connections) {
			const star1 = getStarById(conn.star1Id);
			const star2 = getStarById(conn.star2Id);
			if (!star1 || !star2) continue;

			const p1 = spaceToScreen(star1.x, star1.y);
			const p2 = spaceToScreen(star2.x, star2.y);

			// Skip if both endpoints off-screen
			if ((p1.x < -50 && p2.x < -50) || (p1.x > canvas.width + 50 && p2.x > canvas.width + 50)) continue;
			if ((p1.y < -50 && p2.y < -50) || (p1.y > canvas.height + 50 && p2.y > canvas.height + 50)) continue;

			const area1 = getAreaById(star1.areaId);
			const color = area1 ? area1.color : 'rgba(139, 92, 246, 0.4)';

			const pulse = 0.3 + Math.sin(time * 0.8 + conn.star1Id.charCodeAt(0) * 0.1) * 0.15;

			ctx!.beginPath();
			ctx!.moveTo(p1.x, p1.y);
			ctx!.lineTo(p2.x, p2.y);
			ctx!.strokeStyle = color.replace(/[\d.]+\)$/, `${pulse})`);
			ctx!.stroke();
		}
	}

	function drawConstellationStars(time: number) {
		for (const star of stars) {
			const screen = spaceToScreen(star.x, star.y);

			// Skip if off-screen
			if (screen.x < -30 || screen.x > canvas.width + 30 || screen.y < -30 || screen.y > canvas.height + 30) continue;

			const area = getAreaById(star.areaId);
			const color = area ? area.color : 'rgba(255, 255, 255, 0.8)';
			const colorRgb = extractRgb(color);

			// Pulse animation
			const pulse = star.pulseSpeed
				? Math.sin(time * star.pulseSpeed + star.x * 0.1) * 0.2
				: 0;

			// Highlight from AI guidance
			const highlight = highlights.find((h) => h.starId === star.id);
			const highlightBoost = highlight ? highlight.intensity * 0.4 : 0;

			const brightness = Math.min(1, star.brightness + pulse + highlightBoost);
			const size = star.size * viewport.zoom * 0.8;

			// Void entrance special rendering
			if (star.contentType === 'void-entry') {
				drawVoidEntrance(screen.x, screen.y, size, time, brightness);
				continue;
			}

			// Outer glow
			const glowSize = size * (6 + highlightBoost * 4);
			const glowGradient = ctx!.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, glowSize);
			glowGradient.addColorStop(0, `rgba(${colorRgb}, ${brightness * 0.3})`);
			glowGradient.addColorStop(0.4, `rgba(${colorRgb}, ${brightness * 0.1})`);
			glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

			ctx!.beginPath();
			ctx!.arc(screen.x, screen.y, glowSize, 0, Math.PI * 2);
			ctx!.fillStyle = glowGradient;
			ctx!.fill();

			// Core
			ctx!.beginPath();
			ctx!.arc(screen.x, screen.y, size, 0, Math.PI * 2);
			ctx!.fillStyle = `rgba(255, 255, 255, ${brightness})`;
			ctx!.fill();

			// Bright center
			ctx!.beginPath();
			ctx!.arc(screen.x, screen.y, size * 0.4, 0, Math.PI * 2);
			ctx!.fillStyle = 'rgba(255, 255, 255, 1)';
			ctx!.fill();
		}
	}

	function drawVoidEntrance(x: number, y: number, size: number, time: number, brightness: number) {
		// Dark swirling vortex
		const vortexSize = size * 8;
		const gradient = ctx!.createRadialGradient(x, y, 0, x, y, vortexSize);

		// Rotating color
		const hue = (time * 20) % 360;
		gradient.addColorStop(0, `rgba(88, 28, 135, ${brightness * 0.5})`);
		gradient.addColorStop(0.3, `rgba(59, 130, 246, ${brightness * 0.2})`);
		gradient.addColorStop(0.6, `rgba(30, 30, 50, ${brightness * 0.3})`);
		gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

		ctx!.beginPath();
		ctx!.arc(x, y, vortexSize, 0, Math.PI * 2);
		ctx!.fillStyle = gradient;
		ctx!.fill();

		// Spiral lines
		for (let i = 0; i < 3; i++) {
			const angle = time * 0.5 + (i * Math.PI * 2) / 3;
			const innerR = size * 2;
			const outerR = vortexSize * 0.8;

			ctx!.beginPath();
			for (let t = 0; t <= 1; t += 0.02) {
				const r = innerR + (outerR - innerR) * t;
				const a = angle + t * Math.PI * 2;
				const px = x + Math.cos(a) * r;
				const py = y + Math.sin(a) * r;
				if (t === 0) ctx!.moveTo(px, py);
				else ctx!.lineTo(px, py);
			}
			ctx!.strokeStyle = `rgba(139, 92, 246, ${brightness * 0.15 * (1 - 0)})`;
			ctx!.lineWidth = 1;
			ctx!.stroke();
		}

		// Dark core
		ctx!.beginPath();
		ctx!.arc(x, y, size * 1.5, 0, Math.PI * 2);
		ctx!.fillStyle = `rgba(10, 10, 20, ${brightness})`;
		ctx!.fill();
	}

	function drawStarLabels(time: number) {
		// Only show labels when zoomed in enough
		if (viewport.zoom < 0.7) return;

		const labelOpacity = Math.min(1, (viewport.zoom - 0.7) / 0.5);

		ctx!.font = `${Math.max(10, 12 * viewport.zoom)}px 'Inter', sans-serif`;
		ctx!.textAlign = 'left';
		ctx!.textBaseline = 'middle';

		for (const star of stars) {
			const resolvedLabel = star.label[locale] || star.label.en || '';
			if (!resolvedLabel) continue;
			const screen = spaceToScreen(star.x, star.y);

			if (screen.x < -100 || screen.x > canvas.width + 100 || screen.y < -100 || screen.y > canvas.height + 100) continue;

			const area = getAreaById(star.areaId);
			const color = area ? area.color : 'rgba(255, 255, 255, 0.8)';
			const colorRgb = extractRgb(color);

			const offset = star.size * viewport.zoom * 0.8 + 8;

			// Label glow
			ctx!.fillStyle = `rgba(${colorRgb}, ${labelOpacity * 0.3})`;
			ctx!.fillText(resolvedLabel, screen.x + offset + 1, screen.y + 1);

			// Label text
			ctx!.fillStyle = `rgba(255, 255, 255, ${labelOpacity * 0.7})`;
			ctx!.fillText(resolvedLabel, screen.x + offset, screen.y);
		}
	}

	function drawVignette() {
		const gradient = ctx!.createRadialGradient(
			canvas.width / 2, canvas.height / 2, 0,
			canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.7
		);
		gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
		gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
		gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');

		ctx!.fillStyle = gradient;
		ctx!.fillRect(0, 0, canvas.width, canvas.height);
	}

	// Extract "r, g, b" from an rgba string
	function extractRgb(rgba: string): string {
		const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
		return match ? `${match[1]}, ${match[2]}, ${match[3]}` : '255, 255, 255';
	}
</script>

<canvas
	bind:this={canvas}
	class="fixed inset-0 w-full h-full"
	style="cursor: default; touch-action: none;"
/>

<style>
	canvas {
		z-index: 0;
	}
</style>
