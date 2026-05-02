<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { areas, connections, getStarById, getStarGroupColor, groupColors } from '$lib/data/constellation';
	import { getFragmentById } from '$lib/data/fragments';
	import type { SpaceStar, SpaceViewport } from '$lib/types/space';
	import type { Fragment } from '$lib/types/agent';
	import type { Locale } from '$lib/i18n/detector';

	// ── Props ──
	interface Props {
		locale?: Locale;
		onstarclick?: (star: SpaceStar, fragment: Fragment, screenX: number, screenY: number) => void;
		onentervoid?: () => void;
	}

	let { locale = 'en', onstarclick, onentervoid }: Props = $props();

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let animationFrameId: number;

	// ── Seeded random ──
	let seed = $state(0);
	function seededRandom(): number {
		seed = (seed * 16807 + 0) % 2147483647;
		return (seed - 1) / 2147483646;
	}

	// ── Emergence state ──
	type EmergePhase = 'hidden' | 'emerging' | 'lingering' | 'crystallizing' | 'star';

	interface EmergingFrag {
		id: string;
		fragmentId: string;
		starId: string;
		x: number; y: number;
		size: number;
		brightness: number;
		phase: EmergePhase;
		phaseStart: number;
		read: boolean;
		groupArea: string;
		color: { r: number; g: number; b: number };
		shortText: string;
		fragment: Fragment | null;
		connections: string[];
	}

	let emergingFrags: EmergingFrag[] = $state([]);
	let currentEmergeIdx = $state(-1);
	let voidRevealed = $state(false);
	let allRead = $state(false);
	let readCount = $state(0);

	// Emergence timing constants
	const EMERGE_DURATION = 1.2;    // text fade-in (slower, more dramatic)
	const LINGER_DURATION = 3.5;    // text stays visible
	const CRYSTALLIZE_DURATION = 1.0; // halo expands
	const NEXT_DELAY = 1.5;         // delay before next fragment after read

	let nextEmergeTime = $state(0);

	// Emergence order (by group, then by fragment ID within group)
	const EMERGE_ORDER = [
		{ area: 'origin', fragIds: ['frag-1', 'frag-2'] },
		{ area: 'seelefelix', fragIds: ['frag-3', 'frag-4'] },
		{ area: 'chain', fragIds: ['frag-5', 'frag-6', 'frag-7'] },
		{ area: 'silhouette', fragIds: ['frag-8', 'frag-9'] },
		{ area: 'axiom', fragIds: ['frag-10', 'frag-11', 'frag-12'] },
		{ area: 'standard', fragIds: ['frag-13', 'frag-14', 'frag-15'] },
		{ area: 'closing', fragIds: ['frag-16'] }
	];

	// ── Viewport ──
	// No hard bounds. Guidance is visual gravity, not walls.
	let viewport = $state<SpaceViewport>({
		x: 0, y: 0, zoom: 0.7,
		targetX: 0, targetY: 0, targetZoom: 0.7
	});

	// Gravity drift target — set by force simulation result
	let driftTarget = $state({ x: 0, y: 0 });

	// ── Mouse / drag ──
	let mouseScreenX = 0, mouseScreenY = 0;
	let mouseSpaceX = 0, mouseSpaceY = 0;
	let isDragging = false;
	let dragStartX = 0, dragStartY = 0;
	let dragStartViewX = 0, dragStartViewY = 0;
	let dragThresholdMet = false;
	let autoPanTarget: { x: number; y: number } | null = null;

	// ── Chunk-based infinite background ──
	const CHUNK_SIZE = 1200;

	interface BgStar {
		wx: number; wy: number;
		size: number; opacity: number;
		twinklePhase: number; twinkleSpeed: number;
		layer: number; temp: number; flare: boolean;
	}

	interface Dust {
		x: number; y: number; size: number; alpha: number;
		vx: number; vy: number;
		color: { r: number; g: number; b: number };
		life: number; maxLife: number;
	}

	interface Chunk {
		stars: BgStar[];
		dusts: Dust[];
	}

	let chunkCache = new Map<string, Chunk>();
	let activeChunks: string[] = [];
	let lastChunkUpdateX = Infinity, lastChunkUpdateY = Infinity;

	function chunkKey(cx: number, cy: number): string { return `${cx},${cy}`; }

	function chunkSeed(cx: number, cy: number): number {
		return ((cx * 374761393 + cy * 668265263) & 0x7fffffff) || 1;
	}

	function getOrCreateChunk(cx: number, cy: number): Chunk {
		const key = chunkKey(cx, cy);
		let c = chunkCache.get(key);
		if (!c) {
			c = generateChunk(cx, cy);
			chunkCache.set(key, c);
		}
		return c;
	}

	function generateChunk(cx: number, cy: number): Chunk {
		const ox = cx * CHUNK_SIZE, oy = cy * CHUNK_SIZE;
		let s = chunkSeed(cx, cy);
		function rnd(): number { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; }

		const stars: BgStar[] = [];
		for (let i = 0; i < 800; i++) {
			const layer = i < 520 ? 0 : i < 700 ? 1 : 2;
			const temp = layer === 0 ? rnd() * 0.35 : rnd();
			stars.push({
				wx: ox + rnd() * CHUNK_SIZE, wy: oy + rnd() * CHUNK_SIZE,
				size: layer === 0 ? 0.3 + rnd() * 0.5 : layer === 1 ? 0.6 + rnd() * 0.8 : 1.5 + rnd() * 2.8,
				opacity: layer === 0 ? 0.05 + rnd() * 0.22 : layer === 1 ? 0.25 + rnd() * 0.4 : 0.5 + rnd() * 0.4,
				twinklePhase: rnd() * Math.PI * 2,
				twinkleSpeed: layer === 0 ? 0.2 + rnd() * 0.7 : layer === 1 ? 0.3 + rnd() * 1.2 : 0.4 + rnd() * 1.5,
				layer, temp,
				flare: layer === 2 && rnd() < 0.08
			});
		}

		const dustColors = [{ r: 139, g: 92, b: 246 }, { r: 59, g: 130, b: 246 }, { r: 236, g: 72, b: 153 }, { r: 255, g: 220, b: 180 }];
		const dusts: Dust[] = [];
		for (let i = 0; i < 35; i++) {
			dusts.push({
				x: ox + rnd() * CHUNK_SIZE, y: oy + rnd() * CHUNK_SIZE,
				size: 0.5 + rnd() * 1.5,
				alpha: 0.1 + rnd() * 0.3,
				vx: (rnd() - 0.5) * 0.3, vy: (rnd() - 0.5) * 0.3,
				color: dustColors[Math.floor(rnd() * dustColors.length)],
				life: Math.floor(rnd() * 300), maxLife: 200 + Math.floor(rnd() * 300)
			});
		}

		return { stars, dusts };
	}

	function updateActiveChunks() {
		// Determine visible world rect at current viewport
		const halfW = (canvas.width / viewport.zoom) / 2;
		const halfH = (canvas.height / viewport.zoom) / 2;
		const minX = viewport.x - halfW - CHUNK_SIZE;
		const maxX = viewport.x + halfW + CHUNK_SIZE;
		const minY = viewport.y - halfH - CHUNK_SIZE;
		const maxY = viewport.y + halfH + CHUNK_SIZE;

		const minCX = Math.floor(minX / CHUNK_SIZE);
		const maxCX = Math.floor(maxX / CHUNK_SIZE);
		const minCY = Math.floor(minY / CHUNK_SIZE);
		const maxCY = Math.floor(maxY / CHUNK_SIZE);

		activeChunks = [];
		for (let cx = minCX; cx <= maxCX; cx++) {
			for (let cy = minCY; cy <= maxCY; cy++) {
				getOrCreateChunk(cx, cy);
				activeChunks.push(chunkKey(cx, cy));
			}
		}

		// Prune cache if too large (>200 chunks)
		if (chunkCache.size > 200) {
			const activeSet = new Set(activeChunks);
			for (const key of chunkCache.keys()) {
				if (!activeSet.has(key)) chunkCache.delete(key);
			}
		}
	}

	// ── Nebula ──
	interface Nebula {
		bx: number; by: number; radius: number; opacity: number;
		color: { r: number; g: number; b: number };
		speed: number; phase: number; seed: number;
	}
	let nebulas: Nebula[] = [];

	// ── Energy dots ──
	interface EDot {
		connIdx: number; progress: number; speed: number;
		size: number; alpha: number;
		color: { r: number; g: number; b: number };
	}
	let eDots: EDot[] = [];

	// Connection data for rendering
	let connData: Array<{
		s1: EmergingFrag; s2: EmergingFrag;
		c1: { r: number; g: number; b: number };
		c2: { r: number; g: number; b: number };
		isInterGroup: boolean;
	}> = [];

	// ── Utility ──
	function noise(x: number, y: number, s: number): number {
		const n = Math.sin(x * 12.9898 + y * 78.233 + s) * 43758.5453;
		return n - Math.floor(n);
	}

	function starColor(temp: number): { r: number; g: number; b: number } {
		if (temp < 0.5) { const t = temp * 2; return { r: Math.floor(180 + 75 * t), g: Math.floor(200 + 55 * t), b: 255 }; }
		const t = (temp - 0.5) * 2;
		return { r: 255, g: Math.floor(255 - 55 * t), b: Math.floor(255 - 155 * t) };
	}

	// ── Coordinate transforms ──
	function screenToSpace(sx: number, sy: number): { x: number; y: number } {
		const cx = canvas.width / 2, cy = canvas.height / 2;
		return { x: (sx - cx) / viewport.zoom + viewport.x, y: (sy - cy) / viewport.zoom + viewport.y };
	}

	function spaceToScreen(wx: number, wy: number): { x: number; y: number } {
		const cx = canvas.width / 2, cy = canvas.height / 2;
		return { x: (wx - viewport.x) * viewport.zoom + cx, y: (wy - viewport.y) * viewport.zoom + cy };
	}

	// React to locale changes: re-fetch fragment texts without resetting positions/phases
	$effect(() => {
		const loc = locale as Locale;
		for (const ef of emergingFrags) {
			if (ef.starId === 'void-entry') continue;
			const frag = getFragmentById(ef.fragmentId, loc);
			if (frag) {
				ef.shortText = frag.short;
				ef.fragment = frag;
			}
		}
	});
	onMount(() => {
		ctx = canvas.getContext('2d');
		if (!ctx) return;

		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);
		canvas.addEventListener('mousedown', onMouseDown);
		canvas.addEventListener('mousemove', onMouseMove);
		canvas.addEventListener('mouseup', onMouseUp);
		canvas.addEventListener('wheel', onWheel, { passive: false });
		canvas.addEventListener('touchstart', onTouchStart, { passive: false });
		canvas.addEventListener('touchmove', onTouchMove, { passive: false });
		canvas.addEventListener('touchend', onTouchEnd);

		// Session-random seed — different constellation each visit
		seed = Math.floor(Math.random() * 2147483646) + 1;

		createNebulas();
		generateEmergingFrags();
		buildConnData();
		createEDots();

		// Start first emergence after short delay
		nextEmergeTime = performance.now() / 1000 + 1.5;
		currentEmergeIdx = -1;

		animate();
	});

	onDestroy(() => {
		if (!browser) return;
		window.removeEventListener('resize', resizeCanvas);
		canvas.removeEventListener('mousedown', onMouseDown);
		canvas.removeEventListener('mousemove', onMouseMove);
		canvas.removeEventListener('mouseup', onMouseUp);
		canvas.removeEventListener('wheel', onWheel);
		canvas.removeEventListener('touchstart', onTouchStart);
		canvas.removeEventListener('touchmove', onTouchMove);
		canvas.removeEventListener('touchend', onTouchEnd);
		if (animationFrameId) cancelAnimationFrame(animationFrameId);
	});

	function resizeCanvas() {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}

	// ── Force-directed constellation layout ──
	function generateEmergingFrags() {
		// Collect all fragment data first (positions set later by force simulation)
		const nodes: Array<{
			id: string; fragmentId: string; starId: string;
			x: number; y: number;
			groupArea: string; color: {r:number;g:number;b:number};
			connections: string[];
			fragment: Fragment | null; shortText: string;
		}> = [];

		for (const group of EMERGE_ORDER) {
			const gColor = groupColors[group.area] ?? groupColors.void;
			for (const fragId of group.fragIds) {
				const frag = getFragmentById(fragId, locale as Locale) ?? null;
				const existingStar = getStarById(fragId);
				nodes.push({
					id: fragId, fragmentId: fragId, starId: fragId,
					x: (Math.random() - 0.5) * 1200, y: (Math.random() - 0.5) * 800,
					groupArea: group.area, color: gColor,
					connections: existingStar?.connections ?? [],
					fragment: frag,
					shortText: frag?.short ?? ''
				});
			}
		}
		// Void entrance node
		nodes.push({
			id: 'void-entry', fragmentId: 'void-entry', starId: 'void-entry',
			x: (Math.random() - 0.5) * 1200, y: (Math.random() - 0.5) * 800,
			groupArea: 'void-gate', color: groupColors.void,
			connections: ['frag-15'],
			fragment: null, shortText: ''
		});

		// Build connection set for fast lookup
		const connSet = new Set<string>();
		for (const n of nodes) {
			for (const t of n.connections) {
				connSet.add([n.id, t].sort().join('-'));
			}
		}
		function isConnected(a: string, b: string): boolean {
			return connSet.has([a, b].sort().join('-'));
		}

		// Force simulation
		const ITER = 180;
		const REPULSION = 80000;
		const SPRING_LEN = 280;
		const SPRING_K = 0.06;
		const CENTER_K = 0.002;

		for (let iter = 0; iter < ITER; iter++) {
			// Repulsion between all pairs
			for (let i = 0; i < nodes.length; i++) {
				for (let j = i + 1; j < nodes.length; j++) {
					const dx = nodes[i].x - nodes[j].x;
					const dy = nodes[i].y - nodes[j].y;
					const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
					const force = REPULSION / (dist * dist);
					const fx = (dx / dist) * force;
					const fy = (dy / dist) * force;
					nodes[i].x += fx; nodes[i].y += fy;
					nodes[j].x -= fx; nodes[j].y -= fy;
				}
			}

			// Spring attraction along connections
			for (const n of nodes) {
				for (const tId of n.connections) {
					const t = nodes.find(o => o.id === tId);
					if (!t) continue;
					const dx = t.x - n.x;
					const dy = t.y - n.y;
					const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
					const force = (dist - SPRING_LEN) * SPRING_K;
					const fx = (dx / dist) * force;
					const fy = (dy / dist) * force;
					n.x += fx; n.y += fy;
					t.x -= fx; t.y -= fy;
				}
			}

			// Center gravity
			for (const n of nodes) {
				n.x -= n.x * CENTER_K;
				n.y -= n.y * CENTER_K;
			}
		}

		// Build emergingFrags from simulation results
		emergingFrags = nodes.map(n => ({
			id: `emerge-${n.id}`,
			fragmentId: n.fragmentId,
			starId: n.starId,
			x: n.x, y: n.y,
			size: 2.8 + Math.random() * 0.5,
			brightness: 0.8 + Math.random() * 0.1,
			phase: 'hidden' as EmergePhase,
			phaseStart: 0,
			read: false,
			groupArea: n.groupArea,
			color: n.color,
			shortText: n.shortText,
			fragment: n.fragment,
			connections: n.connections
		}));

		// Set initial viewport to center of mass of origin group
		const originNodes = emergingFrags.filter(f => f.groupArea === 'origin');
		if (originNodes.length > 0) {
			const cx = originNodes.reduce((s, f) => s + f.x, 0) / originNodes.length;
			const cy = originNodes.reduce((s, f) => s + f.y, 0) / originNodes.length;
			driftTarget.x = cx;
			driftTarget.y = cy;
			viewport.x = viewport.targetX = cx;
			viewport.y = viewport.targetY = cy;
		}
	}

	// ── Build connection data for rendering ──
	function buildConnData() {
		connData = [];
		for (const conn of connections) {
			const s1 = emergingFrags.find(f => f.starId === conn.star1Id);
			const s2 = emergingFrags.find(f => f.starId === conn.star2Id);
			if (!s1 || !s2) continue;
			connData.push({
				s1, s2,
				c1: s1.color, c2: s2.color,
				isInterGroup: s1.groupArea !== s2.groupArea
			});
		}
	}

	function createEDots() {
		eDots = [];
		connData.forEach((cd, i) => {
			const count = cd.isInterGroup ? 3 : 2;
			for (let j = 0; j < count; j++) {
				eDots.push({
					connIdx: i, progress: Math.random(),
					speed: 0.0006 + Math.random() * 0.0012,
					size: 1 + Math.random() * 1.5,
					alpha: 0.3 + Math.random() * 0.4,
					color: j % 2 === 0 ? cd.c1 : cd.c2
				});
			}
		});
	}

	function createNebulas() {
		nebulas = [];
		const colors = [
			{ r: 139, g: 92, b: 246 }, { r: 59, g: 130, b: 246 },
			{ r: 236, g: 72, b: 153 }, { r: 99, g: 102, b: 241 },
			{ r: 6, g: 182, b: 212 }, { r: 180, g: 130, b: 255 },
			{ r: 255, g: 180, b: 100 }
		];
		for (let i = 0; i < 8; i++) {
			const area = areas[i % areas.length];
			nebulas.push({
				bx: (area?.centerX ?? -300) + (Math.random() - 0.5) * 200,
				by: (area?.centerY ?? -100) + (Math.random() - 0.5) * 150,
				radius: 350 + Math.random() * 300,
				opacity: 0.008 + Math.random() * 0.015,
				color: colors[i % colors.length],
				speed: 0.008 + Math.random() * 0.015,
				phase: Math.random() * Math.PI * 2,
				seed: Math.random() * 1000
			});
		}
	}


	// ── Mouse handlers ──
	function onMouseDown(e: MouseEvent) {
		isDragging = true;
		dragThresholdMet = false;
		dragStartX = e.clientX; dragStartY = e.clientY;
		dragStartViewX = viewport.x; dragStartViewY = viewport.y;
		autoPanTarget = null;
	}

	function onMouseMove(e: MouseEvent) {
		mouseScreenX = e.clientX; mouseScreenY = e.clientY;
		const sp = screenToSpace(e.clientX, e.clientY);
		mouseSpaceX = sp.x; mouseSpaceY = sp.y;

		if (isDragging) {
			const dx = e.clientX - dragStartX, dy = e.clientY - dragStartY;
			if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragThresholdMet = true;
			viewport.x = dragStartViewX - dx / viewport.zoom;
			viewport.y = dragStartViewY - dy / viewport.zoom;
			viewport.targetX = viewport.x;
			viewport.targetY = viewport.y;
			// Update drift target so we don't spring back to old position
			driftTarget.x = viewport.x;
			driftTarget.y = viewport.y;
		}
	}

	function onMouseUp(e: MouseEvent) {
		isDragging = false;
		if (!dragThresholdMet) {
			const sp = screenToSpace(e.clientX, e.clientY);
			handleClick(sp.x, sp.y, e.clientX, e.clientY);
		}
	}

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		viewport.targetZoom = Math.max(0.5, Math.min(1.2, viewport.targetZoom * (1 - e.deltaY * 0.001)));
	}

	// ── Touch handlers (mobile) ──
	let touchDist0 = 0;
	let lastTouchX = 0, lastTouchY = 0;

	function onTouchStart(e: TouchEvent) {
		e.preventDefault();
		if (e.touches.length === 1) {
			const t = e.touches[0];
			lastTouchX = t.clientX; lastTouchY = t.clientY;
			isDragging = true;
			dragThresholdMet = false;
			dragStartX = t.clientX; dragStartY = t.clientY;
			dragStartViewX = viewport.x; dragStartViewY = viewport.y;
			autoPanTarget = null;
		} else if (e.touches.length === 2) {
			const dx = e.touches[0].clientX - e.touches[1].clientX;
			const dy = e.touches[0].clientY - e.touches[1].clientY;
			touchDist0 = Math.sqrt(dx * dx + dy * dy);
			isDragging = false;
		}
	}

	function onTouchMove(e: TouchEvent) {
		e.preventDefault();
		if (e.touches.length === 1 && isDragging) {
			const t = e.touches[0];
			lastTouchX = t.clientX; lastTouchY = t.clientY;
			mouseScreenX = t.clientX; mouseScreenY = t.clientY;
			const sp = screenToSpace(t.clientX, t.clientY);
			mouseSpaceX = sp.x; mouseSpaceY = sp.y;
			const dx = t.clientX - dragStartX, dy = t.clientY - dragStartY;
			if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragThresholdMet = true;
			viewport.x = dragStartViewX - dx / viewport.zoom;
			viewport.y = dragStartViewY - dy / viewport.zoom;
			viewport.targetX = viewport.x;
			viewport.targetY = viewport.y;
			driftTarget.x = viewport.x;
			driftTarget.y = viewport.y;
		} else if (e.touches.length === 2) {
			const dx = e.touches[0].clientX - e.touches[1].clientX;
			const dy = e.touches[0].clientY - e.touches[1].clientY;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (touchDist0 > 0) {
				viewport.targetZoom = Math.max(0.5, Math.min(1.2, viewport.targetZoom * (dist / touchDist0)));
			}
			touchDist0 = dist;
		}
	}

	function onTouchEnd(_e: TouchEvent) {
		if (!isDragging) return;
		if (!dragThresholdMet) {
			const sp = screenToSpace(lastTouchX, lastTouchY);
			handleClick(sp.x, sp.y, lastTouchX, lastTouchY);
		}
		isDragging = false;
	}
	function handleClick(wx: number, wy: number, sx: number, sy: number) {
		// Hit test stars in 'star' phase
		for (const ef of emergingFrags) {
			if (ef.phase !== 'star') continue;
			if (ef.starId === 'void-entry' && !voidRevealed) continue;

			const hitR = Math.max(ef.size * 10, 30);
			if (Math.hypot(wx - ef.x, wy - ef.y) <= hitR) {
				if (ef.starId === 'void-entry') {
					onentervoid?.();
					return;
				}
				// Don't call onstarclick yet — the click registers but content is shown by parent
				// Build a SpaceStar-like object for the callback
				const spaceStar: SpaceStar = {
					id: ef.starId,
					areaId: ef.groupArea,
					x: ef.x, y: ef.y,
					size: ef.size,
					brightness: ef.brightness,
					contentType: 'fragment',
					contentRef: ef.fragmentId,
					label: {},
					connections: ef.connections,
					pulseSpeed: 1.5
				};
				if (ef.fragment) {
					onstarclick?.(spaceStar, ef.fragment, sx, sy);
				}
				return;
			}
		}
	}

	// Called by parent when content overlay is closed
	export function markFragmentRead(fragmentId: string) {
		const ef = emergingFrags.find(f => f.fragmentId === fragmentId);
		if (ef && !ef.read) {
			ef.read = true;
			readCount++;
			if (readCount >= 16) allRead = true;
			if (readCount >= 3) voidRevealed = true;
			// Schedule next emergence
			nextEmergeTime = performance.now() / 1000 + NEXT_DELAY;
		}
	}

	// ── Emergence logic ──
	function updateEmergence(time: number) {
		// Check if we should start next emergence
		if (currentEmergeIdx < emergingFrags.length - 1 && time >= nextEmergeTime) {
			// Find next hidden fragment (excluding void-entry)
			for (let i = currentEmergeIdx + 1; i < emergingFrags.length; i++) {
				if (emergingFrags[i].phase === 'hidden' && emergingFrags[i].starId !== 'void-entry') {
					currentEmergeIdx = i;
					const ef = emergingFrags[i];
					ef.phase = 'emerging';
					ef.phaseStart = time;
					nextEmergeTime = Infinity; // will be set when this one is read
					// Auto-pan to show the emerging fragment
					autoPanTarget = { x: ef.x, y: ef.y };
					viewport.targetX = ef.x;
					viewport.targetY = ef.y;
				driftTarget.x = ef.x;
				driftTarget.y = ef.y;
					viewport.targetZoom = Math.max(0.65, Math.min(0.85, viewport.targetZoom));
					break;
				}
			}
		}

		// Update phases
		for (const ef of emergingFrags) {
			if (ef.phase === 'hidden' || ef.phase === 'star') continue;

			const elapsed = time - ef.phaseStart;

			if (ef.phase === 'emerging' && elapsed >= EMERGE_DURATION) {
				ef.phase = 'lingering';
				ef.phaseStart = time;
			} else if (ef.phase === 'lingering' && elapsed >= LINGER_DURATION) {
				ef.phase = 'crystallizing';
				ef.phaseStart = time;
			} else if (ef.phase === 'crystallizing' && elapsed >= CRYSTALLIZE_DURATION) {
				ef.phase = 'star';
			}
		}

		// Reveal void entrance when all read
		if (allRead) {
			const voidEf = emergingFrags.find(f => f.starId === 'void-entry');
			if (voidEf && voidEf.phase === 'hidden') {
				voidEf.phase = 'star';
				voidRevealed = true;
			}
		}
	}

	// ── Main animation ──
	function animate() {
		if (!ctx) return;
		const time = performance.now() / 1000;

		// Smooth viewport
		const lerp = 0.08;
		viewport.x += (viewport.targetX - viewport.x) * lerp;
		viewport.y += (viewport.targetY - viewport.y) * lerp;
		viewport.zoom += (viewport.targetZoom - viewport.zoom) * lerp;

		// Update emergence
		updateEmergence(time);

		// Gentle gravity drift toward interest point when not dragging
		if (!isDragging && !autoPanTarget) {
			const driftForce = 0.003;
			viewport.targetX += (driftTarget.x - viewport.targetX) * driftForce;
			viewport.targetY += (driftTarget.y - viewport.targetY) * driftForce;
		}

		const w = canvas.width, h = canvas.height;
		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = '#04040a';
		ctx.fillRect(0, 0, w, h);

		// Only update chunks when viewport moved significantly (>300 world units)
		if (Math.abs(viewport.x - lastChunkUpdateX) > 300 || Math.abs(viewport.y - lastChunkUpdateY) > 300) {
			updateActiveChunks();
			lastChunkUpdateX = viewport.x;
			lastChunkUpdateY = viewport.y;
		}

		// Draw world-space
		ctx.save();
		const cx = w / 2, cy = h / 2;
		ctx.translate(cx, cy);
		ctx.scale(viewport.zoom, viewport.zoom);
		ctx.translate(-viewport.x, -viewport.y);

		drawNebulas(time);
		drawDusts(time);
		drawBgStars(time);
		drawConnectionLines(time);
		drawEDots(time);
		drawFragmentStars(time);
		drawVoidEntrance(time);
		drawEmergingTexts(time);

		ctx.restore();

		drawVignette();
		animationFrameId = requestAnimationFrame(animate);
	}

	// ══════════════════════════════════════════
	//  Drawing functions (world-space)
	// ══════════════════════════════════════════

	function drawNebulas(time: number) {
		for (const n of nebulas) {
			const dx = Math.sin(time * n.speed + n.phase) * 60;
			const dy = Math.cos(time * n.speed * 0.7 + n.phase) * 40;
			const nx = (noise(time * n.speed * 3, n.seed, 0) - 0.5) * 80;
			const ny = (noise(time * n.speed * 3, n.seed, 100) - 0.5) * 80;
			const pcx = n.bx + dx + nx, pcy = n.by + dy + ny;
			const pulse = 0.7 + 0.3 * Math.sin(time * n.speed * 2 + n.phase);

			const g = ctx!.createRadialGradient(pcx, pcy, 0, pcx, pcy, n.radius);
			g.addColorStop(0, `rgba(${n.color.r},${n.color.g},${n.color.b},${n.opacity * pulse})`);
			g.addColorStop(0.35, `rgba(${n.color.r},${n.color.g},${n.color.b},${n.opacity * pulse * 0.5})`);
			g.addColorStop(0.7, `rgba(${n.color.r},${n.color.g},${n.color.b},${n.opacity * pulse * 0.12})`);
			g.addColorStop(1, 'rgba(0,0,0,0)');
			ctx!.fillStyle = g;
			ctx!.fillRect(viewport.x - canvas.width / viewport.zoom, viewport.y - canvas.height / viewport.zoom, canvas.width / viewport.zoom * 2, canvas.height / viewport.zoom * 2);
		}
	}

	function drawDusts(time: number) {
		for (const key of activeChunks) {
			const c = chunkCache.get(key);
			if (!c) continue;
			for (let i = 0; i < c.dusts.length; i++) {
				const p = c.dusts[i];
				p.x += p.vx; p.y += p.vy; p.life++;
				const lr = p.life / p.maxLife;
				const a = p.alpha * Math.sin(lr * Math.PI) * (0.6 + 0.4 * Math.sin(time + i));
				ctx!.beginPath();
				ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
				const pc = p.color ?? { r: 139, g: 92, b: 246 };
				ctx!.fillStyle = `rgba(${pc.r},${pc.g},${pc.b},${a})`;
				ctx!.fill();
				// Reset dust when life expires
				if (p.life >= p.maxLife) {
					const cx = Math.floor(p.x / CHUNK_SIZE), cy = Math.floor(p.y / CHUNK_SIZE);
					const ox = cx * CHUNK_SIZE, oy = cy * CHUNK_SIZE;
					p.x = ox + Math.random() * CHUNK_SIZE;
					p.y = oy + Math.random() * CHUNK_SIZE;
					p.life = 0;
					p.maxLife = 200 + Math.floor(Math.random() * 300);
				}
			}
		}
	}

	function drawBgStars(time: number) {
		for (const key of activeChunks) {
			const c = chunkCache.get(key);
			if (!c) continue;
			for (const s of c.stars) {
				const twinkle = Math.sin(time * s.twinkleSpeed + s.twinklePhase);
				const a = s.opacity * (0.65 + twinkle * 0.35);
				const col = starColor(s.temp);
				ctx!.beginPath();
				ctx!.arc(s.wx, s.wy, s.size, 0, Math.PI * 2);
				ctx!.fillStyle = `rgba(${col.r},${col.g},${col.b},${a})`;
				ctx!.fill();
				if (s.layer >= 1 && a > 0.4) {
					ctx!.beginPath();
					ctx!.arc(s.wx, s.wy, s.size * 5, 0, Math.PI * 2);
					ctx!.fillStyle = `rgba(${col.r},${col.g},${col.b},${a * 0.06})`;
					ctx!.fill();
				}
				if (s.flare && a > 0.6) drawCrossFlare(s.wx, s.wy, s.size, a, col);
			}
		}
	}

	function drawCrossFlare(x: number, y: number, size: number, alpha: number, color: { r: number; g: number; b: number }) {
		const len = size * 12, fa = alpha * 0.3;
		ctx!.save(); ctx!.translate(x, y);
		for (const ang of [0, Math.PI / 2]) {
			ctx!.beginPath();
			ctx!.moveTo(-len * Math.cos(ang), -len * Math.sin(ang));
			ctx!.lineTo(len * Math.cos(ang), len * Math.sin(ang));
			ctx!.strokeStyle = `rgba(${color.r},${color.g},${color.b},${fa})`;
			ctx!.lineWidth = 0.5; ctx!.stroke();
			ctx!.beginPath();
			ctx!.moveTo(-len * 0.6 * Math.cos(ang), -len * 0.6 * Math.sin(ang));
			ctx!.lineTo(len * 0.6 * Math.cos(ang), len * 0.6 * Math.sin(ang));
			ctx!.strokeStyle = `rgba(${color.r},${color.g},${color.b},${fa * 0.4})`;
			ctx!.lineWidth = 2.5; ctx!.stroke();
		}
		ctx!.restore();
	}

	function drawConnectionLines(time: number) {
		for (const cd of connData) {
			const { s1, s2, c1, c2 } = cd;
			if (s1.phase === 'hidden' || s2.phase === 'hidden') continue;
			const midC = { r: (c1.r + c2.r) / 2, g: (c1.g + c2.g) / 2, b: (c1.b + c2.b) / 2 };
			// Only show lines between visible stars
			const bothRead = s1.read && s2.read;
			const alpha = bothRead ? 0.45 : 0.2;

			// Outer glow
			ctx!.beginPath(); ctx!.moveTo(s1.x, s1.y); ctx!.lineTo(s2.x, s2.y);
			ctx!.strokeStyle = `rgba(${c1.r},${c1.g},${c1.b},${alpha * 0.12})`;
			ctx!.lineWidth = 4; ctx!.stroke();

			// Dashed line
			const g = ctx!.createLinearGradient(s1.x, s1.y, s2.x, s2.y);
			g.addColorStop(0, `rgba(${c1.r},${c1.g},${c1.b},${alpha})`);
			g.addColorStop(0.5, `rgba(${midC.r},${midC.g},${midC.b},${alpha})`);
			g.addColorStop(1, `rgba(${c2.r},${c2.g},${c2.b},${alpha})`);
			ctx!.beginPath(); ctx!.moveTo(s1.x, s1.y); ctx!.lineTo(s2.x, s2.y);
			ctx!.strokeStyle = g;
			ctx!.lineWidth = bothRead ? 1.2 : 0.8;
			ctx!.setLineDash([4, 12]);
			ctx!.lineDashOffset = -time * (bothRead ? 30 : 15);
			ctx!.stroke();
			ctx!.setLineDash([]);
		}
	}

	function drawEDots(time: number) {
		for (const dot of eDots) {
			dot.progress += dot.speed;
			if (dot.progress > 1) dot.progress -= 1;
			const cd = connData[dot.connIdx];
			if (!cd || cd.s1.phase === 'hidden' || cd.s2.phase === 'hidden') continue;
			if (!cd.s1.read || !cd.s2.read) continue; // only show dots on read connections
			const x = cd.s1.x + (cd.s2.x - cd.s1.x) * dot.progress;
			const y = cd.s1.y + (cd.s2.y - cd.s1.y) * dot.progress;
			const pulse = 0.6 + 0.4 * Math.sin(time * 3 + dot.progress * Math.PI);
			const a = dot.alpha * pulse;

			const g = ctx!.createRadialGradient(x, y, 0, x, y, dot.size * 5);
			g.addColorStop(0, `rgba(${dot.color.r},${dot.color.g},${dot.color.b},${a})`);
			g.addColorStop(0.5, `rgba(${dot.color.r},${dot.color.g},${dot.color.b},${a * 0.2})`);
			g.addColorStop(1, 'rgba(0,0,0,0)');
			ctx!.beginPath(); ctx!.arc(x, y, dot.size * 5, 0, Math.PI * 2); ctx!.fillStyle = g; ctx!.fill();
			ctx!.beginPath(); ctx!.arc(x, y, dot.size, 0, Math.PI * 2);
			ctx!.fillStyle = `rgba(255,255,255,${a})`; ctx!.fill();
		}
	}

	function drawFragmentStars(time: number) {
		for (const ef of emergingFrags) {
			if (ef.phase === 'hidden') continue;
			if (ef.starId === 'void-entry') continue;

			const isCrystallizing = ef.phase === 'crystallizing';
			const isEmerging = ef.phase === 'emerging' || ef.phase === 'lingering';
			const elapsed = time - ef.phaseStart;

			// Crystallization scale (0→1 during crystallizing, 1 otherwise)
			let crystalScale = 1;
			if (isCrystallizing) {
				crystalScale = Math.min(1, elapsed / CRYSTALLIZE_DURATION);
				// Ease out
				crystalScale = 1 - Math.pow(1 - crystalScale, 3);
			} else if (isEmerging) {
				crystalScale = 0;
			}

			const breath = 1 + Math.sin(time * 0.5 + ef.id.charCodeAt(3)) * 0.08;
			const unreadPulse = (!ef.read && ef.phase === 'star') ? 1 + Math.sin(time * 2.5) * 0.12 : 1;
			const bright = ef.brightness * (ef.read ? 1.0 : 1.2) * unreadPulse;
			const twinkle = ef.phase === 'star' ? Math.sin(time * 1.5 + ef.id.charCodeAt(5)) * 0.1 : 0;
			const eff = bright + twinkle;
			const cs = ef.size * breath * crystalScale;

			if (crystalScale < 0.01) continue;

			// Super-outer bloom (very faint, very wide)
			const soR = cs * 18;
			const sog = ctx!.createRadialGradient(ef.x, ef.y, cs * 5, ef.x, ef.y, soR);
			sog.addColorStop(0, `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.02})`);
			sog.addColorStop(1, 'rgba(0,0,0,0)');
			ctx!.beginPath(); ctx!.arc(ef.x, ef.y, soR, 0, Math.PI * 2); ctx!.fillStyle = sog; ctx!.fill();

			// Outer halo
			const oR = cs * 10;
			const og = ctx!.createRadialGradient(ef.x, ef.y, cs * 2, ef.x, ef.y, oR);
			og.addColorStop(0, `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.08})`);
			og.addColorStop(0.5, `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.03})`);
			og.addColorStop(1, 'rgba(0,0,0,0)');
			ctx!.beginPath(); ctx!.arc(ef.x, ef.y, oR, 0, Math.PI * 2); ctx!.fillStyle = og; ctx!.fill();

			// Mid halo
			const mR = cs * 5;
			const mg = ctx!.createRadialGradient(ef.x, ef.y, cs, ef.x, ef.y, mR);
			mg.addColorStop(0, `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.35})`);
			mg.addColorStop(0.6, `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.1})`);
			mg.addColorStop(1, 'rgba(0,0,0,0)');
			ctx!.beginPath(); ctx!.arc(ef.x, ef.y, mR, 0, Math.PI * 2); ctx!.fillStyle = mg; ctx!.fill();

			// Unread hint ring — bolder
			if (!ef.read && ef.phase === 'star') {
				ctx!.beginPath(); ctx!.arc(ef.x, ef.y, mR + 3, 0, Math.PI * 2);
				ctx!.strokeStyle = `rgba(255,216,150,${0.35 + unreadPulse * 0.25})`;
				ctx!.lineWidth = 1.5; ctx!.stroke();
			}

			// Core
			ctx!.beginPath(); ctx!.arc(ef.x, ef.y, cs, 0, Math.PI * 2);
			ctx!.fillStyle = `rgba(255,255,255,${eff})`; ctx!.fill();

			// Inner point
			ctx!.beginPath(); ctx!.arc(ef.x, ef.y, cs * 0.4, 0, Math.PI * 2);
			ctx!.fillStyle = 'rgba(255,255,255,1)'; ctx!.fill();
		}
	}

	// ── Emerging text rendering ──
	function drawEmergingTexts(time: number) {
		for (const ef of emergingFrags) {
			if (ef.phase === 'hidden' || ef.phase === 'star') continue;
			if (!ef.shortText) continue;

			const elapsed = time - ef.phaseStart;
			let textAlpha = 0;

			if (ef.phase === 'emerging') {
				textAlpha = Math.min(1, elapsed / EMERGE_DURATION);
				// Ease out
				textAlpha = 1 - Math.pow(1 - textAlpha, 2);
			} else if (ef.phase === 'lingering') {
				textAlpha = 1;
			} else if (ef.phase === 'crystallizing') {
				const t = Math.min(1, elapsed / CRYSTALLIZE_DURATION);
				textAlpha = t < 0.45 ? 1 : 1 - Math.pow((t - 0.45) / 0.55, 2);
			}

			if (textAlpha <= 0.01) continue;

			// Render text above the star position
			const textY = ef.y - ef.size * 12;
			const fontSize = 22;
			ctx!.save();
			ctx!.font = `200 ${fontSize}px "Inter", system-ui, sans-serif`;
			ctx!.textAlign = 'center';
			ctx!.textBaseline = 'bottom';

			// Outer text glow
			ctx!.shadowColor = `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${textAlpha * 0.5})`;
			ctx!.shadowBlur = 30;
			ctx!.fillStyle = `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${textAlpha})`;
			ctx!.fillText(ef.shortText, ef.x, textY);

			// Brighter text core
			ctx!.shadowBlur = 0;
			ctx!.fillStyle = `rgba(255,255,255,${textAlpha * 0.8})`;
			ctx!.fillText(ef.shortText, ef.x, textY);

			ctx!.restore();
		}
	}

	function drawVoidEntrance(time: number) {
		const ef = emergingFrags.find(f => f.starId === 'void-entry');
		if (!ef || ef.phase === 'hidden') return;

		const breathCycle = Math.sin(time * 0.25) * 0.5 + 0.5;
		const breathA = voidRevealed ? 0.5 + breathCycle * 0.4 : 0.25 + breathCycle * 0.1;
		const scale = voidRevealed ? 1 + breathCycle * 0.3 : 1;
		const cs = ef.size * scale, rR = cs * 8 * scale;

		if (voidRevealed) {
			for (let ring = 0; ring < 3; ring++) {
				const rp = (time * 0.4 + ring * 2) % (Math.PI * 2);
				const ra = breathA * 0.15 * (0.5 + 0.5 * Math.sin(rp));
				const rr = rR + Math.sin(rp) * 15;
				ctx!.beginPath(); ctx!.arc(ef.x, ef.y, rr, 0, Math.PI * 2);
				ctx!.strokeStyle = `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${ra})`;
				ctx!.lineWidth = 1; ctx!.stroke();
			}
		}

		const og = ctx!.createRadialGradient(ef.x, ef.y, cs, ef.x, ef.y, rR * 1.5);
		og.addColorStop(0, `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${breathA * 0.2})`);
		og.addColorStop(0.5, `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${breathA * 0.05})`);
		og.addColorStop(1, 'rgba(0,0,0,0)');
		ctx!.beginPath(); ctx!.arc(ef.x, ef.y, rR * 1.5, 0, Math.PI * 2); ctx!.fillStyle = og; ctx!.fill();

		const mg = ctx!.createRadialGradient(ef.x, ef.y, cs * 0.5, ef.x, ef.y, cs * 4);
		mg.addColorStop(0, `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${breathA * 0.5})`);
		mg.addColorStop(0.5, `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${breathA * 0.12})`);
		mg.addColorStop(1, 'rgba(0,0,0,0)');
		ctx!.beginPath(); ctx!.arc(ef.x, ef.y, cs * 4, 0, Math.PI * 2); ctx!.fillStyle = mg; ctx!.fill();

		ctx!.beginPath(); ctx!.arc(ef.x, ef.y, cs, 0, Math.PI * 2);
		ctx!.fillStyle = `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${breathA})`; ctx!.fill();

		ctx!.beginPath(); ctx!.arc(ef.x, ef.y, cs * 0.3, 0, Math.PI * 2);
		ctx!.fillStyle = `rgba(200,210,255,${breathA + 0.15})`; ctx!.fill();

		if (voidRevealed) {
			const dist = Math.hypot(mouseSpaceX - ef.x, mouseSpaceY - ef.y);
			const prox = Math.max(0, 1 - dist / 350);
			if (prox > 0) {
				const pg = ctx!.createRadialGradient(ef.x, ef.y, cs, ef.x, ef.y, rR * 2);
				pg.addColorStop(0, `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${prox * 0.08})`);
				pg.addColorStop(1, 'rgba(0,0,0,0)');
				ctx!.beginPath(); ctx!.arc(ef.x, ef.y, rR * 2, 0, Math.PI * 2); ctx!.fillStyle = pg; ctx!.fill();
			}
		}
	}

	function drawVignette() {
		const g = ctx!.createRadialGradient(
			canvas.width / 2, canvas.height / 2, 0,
			canvas.width / 2, canvas.height / 2,
			Math.max(canvas.width, canvas.height) * 0.65
		);
		g.addColorStop(0, 'rgba(0,0,0,0)');
		g.addColorStop(0.4, 'rgba(0,0,0,0)');
		g.addColorStop(0.75, 'rgba(0,0,0,0.35)');
		g.addColorStop(1, 'rgba(0,0,0,0.7)');
		ctx!.fillStyle = g;
		ctx!.fillRect(0, 0, canvas.width, canvas.height);
	}
</script>

<canvas bind:this={canvas} class="fixed inset-0 w-full h-full living-space-canvas" />

<style>
	.living-space-canvas { z-index: 0; cursor: grab; touch-action: none; }
	.living-space-canvas:active { cursor: grabbing; }
</style>
