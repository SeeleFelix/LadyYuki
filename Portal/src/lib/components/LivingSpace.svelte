<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import {
    areas,
    connections,
    getStarById,
    getStarGroupColor,
    groupColors,
  } from "$lib/data/constellation";
  import { getFragmentById } from "$lib/data/fragments";
  import type { SpaceStar, SpaceViewport } from "$lib/types/space";
  import type { Fragment } from "$lib/types/agent";
  import type { Locale } from "$lib/i18n/detector";
  import { drawVoidGate, drawIgnition } from "./living-space/void-gate";
  import {
    drawBgStars,
    drawNebulas,
    drawMilkyWay,
  } from "./living-space/background";
  import type { EmergingFrag, Whisper } from "./living-space/types";

  // ── Props ──
  interface Props {
    locale?: Locale;
    paused?: boolean;
    onstarclick?: (
      star: SpaceStar,
      fragment: Fragment,
      screenX: number,
      screenY: number,
    ) => void;
    onentervoid?: () => void;
  }

  let {
    locale = "en",
    paused = false,
    onstarclick,
    onentervoid,
  }: Props = $props();

  let canvas!: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrameId: number;

  // ── Seeded random ──
  let seed = $state(0);
  function seededRandom(): number {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  // ── Emergence state ──
  type EmergePhase =
    | "hidden"
    | "emerging"
    | "lingering"
    | "crystallizing"
    | "star";

  interface EmergingFrag {
    id: string;
    fragmentId: string;
    starId: string;
    x: number;
    y: number;
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
    proximity: number;
    screenX: number;
    screenY: number;
    textAlpha: number;
  }

  let emergingFrags: EmergingFrag[] = $state([]);
  let rippleX = $state(0);
  let rippleY = $state(0);
  let rippleAge = $state(Infinity);
  const RIPPLE_DURATION = 0.45;
  let readCount = $state(0);
  let revelationPulse = $state(0); // 1→0 when all 16 read, fades over 3s

  // Emergence timing constants
  const EMERGE_DURATION = 1.2;
  const LINGER_DURATION = 3.5;
  const CRYSTALLIZE_DURATION = 1.0;

  let emergeQueue: EmergingFrag[] = [];

  // ── Void breathing ──
  const VOID_BREATH_PERIOD = 12;
  let voidBreathTime = $state(0); // cycles continuously

  // ── Whispers ──
  interface Whisper {
    sx: number;
    sy: number;
    tx: number;
    ty: number;
    text: string;
    progress: number; // 0→1
    color: { r: number; g: number; b: number };
    life: number; // seconds remaining
  }
  const WHISPER_DURATION = 3.5;
  let whispers: Whisper[] = $state([]);
  let whisperCooldown = $state(0);

  // ── Resonance ──
  interface Resonance {
    starId: string;
    color: { r: number; g: number; b: number };
    startTime: number;
    delay: number; // propagation delay
    duration: number;
  }
  const RESONANCE_DURATION = 2.0;
  let resonances: Resonance[] = $state([]);

  // ── Viewport ──
  // No hard bounds. Guidance is visual gravity, not walls.
  let viewport = $state<SpaceViewport>({
    x: 0,
    y: 0,
    zoom: 0.35,
    targetX: 0,
    targetY: 0,
    targetZoom: 0.35,
  });

  // Gravity drift target — set by force simulation result
  let driftTarget = $state({ x: 0, y: 0 });

  // ── Auto-pan cinematography ──
  type AutoPanPhase = "none" | "panToVoid" | "followWhisper" | "settle";
  let autoPanPhase = $state<AutoPanPhase>("none");
  let settleTimer = $state(0);
  let pendingWhisper: {
    sx: number;
    sy: number;
    tx: number;
    ty: number;
    text: string;
    color: { r: number; g: number; b: number };
  } | null = null;
  let activeWhisperIdx = $state(-1);
  let isFirstOpening = $state(false);
  let openingInitialDist = $state(1);
  let bootTime = 0;
  let ignitionAge = 0;
  let ignitionShake = 0;
  let ignitionParticles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: { r: number; g: number; b: number };
  }> = [];

  function isAutoPanning() {
    return autoPanPhase !== "none";
  }

  function launchPendingWhisper() {
    if (!pendingWhisper) return;
    whispers.push({
      ...pendingWhisper,
      progress: 0,
      life: WHISPER_DURATION,
    });
    activeWhisperIdx = whispers.length - 1;
    pendingWhisper = null;
    isFirstOpening = false;
    openingInitialDist = 1;
    openingTextAlpha = 0;
    autoPanPhase = "followWhisper";
  }

  // ── Mouse / drag ──
  let mouseScreenX = 0,
    mouseScreenY = 0;
  let mouseSpaceX = 0,
    mouseSpaceY = 0;
  let isDragging = false;
  let dragStartX = 0,
    dragStartY = 0;
  let dragStartViewX = 0,
    dragStartViewY = 0;
  let dragThresholdMet = false;
  // ── Chunk-based infinite background ──
  const CHUNK_SIZE = 1200;

  type StarType = "dust" | "field" | "beacon";

  interface BgStar {
    wx: number;
    wy: number;
    size: number;
    opacity: number;
    twinklePhase: number;
    twinkleSpeed: number;
    type: StarType;
    temp: number;
    flare: boolean;
  }

  interface Dust {
    x: number;
    y: number;
    size: number;
    alpha: number;
    vx: number;
    vy: number;
    color: { r: number; g: number; b: number };
    life: number;
    maxLife: number;
  }

  interface Chunk {
    stars: BgStar[];
    dusts: Dust[];
  }

  let chunkCache = new Map<string, Chunk>();
  let activeChunks: string[] = [];
  let lastChunkUpdateX = Infinity,
    lastChunkUpdateY = Infinity;

  // ── Shooting stars ──
  type MeteorType = "swift" | "fireball" | "longtrail";
  interface ShootingStar {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    alpha: number;
    type: MeteorType;
    color: { r: number; g: number; b: number };
    trail: Array<{ x: number; y: number }>;
    sparks: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
    }>;
  }
  let shootingStars: ShootingStar[] = [];
  let nextShootingStarTime = Infinity; // suppressed until after explosion

  function chunkKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  function chunkSeed(cx: number, cy: number): number {
    return (cx * 374761393 + cy * 668265263) & 0x7fffffff || 1;
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

  // Milky Way: diagonal band from bottom-left to top-right in world space
  function milkyWayStrength(wx: number, wy: number): number {
    // Distance from diagonal line y = 0.5 * x
    const dist = Math.abs(wy - 0.5 * wx) / Math.sqrt(1 + 0.25);
    const bandWidth = 800;
    return Math.exp(-(dist * dist) / (2 * bandWidth * bandWidth));
  }

  function generateChunk(cx: number, cy: number): Chunk {
    const ox = cx * CHUNK_SIZE,
      oy = cy * CHUNK_SIZE;
    let s = chunkSeed(cx, cy);
    function rnd(): number {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    }

    const stars: BgStar[] = [];
    // Dust: 560, Field: 200, Beacon: 40 = 800 total
    for (let i = 0; i < 800; i++) {
      let wx = ox + rnd() * CHUNK_SIZE;
      let wy = oy + rnd() * CHUNK_SIZE;
      const mw = milkyWayStrength(wx, wy);

      let type: StarType;
      let size: number;
      let opacity: number;
      let twinkleSpeed: number;
      let flare: boolean;
      let temp: number;

      if (i < 560) {
        // Dust — barely visible texture
        type = "dust";
        size = 0.2 + rnd() * 0.4;
        opacity = 0.03 + rnd() * 0.13;
        twinkleSpeed = 0.1 + rnd() * 0.25;
        temp = rnd() * 0.3; // cool blue-white only
        flare = false;
      } else if (i < 760) {
        // Field — visible, gentle
        type = "field";
        size = 0.6 + rnd() * 1.0;
        opacity = 0.2 + rnd() * 0.35;
        twinkleSpeed = 0.3 + rnd() * 0.8;
        temp = rnd(); // full color range
        flare = false;
      } else {
        // Beacon — bright anchors, Milky Way biased
        type = "beacon";
        size = 1.5 + rnd() * 2.8;
        opacity = 0.5 + rnd() * 0.4;
        twinkleSpeed = 0.4 + rnd() * 1.2;
        temp = rnd(); // full color range
        flare = rnd() < 0.15;

        // Bias beacon position toward Milky Way
        if (rnd() > mw * 0.5 + 0.5) {
          wx = ox + rnd() * CHUNK_SIZE;
          wy = oy + rnd() * CHUNK_SIZE;
        }
      }

      stars.push({
        wx,
        wy,
        size,
        opacity,
        twinklePhase: rnd() * Math.PI * 2,
        twinkleSpeed,
        type,
        temp,
        flare,
      });
    }

    const dustColors = [
      { r: 139, g: 92, b: 246 },
      { r: 59, g: 130, b: 246 },
      { r: 236, g: 72, b: 153 },
      { r: 255, g: 220, b: 180 },
    ];
    const dusts: Dust[] = [];
    for (let i = 0; i < 35; i++) {
      dusts.push({
        x: ox + rnd() * CHUNK_SIZE,
        y: oy + rnd() * CHUNK_SIZE,
        size: 0.5 + rnd() * 1.5,
        alpha: 0.1 + rnd() * 0.3,
        vx: (rnd() - 0.5) * 0.3,
        vy: (rnd() - 0.5) * 0.3,
        color: dustColors[Math.floor(rnd() * dustColors.length)],
        life: Math.floor(rnd() * 300),
        maxLife: 200 + Math.floor(rnd() * 300),
      });
    }

    return { stars, dusts };
  }

  function updateActiveChunks() {
    // Determine visible world rect at current viewport
    const halfW = canvas.width / viewport.zoom / 2;
    const halfH = canvas.height / viewport.zoom / 2;
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
    bx: number;
    by: number;
    radius: number;
    opacity: number;
    color: { r: number; g: number; b: number };
    speed: number;
    phase: number;
    seed: number;
  }
  let nebulas: Nebula[] = [];

  // ── Energy dots ──
  interface EDot {
    connIdx: number;
    progress: number;
    speed: number;
    size: number;
    alpha: number;
    color: { r: number; g: number; b: number };
  }
  let eDots: EDot[] = [];

  // Connection data for rendering
  let connData: Array<{
    s1: EmergingFrag;
    s2: EmergingFrag;
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
    if (temp < 0.5) {
      const t = temp * 2;
      return {
        r: Math.floor(180 + 75 * t),
        g: Math.floor(200 + 55 * t),
        b: 255,
      };
    }
    const t = (temp - 0.5) * 2;
    return {
      r: 255,
      g: Math.floor(255 - 55 * t),
      b: Math.floor(255 - 155 * t),
    };
  }

  // ── Coordinate transforms ──
  function screenToSpace(sx: number, sy: number): { x: number; y: number } {
    const cx = canvas.width / 2,
      cy = canvas.height / 2;
    return {
      x: (sx - cx) / viewport.zoom + viewport.x,
      y: (sy - cy) / viewport.zoom + viewport.y,
    };
  }

  function spaceToScreen(wx: number, wy: number): { x: number; y: number } {
    const cx = canvas.width / 2,
      cy = canvas.height / 2;
    return {
      x: (wx - viewport.x) * viewport.zoom + cx,
      y: (wy - viewport.y) * viewport.zoom + cy,
    };
  }

  // React to locale changes: re-fetch fragment texts without resetting positions/phases
  $effect(() => {
    const loc = locale as Locale;
    for (const ef of emergingFrags) {
      if (ef.starId === "void-entry") continue;
      const frag = getFragmentById(ef.fragmentId, loc);
      if (frag) {
        ef.shortText = frag.short;
        ef.fragment = frag;
      }
    }
  });
  onMount(() => {
    ctx = canvas.getContext("2d");
    if (!ctx) return;

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);

    // Session-random seed — different constellation each visit
    seed = Math.floor(Math.random() * 2147483646) + 1;

    createNebulas();
    generateEmergingFrags();
    buildConnData();
    createEDots();

    // Timeline: text at 1.5s, fissure at 10s, explosion at 12s, first whisper at 15s
    bootTime = performance.now() / 1000;
    setTimeout(() => {
      openingPhase = "typing";
      openingRevealIdx = 1;
      openingRevealTimer = 0;
    }, 1500);
    firstWhisperTime = bootTime + 9;

    animate();
  });

  onDestroy(() => {
    if (!browser) return;
    window.removeEventListener("resize", resizeCanvas);
    canvas.removeEventListener("mousedown", onMouseDown);
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("mouseup", onMouseUp);
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("touchstart", onTouchStart);
    canvas.removeEventListener("touchmove", onTouchMove);
    canvas.removeEventListener("touchend", onTouchEnd);
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
      id: string;
      fragmentId: string;
      starId: string;
      x: number;
      y: number;
      groupArea: string;
      color: { r: number; g: number; b: number };
      connections: string[];
      fragment: Fragment | null;
      shortText: string;
    }> = [];

    const fragGroups: Array<{ area: string; ids: string[] }> = [
      { area: "origin", ids: ["frag-1", "frag-2"] },
      { area: "seelefelix", ids: ["frag-3", "frag-4"] },
      { area: "chain", ids: ["frag-5", "frag-6", "frag-7"] },
      { area: "silhouette", ids: ["frag-8", "frag-9"] },
      { area: "axiom", ids: ["frag-10", "frag-11", "frag-12"] },
      { area: "standard", ids: ["frag-13", "frag-14", "frag-15"] },
      { area: "closing", ids: ["frag-16"] },
    ];
    for (const group of fragGroups) {
      const gColor = groupColors[group.area] ?? groupColors.void;
      for (const fragId of group.ids) {
        const frag = getFragmentById(fragId, locale as Locale) ?? null;
        const existingStar = getStarById(fragId);
        nodes.push({
          id: fragId,
          fragmentId: fragId,
          starId: fragId,
          x: (Math.random() - 0.5) * 1200,
          y: (Math.random() - 0.5) * 800,
          groupArea: group.area,
          color: gColor,
          connections: existingStar?.connections ?? [],
          fragment: frag,
          shortText: frag?.short ?? "",
        });
      }
    }
    // Void entrance node
    nodes.push({
      id: "void-entry",
      fragmentId: "void-entry",
      starId: "void-entry",
      x: (Math.random() - 0.5) * 1200,
      y: (Math.random() - 0.5) * 800,
      groupArea: "void-gate",
      color: groupColors.void,
      connections: ["frag-15"],
      fragment: null,
      shortText: "",
    });

    // Build connection set for fast lookup
    const connSet = new Set<string>();
    for (const n of nodes) {
      for (const t of n.connections) {
        connSet.add([n.id, t].sort().join("-"));
      }
    }
    function isConnected(a: string, b: string): boolean {
      return connSet.has([a, b].sort().join("-"));
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
          nodes[i].x += fx;
          nodes[i].y += fy;
          nodes[j].x -= fx;
          nodes[j].y -= fy;
        }
      }

      // Spring attraction along connections
      for (const n of nodes) {
        for (const tId of n.connections) {
          const t = nodes.find((o) => o.id === tId);
          if (!t) continue;
          const dx = t.x - n.x;
          const dy = t.y - n.y;
          const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const force = (dist - SPRING_LEN) * SPRING_K;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          n.x += fx;
          n.y += fy;
          t.x -= fx;
          t.y -= fy;
        }
      }

      // Center gravity
      for (const n of nodes) {
        n.x -= n.x * CENTER_K;
        n.y -= n.y * CENTER_K;
      }
    }

    // Build emergingFrags from simulation results
    emergingFrags = nodes.map((n) => ({
      id: `emerge-${n.id}`,
      fragmentId: n.fragmentId,
      starId: n.starId,
      x: n.x,
      y: n.y,
      size: 4.5 + Math.random() * 0.5,
      brightness: 0.8 + Math.random() * 0.1,
      phase: "hidden" as EmergePhase,
      phaseStart: 0,
      read: false,
      groupArea: n.groupArea,
      color: n.color,
      shortText: n.shortText,
      fragment: n.fragment,
      connections: n.connections,
      proximity: 0,
      screenX: 0,
      screenY: 0,
      textAlpha: 0,
    }));

    // Build emergence queue: all fragment stars in order
    emergeQueue = emergingFrags.filter((f) => f.starId !== "void-entry");

    // Center initial viewport on void entrance
    const voidNode = emergingFrags.find((f) => f.starId === "void-entry");
    if (voidNode) {
      driftTarget.x = voidNode.x;
      driftTarget.y = voidNode.y;
      viewport.x = viewport.targetX = voidNode.x;
      viewport.y = viewport.targetY = voidNode.y;
    }
  }

  // ── Build connection data for rendering ──
  function buildConnData() {
    connData = [];
    for (const conn of connections) {
      const s1 = emergingFrags.find((f) => f.starId === conn.star1Id);
      const s2 = emergingFrags.find((f) => f.starId === conn.star2Id);
      if (!s1 || !s2) continue;
      connData.push({
        s1,
        s2,
        c1: s1.color,
        c2: s2.color,
        isInterGroup: s1.groupArea !== s2.groupArea,
      });
    }
  }

  function createEDots() {
    eDots = [];
    connData.forEach((cd, i) => {
      const count = cd.isInterGroup ? 3 : 2;
      for (let j = 0; j < count; j++) {
        eDots.push({
          connIdx: i,
          progress: Math.random(),
          speed: 0.0006 + Math.random() * 0.0012,
          size: 1 + Math.random() * 1.5,
          alpha: 0.3 + Math.random() * 0.4,
          color: j % 2 === 0 ? cd.c1 : cd.c2,
        });
      }
    });
  }

  function createNebulas() {
    nebulas = [];
    const colors = [
      { r: 139, g: 92, b: 246 },
      { r: 59, g: 130, b: 246 },
      { r: 236, g: 72, b: 153 },
      { r: 99, g: 102, b: 241 },
      { r: 6, g: 182, b: 212 },
      { r: 180, g: 130, b: 255 },
      { r: 255, g: 180, b: 100 },
    ];
    for (let i = 0; i < 8; i++) {
      const area = areas[i % areas.length];
      nebulas.push({
        bx: (area?.centerX ?? -300) + (Math.random() - 0.5) * 200,
        by: (area?.centerY ?? -100) + (Math.random() - 0.5) * 150,
        radius: 500 + Math.random() * 400,
        opacity: 0.015 + Math.random() * 0.03,
        color: colors[i % colors.length],
        speed: 0.008 + Math.random() * 0.015,
        phase: Math.random() * Math.PI * 2,
        seed: Math.random() * 1000,
      });
    }
  }

  // ── Mouse handlers ──
  function onMouseDown(e: MouseEvent) {
    if (isAutoPanning()) return;
    isDragging = true;
    dragThresholdMet = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartViewX = viewport.x;
    dragStartViewY = viewport.y;
  }

  function onMouseMove(e: MouseEvent) {
    mouseScreenX = e.clientX;
    mouseScreenY = e.clientY;
    const sp = screenToSpace(e.clientX, e.clientY);
    mouseSpaceX = sp.x;
    mouseSpaceY = sp.y;

    if (isDragging) {
      const dx = e.clientX - dragStartX,
        dy = e.clientY - dragStartY;
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
    if (isAutoPanning()) return;
    e.preventDefault();
    viewport.targetZoom = Math.max(
      0.3,
      Math.min(1.2, viewport.targetZoom * (1 - e.deltaY * 0.001)),
    );
  }

  // ── Touch handlers (mobile) ──
  let touchDist0 = 0;
  let lastTouchX = 0,
    lastTouchY = 0;

  function onTouchStart(e: TouchEvent) {
    if (isAutoPanning()) return;
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      lastTouchX = t.clientX;
      lastTouchY = t.clientY;
      isDragging = true;
      dragThresholdMet = false;
      dragStartX = t.clientX;
      dragStartY = t.clientY;
      dragStartViewX = viewport.x;
      dragStartViewY = viewport.y;
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
      lastTouchX = t.clientX;
      lastTouchY = t.clientY;
      mouseScreenX = t.clientX;
      mouseScreenY = t.clientY;
      const sp = screenToSpace(t.clientX, t.clientY);
      mouseSpaceX = sp.x;
      mouseSpaceY = sp.y;
      const dx = t.clientX - dragStartX,
        dy = t.clientY - dragStartY;
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
        viewport.targetZoom = Math.max(
          0.3,
          Math.min(1.2, viewport.targetZoom * (dist / touchDist0)),
        );
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
      if (ef.phase !== "star") continue;

      const hitR = Math.max(ef.size * 10, 30);
      if (Math.hypot(wx - ef.x, wy - ef.y) <= hitR) {
        if (ef.starId === "void-entry") {
          onentervoid?.();
          return;
        }
        // Don't call onstarclick yet — the click registers but content is shown by parent
        // Build a SpaceStar-like object for the callback
        const spaceStar: SpaceStar = {
          id: ef.starId,
          areaId: ef.groupArea,
          x: ef.x,
          y: ef.y,
          size: ef.size,
          brightness: ef.brightness,
          contentType: "fragment",
          contentRef: ef.fragmentId,
          label: {},
          connections: ef.connections,
          pulseSpeed: 1.5,
        };
        if (ef.fragment) {
          rippleX = ef.x;
          rippleY = ef.y;
          rippleAge = 0;
          onstarclick?.(spaceStar, ef.fragment, sx, sy);
        }
        return;
      }
    }
  }

  // Called by parent when content overlay is closed
  export function markFragmentRead(fragmentId: string) {
    const ef = emergingFrags.find((f) => f.fragmentId === fragmentId);
    if (ef && !ef.read) {
      ef.read = true;
      readCount++;
      if (readCount >= 16) revelationPulse = 1;
      // Trigger resonance on connected stars
      const time = performance.now() / 1000;
      for (const connId of ef.connections) {
        const connected = emergingFrags.find((f) => f.starId === connId);
        if (!connected || connected.phase === "hidden") continue;
        resonances.push({
          starId: connId,
          color: ef.color,
          startTime: time,
          delay: 0,
          duration: RESONANCE_DURATION,
        });
        // Propagate to second-degree connections with delay
        for (const conn2Id of connected.connections) {
          if (conn2Id === ef.starId) continue;
          const conn2 = emergingFrags.find((f) => f.starId === conn2Id);
          if (!conn2 || conn2.phase === "hidden") continue;
          resonances.push({
            starId: conn2Id,
            color: connected.color,
            startTime: time,
            delay: 0.3,
            duration: RESONANCE_DURATION * 0.7,
          });
        }
      }
    }
  }

  // ── Star emergence (whisper-driven, with initial boot) ──
  let firstWhisperTime = $state(Infinity);
  let openingTextAlpha = $state(0);
  let openingTextScreen = $state({ x: 0, y: 0 });
  let openingRevealIdx = $state(0); // streaming text char index
  let openingRevealTimer = $state(0); // accumulator for char reveal
  const OPENING_TEXT = "她在诉说。";
  let openingPhase = $state<"idle" | "typing" | "hold" | "fading">("idle");

  function updateEmergence(time: number) {
    // Void entrance always visible from start (vortex state)
    const voidEf = emergingFrags.find((f) => f.starId === "void-entry");
    if (voidEf && voidEf.phase === "hidden" && time > 0) {
      voidEf.phase = "star";
    }

    // Phase transitions
    for (const ef of emergingFrags) {
      if (ef.phase === "hidden" || ef.phase === "star") continue;
      const elapsed = time - ef.phaseStart;
      if (ef.phase === "emerging" && elapsed >= EMERGE_DURATION) {
        ef.phase = "lingering";
        ef.phaseStart = time;
      } else if (ef.phase === "lingering" && elapsed >= LINGER_DURATION) {
        ef.phase = "crystallizing";
        ef.phaseStart = time;
      } else if (
        ef.phase === "crystallizing" &&
        elapsed >= CRYSTALLIZE_DURATION
      ) {
        ef.phase = "star";
      }
    }
  }

  // ── Main animation ──
  function animate() {
    if (!ctx) return;
    const time = performance.now() / 1000;

    // Smooth viewport
    const lerp = 0.08;

    // Cinematic zoom with easing + release transition
    const elapsed = time - bootTime;
    const easeInOut = (t: number) =>
      t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    if (!isAutoPanning() && elapsed < 15) {
      let cinematicZoom = 0.65;
      if (ignitionAge <= 0) {
        const t = Math.min(elapsed / 9, 1);
        cinematicZoom = 0.35 + easeInOut(t) * 0.3;
      } else if (ignitionAge < 0.5) {
        cinematicZoom = 0.65 + Math.sin((ignitionAge * Math.PI) / 0.5) * 0.13;
      }
      if (elapsed < 13) {
        viewport.targetZoom = cinematicZoom;
      } else {
        const fade = (elapsed - 13) / 2;
        viewport.targetZoom =
          cinematicZoom + (viewport.zoom - cinematicZoom) * fade;
      }
    }

    // Streaming text: deliberate character reveal, 0.7s per char
    if (openingPhase === "typing") {
      openingRevealTimer += 1 / 60;
      if (openingRevealTimer >= 1.0 && openingRevealIdx < OPENING_TEXT.length) {
        openingRevealIdx++;
        openingRevealTimer = 0;
      }
      if (openingRevealIdx >= OPENING_TEXT.length) {
        openingPhase = "hold";
        openingRevealTimer = 0;
      }
      openingTextAlpha = 1;
    } else if (openingPhase === "hold") {
      openingRevealTimer += 1 / 60;
      openingTextAlpha = 1;
      // Begin fading as first stars appear (~4s after boot)
      if (openingRevealTimer >= 1.5) {
        openingPhase = "fading";
        openingRevealTimer = 0;
      }
    } else if (openingPhase === "fading") {
      openingRevealTimer += 1 / 60;
      openingTextAlpha = Math.max(0, 1 - openingRevealTimer / 2.5);
      if (openingTextAlpha <= 0) openingPhase = "idle";
    }

    // Track void screen position for text overlay
    const voidEf2 = emergingFrags.find((f) => f.starId === "void-entry");
    if (voidEf2) {
      const vsp = spaceToScreen(voidEf2.x, voidEf2.y);
      openingTextScreen = { x: vsp.x, y: vsp.y };
    }

    if (autoPanPhase === "panToVoid" && pendingWhisper) {
      // Phase 1: pan to void entrance before launching whisper
      const targetX = pendingWhisper.sx;
      const targetY = pendingWhisper.sy;
      const dist = Math.hypot(viewport.x - targetX, viewport.y - targetY);
      const panLerp = isFirstOpening ? 0.04 : 0.08;
      viewport.x += (targetX - viewport.x) * panLerp;
      viewport.y += (targetY - viewport.y) * panLerp;
      viewport.zoom += (0.65 - viewport.zoom) * panLerp;

      // Opening text: keep screen position synced with void
      if (isFirstOpening && pendingWhisper) {
        const vsp = spaceToScreen(targetX, targetY);
        openingTextScreen = { x: vsp.x, y: vsp.y };
      }

      // When close enough: hold briefly for first opening, launch directly otherwise
      if (dist < 80 && Math.abs(viewport.zoom - 0.65) < 0.05) {
        if (isFirstOpening) {
          openingTextAlpha = 1;
          settleTimer = 0.8; // brief hold before fissure
          autoPanPhase = "settle";
        } else {
          launchPendingWhisper();
        }
      }
    } else if (autoPanPhase === "followWhisper") {
      // Phase 2: track the whisper as it flies
      const w = whispers[activeWhisperIdx];
      if (w && w.life > 0 && w.progress < 1) {
        const t = easeInOutQuad(w.progress);
        const wx = w.sx + (w.tx - w.sx) * t;
        const wy = w.sy + (w.ty - w.sy) * t;
        viewport.x += (wx - viewport.x) * 0.1;
        viewport.y += (wy - viewport.y) * 0.1;
        viewport.zoom += (0.75 - viewport.zoom) * 0.08;
      } else {
        // Whisper ended, settle briefly then release
        autoPanPhase = "settle";
        settleTimer = 0.6;
      }
    } else if (autoPanPhase === "settle") {
      viewport.targetX = viewport.x;
      viewport.targetY = viewport.y;
      viewport.targetZoom = viewport.zoom;
      settleTimer -= 1 / 60;
      // Opening: fade text, trigger ignition, then launch whisper
      if (isFirstOpening) {
        if (settleTimer < 0.6) {
          openingTextAlpha = Math.max(0, settleTimer / 0.6);
        }
        if (settleTimer < 0.5 && ignitionAge === 0) {
          ignitionAge = 0.001;
          ignitionShake = 18;
          // Spawn burst particles
          const voidEf = emergingFrags.find((f) => f.starId === "void-entry");
          if (voidEf) {
            const colors = [
              { r: 220, g: 210, b: 255 },
              { r: 180, g: 160, b: 240 },
              { r: 255, g: 255, b: 255 },
              { r: 160, g: 180, b: 255 },
              { r: 200, g: 180, b: 240 },
            ];
            for (let i = 0; i < 30; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 400 + Math.random() * 900;
              ignitionParticles.push({
                x: voidEf.x,
                y: voidEf.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.3 + Math.random() * 0.5,
                maxLife: 0.3 + Math.random() * 0.5,
                color: colors[Math.floor(Math.random() * colors.length)],
              });
            }
          }
        }
        if (ignitionAge > 0 && ignitionAge < 5) {
          ignitionAge += 1 / 60;
        }
        if (ignitionAge >= 5) {
          launchPendingWhisper();
          ignitionAge = 6;
        }
      } else {
        if (settleTimer <= 0) {
          autoPanPhase = "none";
          activeWhisperIdx = -1;
          driftTarget.x = viewport.x;
          driftTarget.y = viewport.y;
        }
      }
    } else {
      viewport.x += (viewport.targetX - viewport.x) * lerp;
      viewport.y += (viewport.targetY - viewport.y) * lerp;
      viewport.zoom += (viewport.targetZoom - viewport.zoom) * lerp;
    }

    // Time-driven systems pause while content overlay is open
    if (!paused) {
      updateEmergence(time);

      voidBreathTime += 1 / 60;
      if (voidBreathTime > VOID_BREATH_PERIOD)
        voidBreathTime -= VOID_BREATH_PERIOD;

      // Spawn whisper: first on timer, subsequent on breath exhale
      const breathPhase = voidBreathTime / VOID_BREATH_PERIOD;
      const voidEf = emergingFrags.find((f) => f.starId === "void-entry");
      whisperCooldown = Math.max(0, whisperCooldown - 1 / 60);

      const shouldSpawnFirst =
        firstWhisperTime < Infinity &&
        time >= firstWhisperTime &&
        emergeQueue.length === 16;
      const shouldSpawnBreath =
        breathPhase >= 0.4 &&
        breathPhase < 0.42 &&
        whisperCooldown <= 0 &&
        emergeQueue.length > 0 &&
        emergeQueue.length < 16 &&
        !isFirstOpening;

      if ((shouldSpawnFirst || shouldSpawnBreath) && voidEf) {
        const target = emergeQueue[0];
        if (target && !pendingWhisper) {
          pendingWhisper = {
            sx: voidEf.x,
            sy: voidEf.y,
            tx: target.x,
            ty: target.y,
            text: target.shortText,
            color: target.color,
          };
          autoPanPhase = "panToVoid";
          whisperCooldown = 4;
          if (shouldSpawnFirst) {
            firstWhisperTime = Infinity;
            isFirstOpening = true;
            const vsp = spaceToScreen(voidEf.x, voidEf.y);
            openingTextScreen = { x: vsp.x, y: vsp.y };
          }
        }
      }

      // Update whispers + trigger star emergence on arrival
      for (const w of whispers) {
        w.progress += 1 / 60 / WHISPER_DURATION;
        w.life -= 1 / 60;
        // Whisper arrives: wake the target star
        if (w.progress >= 0.9 && w.progress - 1 / 60 / WHISPER_DURATION < 0.9) {
          // Find nearest hidden fragment star to the target position
          let best: EmergingFrag | null = null;
          let bestDist = Infinity;
          for (const ef of emergingFrags) {
            if (ef.phase !== "hidden" || ef.starId === "void-entry") continue;
            const d = Math.hypot(ef.x - w.tx, ef.y - w.ty);
            if (d < bestDist) {
              bestDist = d;
              best = ef;
            }
          }
          if (best) {
            best.phase = "emerging";
            best.phaseStart = time;
            emergeQueue = emergeQueue.filter((f) => f.starId !== best!.starId);
          }
        }
      }
      whispers = whispers.filter((w) => w.life > 0 && w.progress < 1);
    } // end paused guard

    // Update resonances
    resonances = resonances.filter(
      (r) => time - (r.startTime + r.delay) < r.duration,
    );

    // Update proximity + text alpha for emerging stars
    for (const ef of emergingFrags) {
      const sp = spaceToScreen(ef.x, ef.y);
      ef.screenX = sp.x;
      ef.screenY = sp.y;
      const screenDist = Math.hypot(mouseScreenX - sp.x, mouseScreenY - sp.y);
      ef.proximity = Math.max(0, 1 - (screenDist - 40) / 180);

      // Text alpha for emerging/lingering stars
      if (
        ef.phase === "emerging" ||
        ef.phase === "lingering" ||
        ef.phase === "crystallizing"
      ) {
        const elapsed = time - ef.phaseStart;
        let alpha = 0;
        if (ef.phase === "emerging") {
          alpha = Math.min(1, elapsed / EMERGE_DURATION);
          alpha = 1 - Math.pow(1 - alpha, 2);
        } else if (ef.phase === "lingering") {
          alpha = 1;
        } else if (ef.phase === "crystallizing") {
          const t = Math.min(1, elapsed / CRYSTALLIZE_DURATION);
          alpha = t < 0.45 ? 1 : 1 - Math.pow((t - 0.45) / 0.55, 2);
        }
        ef.textAlpha = alpha;
      } else {
        ef.textAlpha = 0;
      }
    }

    // Gentle gravity drift toward interest point when not dragging
    if (!isDragging) {
      const driftForce = 0.003;
      viewport.targetX += (driftTarget.x - viewport.targetX) * driftForce;
      viewport.targetY += (driftTarget.y - viewport.targetY) * driftForce;
    }

    const w = canvas.width,
      h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#04040a";
    ctx.fillRect(0, 0, w, h);

    // Only update chunks when viewport moved significantly (>300 world units)
    if (
      Math.abs(viewport.x - lastChunkUpdateX) > 300 ||
      Math.abs(viewport.y - lastChunkUpdateY) > 300
    ) {
      updateActiveChunks();
      lastChunkUpdateX = viewport.x;
      lastChunkUpdateY = viewport.y;
    }

    // Ignition: update particles + shake
    for (const p of ignitionParticles) {
      p.x += p.vx / 60;
      p.y += p.vy / 60;
      p.life -= 1 / 60;
    }
    ignitionParticles = ignitionParticles.filter((p) => p.life > 0);
    ignitionShake = Math.max(0, ignitionShake - (1 / 60) * 40);
    const shakeX = Math.sin(time * 55) * ignitionShake;
    const shakeY = Math.cos(time * 48) * ignitionShake;

    // Draw world-space
    ctx.save();
    const cx = w / 2,
      cy = h / 2;
    ctx.translate(cx, cy);
    ctx.scale(viewport.zoom, viewport.zoom);
    ctx.translate(-viewport.x - shakeX, -viewport.y - shakeY);

    // Shooting stars: activate after explosion
    if (nextShootingStarTime === Infinity && ignitionAge >= 0.3) {
      nextShootingStarTime = time + 3;
    }
    if (time > nextShootingStarTime && ignitionAge >= 0.3) {
      spawnShootingStar();
      nextShootingStarTime = time + 12 + Math.random() * 18;
    }
    updateShootingStars();

    // Revelation pulse: fades over ~3s when all 16 stars read
    if (revelationPulse > 0)
      revelationPulse = Math.max(0, revelationPulse - 1 / 180);
    // Field brightness follows narrative arc
    const fieldBrightness =
      ignitionAge <= 0
        ? 0.45
        : ignitionAge < 5
          ? 0.45 + (ignitionAge / 5) * 0.55
          : 1.0 + Math.min(readCount / 16, 1) * 0.1 + revelationPulse * 0.5;

    drawNebulas(ctx, time, fieldBrightness, nebulas, viewport, canvas);
    drawMilkyWay(ctx, fieldBrightness, viewport, canvas);
    drawDusts(time);
    const rawAwaken = Math.max(0, Math.min(1, (time - bootTime - 3.5) / 5));
    const awakenProgress = 1 - (1 - rawAwaken) * (1 - rawAwaken);
    drawBgStars(
      ctx,
      time,
      fieldBrightness,
      ignitionAge,
      awakenProgress,
      revelationPulse,
      emergingFrags,
      activeChunks,
      chunkCache,
      viewport,
      canvas,
    );
    drawShootingStars(time);
    drawConnectionLines(time);
    drawEDots(time);
    drawFragmentStars(time);
    drawIgnition(
      ctx,
      emergingFrags,
      ignitionAge,
      ignitionParticles,
      viewport,
      canvas,
    );
    drawVoidGate(
      ctx,
      emergingFrags,
      ignitionAge,
      time,
      mouseSpaceX,
      mouseSpaceY,
      viewport,
      canvas,
      readCount,
    );
    drawWhispers(time);

    // Click ripple
    if (rippleAge < RIPPLE_DURATION) {
      rippleAge += 1 / 60;
      const t = rippleAge / RIPPLE_DURATION;
      const radius = 20 + t * 120;
      const alpha = (1 - t) * 0.7;
      ctx!.beginPath();
      ctx!.arc(rippleX, rippleY, radius, 0, Math.PI * 2);
      ctx!.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx!.lineWidth = 2 * (1 - t);
      ctx!.stroke();
    }

    ctx.restore();

    drawVignette();
    animationFrameId = requestAnimationFrame(animate);
  }

  // ══════════════════════════════════════════
  //  Drawing functions (world-space)
  // ══════════════════════════════════════════

  function _oldNebulas(time: number, fieldBrightness: number) {
    for (const n of nebulas) {
      const dx = Math.sin(time * n.speed * 0.6 + n.phase) * 30;
      const dy = Math.cos(time * n.speed * 0.4 + n.phase) * 20;
      const nx = (noise(time * n.speed * 1.5, n.seed, 0) - 0.5) * 40;
      const ny = (noise(time * n.speed * 1.5, n.seed, 100) - 0.5) * 40;
      const pcx = n.bx + dx + nx,
        pcy = n.by + dy + ny;
      const pulse = 0.8 + 0.1 * Math.sin(time * n.speed * 0.8 + n.phase);

      const g = ctx!.createRadialGradient(pcx, pcy, 0, pcx, pcy, n.radius);
      g.addColorStop(
        0,
        `rgba(${n.color.r},${n.color.g},${n.color.b},${n.opacity * pulse * fieldBrightness})`,
      );
      g.addColorStop(
        0.35,
        `rgba(${n.color.r},${n.color.g},${n.color.b},${n.opacity * pulse * 0.5 * fieldBrightness})`,
      );
      g.addColorStop(
        0.7,
        `rgba(${n.color.r},${n.color.g},${n.color.b},${n.opacity * pulse * 0.12 * fieldBrightness})`,
      );
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = g;
      ctx!.fillRect(
        viewport.x - canvas.width / viewport.zoom,
        viewport.y - canvas.height / viewport.zoom,
        (canvas.width / viewport.zoom) * 2,
        (canvas.height / viewport.zoom) * 2,
      );
    }
  }

  function drawDusts(time: number) {
    for (const key of activeChunks) {
      const c = chunkCache.get(key);
      if (!c) continue;
      for (let i = 0; i < c.dusts.length; i++) {
        const p = c.dusts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        const lr = p.life / p.maxLife;
        const a =
          p.alpha * Math.sin(lr * Math.PI) * (0.6 + 0.4 * Math.sin(time + i));
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        const pc = p.color ?? { r: 139, g: 92, b: 246 };
        ctx!.fillStyle = `rgba(${pc.r},${pc.g},${pc.b},${a})`;
        ctx!.fill();
        // Reset dust when life expires
        if (p.life >= p.maxLife) {
          const cx = Math.floor(p.x / CHUNK_SIZE),
            cy = Math.floor(p.y / CHUNK_SIZE);
          const ox = cx * CHUNK_SIZE,
            oy = cy * CHUNK_SIZE;
          p.x = ox + Math.random() * CHUNK_SIZE;
          p.y = oy + Math.random() * CHUNK_SIZE;
          p.life = 0;
          p.maxLife = 200 + Math.floor(Math.random() * 300);
        }
      }
    }
  }

  function _oldBgStars(
    time: number,
    fieldBrightness: number,
    ignitionAge: number,
  ) {
    // Void position for proximity boost during ignition
    const voidEf = emergingFrags.find((f) => f.starId === "void-entry");
    const vx = voidEf?.x ?? 0;
    const vy = voidEf?.y ?? 0;
    const voidDist = Math.hypot(vx, vy);

    for (const key of activeChunks) {
      const c = chunkCache.get(key);
      if (!c) continue;
      for (const s of c.stars) {
        const twinkle = Math.sin(time * s.twinkleSpeed + s.twinklePhase);
        const twinkleRange =
          s.type === "dust" ? 0.15 : s.type === "beacon" ? 0.35 : 0.3;
        let a =
          s.opacity *
          (1 - twinkleRange + twinkle * twinkleRange) *
          fieldBrightness;

        // Fissure: sharp radial brightening as void cracks open
        if (ignitionAge > 0 && ignitionAge < 0.3) {
          const sd = Math.hypot(s.wx - vx, s.wy - vy);
          if (sd < 600) {
            const fissureBoost = (1 - sd / 600) * 0.6 * (ignitionAge / 0.3);
            a += fissureBoost * s.opacity;
          }
        }
        // Explosion proximity: stars near void brighten
        if (ignitionAge >= 0.3 && ignitionAge < 1.5) {
          const sd = Math.hypot(s.wx - vx, s.wy - vy);
          if (sd < 500) {
            const boost =
              (1 - sd / 500) * 0.4 * Math.sin((ignitionAge * Math.PI) / 1.5);
            a += boost * s.opacity;
          }
        }
        // Afterglow: subtle residual glow after ignition fades
        if (ignitionAge >= 5 && ignitionAge < 10) {
          const sd = Math.hypot(s.wx - vx, s.wy - vy);
          if (sd < 300) {
            const afterA = (1 - (ignitionAge - 5) / 5) * 0.15 * (1 - sd / 300);
            a += afterA * s.opacity;
          }
        }

        // Wave-front boost: stars near shockwave front
        if (ignitionAge > 0 && ignitionAge < 5) {
          const sd = Math.hypot(s.wx - vx, s.wy - vy);
          const waveSpeed =
            Math.max(canvas.width, canvas.height) / viewport.zoom / 5;
          for (let ri = 0; ri < 5; ri++) {
            const ringR = (ignitionAge - 0.05 - ri * 0.15) * waveSpeed;
            if (ringR < 0) continue;
            if (Math.abs(sd - ringR) < 60) {
              a += 0.15 * s.opacity * (1 - Math.abs(sd - ringR) / 60);
            }
          }
        }

        const col = starColor(s.temp);

        if (s.type === "dust") {
          // Bare dot — texture only
          ctx!.beginPath();
          ctx!.arc(s.wx, s.wy, s.size, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${col.r},${col.g},${col.b},${a})`;
          ctx!.fill();
        } else if (s.type === "field") {
          // Subtle glow
          ctx!.beginPath();
          ctx!.arc(s.wx, s.wy, s.size * 3, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${col.r},${col.g},${col.b},${a * 0.04})`;
          ctx!.fill();
          // Core
          ctx!.beginPath();
          ctx!.arc(s.wx, s.wy, s.size, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${col.r},${col.g},${col.b},${a})`;
          ctx!.fill();
        } else {
          // Beacon — multi-halo like fragment stars
          const cs = s.size;
          // Outer halo
          const oR = cs * 6;
          const og = ctx!.createRadialGradient(s.wx, s.wy, cs, s.wx, s.wy, oR);
          og.addColorStop(0, `rgba(${col.r},${col.g},${col.b},${a * 0.15})`);
          og.addColorStop(0.6, `rgba(${col.r},${col.g},${col.b},${a * 0.03})`);
          og.addColorStop(1, "rgba(0,0,0,0)");
          ctx!.beginPath();
          ctx!.arc(s.wx, s.wy, oR, 0, Math.PI * 2);
          ctx!.fillStyle = og;
          ctx!.fill();
          // Mid
          const mR = cs * 3;
          const mg = ctx!.createRadialGradient(
            s.wx,
            s.wy,
            cs * 0.5,
            s.wx,
            s.wy,
            mR,
          );
          mg.addColorStop(0, `rgba(${col.r},${col.g},${col.b},${a * 0.4})`);
          mg.addColorStop(0.5, `rgba(${col.r},${col.g},${col.b},${a * 0.1})`);
          mg.addColorStop(1, "rgba(0,0,0,0)");
          ctx!.beginPath();
          ctx!.arc(s.wx, s.wy, mR, 0, Math.PI * 2);
          ctx!.fillStyle = mg;
          ctx!.fill();
          // Core
          ctx!.beginPath();
          ctx!.arc(s.wx, s.wy, cs, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(255,255,255,${a})`;
          ctx!.fill();
          // Flare
          if (s.flare && a > 0.6) drawCrossFlare(s.wx, s.wy, cs, a, col);
        }
      }
    }
  }

  function drawCrossFlare(
    x: number,
    y: number,
    size: number,
    alpha: number,
    color: { r: number; g: number; b: number },
  ) {
    const len = size * 12,
      fa = alpha * 0.3;
    ctx!.save();
    ctx!.translate(x, y);
    for (const ang of [0, Math.PI / 2]) {
      ctx!.beginPath();
      ctx!.moveTo(-len * Math.cos(ang), -len * Math.sin(ang));
      ctx!.lineTo(len * Math.cos(ang), len * Math.sin(ang));
      ctx!.strokeStyle = `rgba(${color.r},${color.g},${color.b},${fa})`;
      ctx!.lineWidth = 0.5;
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.moveTo(-len * 0.6 * Math.cos(ang), -len * 0.6 * Math.sin(ang));
      ctx!.lineTo(len * 0.6 * Math.cos(ang), len * 0.6 * Math.sin(ang));
      ctx!.strokeStyle = `rgba(${color.r},${color.g},${color.b},${fa * 0.4})`;
      ctx!.lineWidth = 2.5;
      ctx!.stroke();
    }
    ctx!.restore();
  }

  // ── Shooting stars ──
  const METEOR_COLORS: Record<MeteorType, { r: number; g: number; b: number }> =
    {
      swift: { r: 255, g: 255, b: 255 }, // pure white, fast
      fireball: { r: 255, g: 220, b: 155 }, // warm gold, bright
      longtrail: { r: 200, g: 220, b: 255 }, // blue-white, slow
    };

  function spawnShootingStar() {
    const hw = canvas.width / viewport.zoom / 2;
    const hh = canvas.height / viewport.zoom / 2;
    const burst = Math.random() < 0.2; // 20% chance of burst
    const count = burst ? 2 + Math.floor(Math.random() * 2) : 1;

    for (let n = 0; n < count; n++) {
      const typeRand = Math.random();
      const type: MeteorType =
        typeRand < 0.3 ? "swift" : typeRand < 0.6 ? "fireball" : "longtrail";
      const col = METEOR_COLORS[type];
      // Speed in screen px/sec — consistent feel regardless of zoom
      const screenSpeed =
        type === "swift"
          ? 200 + Math.random() * 200
          : type === "fireball"
            ? 100 + Math.random() * 150
            : 60 + Math.random() * 100;
      const speed = screenSpeed / viewport.zoom;
      const angle = (Math.random() - 0.5) * Math.PI * 0.7;
      let sx: number, sy: number;
      // 50% edge spawn, 50% appear within visible area
      if (Math.random() < 0.5) {
        const edge = Math.floor(Math.random() * 4);
        switch (edge) {
          case 0:
            sx = viewport.x - hw;
            sy = viewport.y - hh + Math.random() * hh * 2;
            break;
          case 1:
            sx = viewport.x + hw;
            sy = viewport.y - hh + Math.random() * hh * 2;
            break;
          case 2:
            sx = viewport.x - hw + Math.random() * hw * 2;
            sy = viewport.y - hh;
            break;
          default:
            sx = viewport.x - hw + Math.random() * hw * 2;
            sy = viewport.y + hh;
            break;
        }
      } else {
        sx = viewport.x - hw * 0.7 + Math.random() * hw * 1.4;
        sy = viewport.y - hh * 0.7 + Math.random() * hh * 1.4;
      }
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const maxLife =
        type === "swift"
          ? 1.5 + Math.random() * 2
          : type === "fireball"
            ? 3 + Math.random() * 3
            : 4 + Math.random() * 4;
      const delay = n * (0.6 + Math.random() * 1.2);
      shootingStars.push({
        x: sx - vx * delay,
        y: sy - vy * delay,
        vx,
        vy,
        life: 0,
        maxLife,
        alpha: 0,
        type,
        color: col,
        trail: [],
        sparks: [],
      });
    }
  }

  function updateShootingStars() {
    const dt = 1 / 60;
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      ss.x += ss.vx * dt;
      ss.y += ss.vy * dt;
      ss.life += dt;
      const lr = ss.life / ss.maxLife;
      ss.alpha = lr < 0.12 ? lr / 0.12 : lr > 0.65 ? 1 - (lr - 0.65) / 0.35 : 1;

      // Trail: record position, keep last 50
      ss.trail.push({ x: ss.x, y: ss.y });
      if (ss.trail.length > 50) ss.trail.shift();

      // Sparks: occasionally spawn a spark particle at the head
      if (Math.random() < 0.5) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 20 + Math.random() * 60;
        ss.sparks.push({
          x: ss.x,
          y: ss.y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          life: 0,
          maxLife: 0.3 + Math.random() * 0.5,
        });
      }
      // Update sparks
      for (let j = ss.sparks.length - 1; j >= 0; j--) {
        const sp = ss.sparks[j];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.life += dt;
        if (sp.life >= sp.maxLife) ss.sparks.splice(j, 1);
      }

      if (ss.life >= ss.maxLife) shootingStars.splice(i, 1);
    }
  }

  function drawShootingStars(_time: number) {
    for (const ss of shootingStars) {
      if (ss.alpha < 0.02 || ss.trail.length < 2) continue;
      const col = ss.color;
      const headR =
        ss.type === "fireball" ? 18 : ss.type === "longtrail" ? 10 : 8;

      // Draw trail as polyline — each segment fades from head to tail
      const trail = ss.trail;
      // Outer glow trail
      ctx!.beginPath();
      ctx!.moveTo(trail[0].x, trail[0].y);
      for (let t = 1; t < trail.length; t++) {
        ctx!.lineTo(trail[t].x, trail[t].y);
      }
      ctx!.strokeStyle = `rgba(${col.r},${col.g},${col.b},${ss.alpha * 0.15})`;
      ctx!.lineWidth = 5;
      ctx!.lineCap = "round";
      ctx!.stroke();

      // Core trail — draw segment by segment with fading alpha
      for (let t = 1; t < trail.length; t++) {
        const segAlpha = (t / trail.length) * ss.alpha * 0.7;
        ctx!.beginPath();
        ctx!.moveTo(trail[t - 1].x, trail[t - 1].y);
        ctx!.lineTo(trail[t].x, trail[t].y);
        ctx!.strokeStyle = `rgba(255,255,255,${segAlpha})`;
        ctx!.lineWidth = ss.type === "fireball" ? 2.5 : 1.8;
        ctx!.lineCap = "round";
        ctx!.stroke();
      }
      ctx!.lineCap = "butt";

      // Sparks
      for (const sp of ss.sparks) {
        const slr = sp.life / sp.maxLife;
        const sa = (1 - slr) * ss.alpha * 0.6;
        if (sa < 0.02) continue;
        ctx!.beginPath();
        ctx!.arc(sp.x, sp.y, 1.5, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${col.r},${col.g},${col.b},${sa})`;
        ctx!.fill();
      }

      // Head glow
      const hg = ctx!.createRadialGradient(ss.x, ss.y, 0, ss.x, ss.y, headR);
      hg.addColorStop(0, `rgba(255,255,255,${ss.alpha})`);
      hg.addColorStop(
        0.3,
        `rgba(${col.r},${col.g},${col.b},${ss.alpha * 0.5})`,
      );
      hg.addColorStop(1, "rgba(255,255,255,0)");
      ctx!.beginPath();
      ctx!.arc(ss.x, ss.y, headR, 0, Math.PI * 2);
      ctx!.fillStyle = hg;
      ctx!.fill();
    }
  }

  // ── Milky Way band ──
  function _oldMilkyWay(fieldBrightness: number) {
    // Faint glow along the diagonal y = 0.5x
    const hw = canvas.width / viewport.zoom / 2;
    const hh = canvas.height / viewport.zoom / 2;
    const minX = viewport.x - hw,
      maxX = viewport.x + hw;
    const minY = viewport.y - hh,
      maxY = viewport.y + hh;
    // Sample points along the band
    for (let i = 0; i < 6; i++) {
      const cx = minX + (maxX - minX) * (i / 5);
      const cy = 0.5 * cx;
      const g = ctx!.createRadialGradient(cx, cy, 100, cx, cy, 700);
      g.addColorStop(0, `rgba(139,92,246,${0.015 * fieldBrightness})`);
      g.addColorStop(0.3, `rgba(59,130,246,${0.008 * fieldBrightness})`);
      g.addColorStop(0.6, `rgba(180,130,255,${0.004 * fieldBrightness})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = g;
      ctx!.fillRect(cx - 700, cy - 700, 1400, 1400);
    }
  }

  function drawConnectionLines(time: number) {
    for (const cd of connData) {
      const { s1, s2, c1, c2 } = cd;
      if (s1.phase === "hidden" || s2.phase === "hidden") continue;
      const midC = {
        r: (c1.r + c2.r) / 2,
        g: (c1.g + c2.g) / 2,
        b: (c1.b + c2.b) / 2,
      };
      // Only show lines between visible stars
      const bothRead = s1.read && s2.read;
      const alpha = bothRead ? 0.45 : 0.2;

      // Outer glow
      ctx!.beginPath();
      ctx!.moveTo(s1.x, s1.y);
      ctx!.lineTo(s2.x, s2.y);
      ctx!.strokeStyle = `rgba(${c1.r},${c1.g},${c1.b},${alpha * 0.12})`;
      ctx!.lineWidth = 4;
      ctx!.stroke();

      // Dashed line
      const g = ctx!.createLinearGradient(s1.x, s1.y, s2.x, s2.y);
      g.addColorStop(0, `rgba(${c1.r},${c1.g},${c1.b},${alpha})`);
      g.addColorStop(0.5, `rgba(${midC.r},${midC.g},${midC.b},${alpha})`);
      g.addColorStop(1, `rgba(${c2.r},${c2.g},${c2.b},${alpha})`);
      ctx!.beginPath();
      ctx!.moveTo(s1.x, s1.y);
      ctx!.lineTo(s2.x, s2.y);
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
      if (!cd || cd.s1.phase === "hidden" || cd.s2.phase === "hidden") continue;
      if (!cd.s1.read || !cd.s2.read) continue; // only show dots on read connections
      const x = cd.s1.x + (cd.s2.x - cd.s1.x) * dot.progress;
      const y = cd.s1.y + (cd.s2.y - cd.s1.y) * dot.progress;
      const pulse = 0.6 + 0.4 * Math.sin(time * 3 + dot.progress * Math.PI);
      const a = dot.alpha * pulse;

      const g = ctx!.createRadialGradient(x, y, 0, x, y, dot.size * 5);
      g.addColorStop(
        0,
        `rgba(${dot.color.r},${dot.color.g},${dot.color.b},${a})`,
      );
      g.addColorStop(
        0.5,
        `rgba(${dot.color.r},${dot.color.g},${dot.color.b},${a * 0.2})`,
      );
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.beginPath();
      ctx!.arc(x, y, dot.size * 5, 0, Math.PI * 2);
      ctx!.fillStyle = g;
      ctx!.fill();
      ctx!.beginPath();
      ctx!.arc(x, y, dot.size, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(255,255,255,${a})`;
      ctx!.fill();
    }
  }

  function drawFragmentStars(time: number) {
    for (const ef of emergingFrags) {
      if (ef.phase === "hidden") continue;
      if (ef.starId === "void-entry") continue;

      const isCrystallizing = ef.phase === "crystallizing";
      const isEmerging = ef.phase === "emerging" || ef.phase === "lingering";
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

      const breath = 1 + Math.sin(time * 0.5 + ef.id.charCodeAt(3)) * 0.12;
      const unreadPulse =
        !ef.read && ef.phase === "star" ? 1 + Math.sin(time * 2.5) * 0.12 : 1;
      const bright = ef.brightness * (ef.read ? 1.0 : 1.2) * unreadPulse;
      const twinkle =
        ef.phase === "star"
          ? Math.sin(time * 1.5 + ef.id.charCodeAt(5)) * 0.1
          : 0;
      const eff = bright + twinkle;
      const proxBoost = 1 + ef.proximity * 0.5;
      // Resonance boost
      let resBoost = 1;
      for (const r of resonances) {
        if (r.starId !== ef.starId) continue;
        const resElapsed = time - (r.startTime + r.delay);
        if (resElapsed < 0 || resElapsed > r.duration) continue;
        const resT = resElapsed / r.duration;
        // Quick swell, slow decay
        resBoost = 1 + (1 - resT) * Math.sin(resT * Math.PI) * 0.6;
      }
      const cs = ef.size * breath * crystalScale * (1 + (resBoost - 1) * 0.3);

      if (crystalScale < 0.01) continue;

      // Super-outer bloom (very faint, very wide)
      const soR = cs * 14;
      const sog = ctx!.createRadialGradient(
        ef.x,
        ef.y,
        cs * 5,
        ef.x,
        ef.y,
        soR,
      );
      sog.addColorStop(
        0,
        `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.02 * proxBoost})`,
      );
      sog.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.beginPath();
      ctx!.arc(ef.x, ef.y, soR, 0, Math.PI * 2);
      ctx!.fillStyle = sog;
      ctx!.fill();

      // Outer halo
      const oR = cs * 8;
      const og = ctx!.createRadialGradient(ef.x, ef.y, cs * 2, ef.x, ef.y, oR);
      og.addColorStop(
        0,
        `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.08 * proxBoost})`,
      );
      og.addColorStop(
        0.5,
        `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.03 * proxBoost})`,
      );
      og.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.beginPath();
      ctx!.arc(ef.x, ef.y, oR, 0, Math.PI * 2);
      ctx!.fillStyle = og;
      ctx!.fill();

      // Mid halo
      const mR = cs * 4;
      const mg = ctx!.createRadialGradient(ef.x, ef.y, cs, ef.x, ef.y, mR);
      mg.addColorStop(
        0,
        `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.5 * proxBoost})`,
      );
      mg.addColorStop(
        0.5,
        `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.12 * proxBoost})`,
      );
      mg.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.beginPath();
      ctx!.arc(ef.x, ef.y, mR, 0, Math.PI * 2);
      ctx!.fillStyle = mg;
      ctx!.fill();

      // Inner glow — bridges core to mid-halo
      const igR = cs * 2.5;
      const igg = ctx!.createRadialGradient(
        ef.x,
        ef.y,
        cs * 0.3,
        ef.x,
        ef.y,
        igR,
      );
      igg.addColorStop(
        0,
        `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.65 * proxBoost})`,
      );
      igg.addColorStop(
        0.4,
        `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.3 * proxBoost})`,
      );
      igg.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.beginPath();
      ctx!.arc(ef.x, ef.y, igR, 0, Math.PI * 2);
      ctx!.fillStyle = igg;
      ctx!.fill();

      // Unread hint ring
      if (!ef.read && ef.phase === "star") {
        ctx!.beginPath();
        ctx!.arc(ef.x, ef.y, mR + 3, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${0.45 + unreadPulse * 0.25})`;
        ctx!.lineWidth = 2;
        ctx!.stroke();
      }

      // Core
      ctx!.beginPath();
      ctx!.arc(ef.x, ef.y, cs, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(255,255,255,${eff})`;
      ctx!.fill();

      // Inner point
      ctx!.beginPath();
      ctx!.arc(ef.x, ef.y, cs * 0.4, 0, Math.PI * 2);
      ctx!.fillStyle = "rgba(255,255,255,1)";
      ctx!.fill();
    }
  }

  function _old_voidEntrance(_time: number) {
    return;
  }
  // ── Whisper rendering ──
  function drawWhispers(time: number) {
    for (const w of whispers) {
      const t = easeInOutQuad(w.progress);
      const wx = w.sx + (w.tx - w.sx) * t;
      const wy = w.sy + (w.ty - w.sy) * t;

      // Alpha: fast fade-in, sustain, fade-out near end
      const alpha =
        w.progress < 0.08
          ? w.progress / 0.08
          : w.progress > 0.85
            ? (1 - w.progress) / 0.15
            : 1;
      const a = alpha * 0.85;

      const angle = Math.atan2(w.ty - w.sy, w.tx - w.sx);

      // Long sweeping trail
      const trailLen = 160;
      const tx1 = wx - Math.cos(angle) * trailLen;
      const ty1 = wy - Math.sin(angle) * trailLen;
      const trailGrad = ctx!.createLinearGradient(wx, wy, tx1, ty1);
      trailGrad.addColorStop(0, `rgba(255,255,255,${a})`);
      trailGrad.addColorStop(
        0.15,
        `rgba(${w.color.r},${w.color.g},${w.color.b},${a * 0.7})`,
      );
      trailGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.beginPath();
      ctx!.moveTo(wx, wy);
      ctx!.lineTo(tx1, ty1);
      ctx!.strokeStyle = trailGrad;
      ctx!.lineWidth = 3;
      ctx!.stroke();

      // Bright core at head
      const coreR = 30;
      const pg = ctx!.createRadialGradient(wx, wy, 0, wx, wy, coreR);
      pg.addColorStop(0, `rgba(255,255,255,${a})`);
      pg.addColorStop(
        0.2,
        `rgba(${w.color.r},${w.color.g},${w.color.b},${a * 0.6})`,
      );
      pg.addColorStop(
        0.6,
        `rgba(${w.color.r},${w.color.g},${w.color.b},${a * 0.1})`,
      );
      pg.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.beginPath();
      ctx!.arc(wx, wy, coreR, 0, Math.PI * 2);
      ctx!.fillStyle = pg;
      ctx!.fill();

      // Spark particles along trail
      for (let i = 0; i < 4; i++) {
        const sparkDist = (i + 1) * 0.2 * trailLen;
        const sx = wx - Math.cos(angle) * sparkDist;
        const sy = wy - Math.sin(angle) * sparkDist;
        const sparkR = 1.5 + Math.random();
        const sparkA = a * (0.3 + Math.random() * 0.3);
        ctx!.beginPath();
        ctx!.arc(sx, sy, sparkR, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255,255,255,${sparkA})`;
        ctx!.fill();
      }
    }
  }

  function easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  // ── Cosmic ignition — now in void-gate.ts ──
  function _old_ignition(time: number) {
    if (ignitionAge <= 0 || ignitionAge > 5) return;
    const ef = emergingFrags.find((f) => f.starId === "void-entry");
    if (!ef) return;
    const cx = ef.x,
      cy = ef.y;
    const t = ignitionAge;
    const maxDim = Math.max(canvas.width, canvas.height) / viewport.zoom;

    // Center flash
    if (t < 0.2) {
      const flashA = (1 - t / 0.2) * 0.9;
      const flashR = maxDim * 0.8;
      const fg = ctx!.createRadialGradient(cx, cy, 0, cx, cy, flashR);
      fg.addColorStop(0, `rgba(255,255,255,${flashA})`);
      fg.addColorStop(0.04, `rgba(220,210,255,${flashA * 0.5})`);
      fg.addColorStop(0.15, `rgba(140,120,220,${flashA * 0.12})`);
      fg.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = fg;
      ctx!.fillRect(cx - flashR, cy - flashR, flashR * 2, flashR * 2);
    }

    // Glow-stroke shockwave rings with shadowBlur + additive blend
    const waveSpeed = maxDim / 5;
    const RING_COUNT = 5;
    ctx!.save();
    ctx!.globalCompositeOperation = "lighter";
    for (let i = 0; i < RING_COUNT; i++) {
      const startT = 0.05 + i * 0.15;
      const ringLife = 4;
      if (t < startT || t > startT + ringLife) continue;
      const age = t - startT;
      const ringR = age * waveSpeed;
      const intensity =
        age < 0.3 ? age / 0.3 : 1 - (age - 0.3) / (ringLife - 0.3);
      const a = intensity * 0.75;

      // Outer glow — wide, diffuse
      ctx!.beginPath();
      ctx!.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx!.strokeStyle = `rgba(140,120,210,${a * 0.45})`;
      ctx!.lineWidth = 18;
      ctx!.shadowColor = `rgba(150,130,220,${a * 0.5})`;
      ctx!.shadowBlur = 45;
      ctx!.stroke();

      // Mid ring — luminous color
      ctx!.beginPath();
      ctx!.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx!.strokeStyle = `rgba(210,190,245,${a * 0.75})`;
      ctx!.lineWidth = 4;
      ctx!.shadowColor = `rgba(190,170,240,${a * 0.6})`;
      ctx!.shadowBlur = 20;
      ctx!.stroke();

      // Core wavefront — sharp white
      ctx!.beginPath();
      ctx!.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx!.strokeStyle = `rgba(255,255,255,${a})`;
      ctx!.lineWidth = 1.5;
      ctx!.shadowBlur = 0;
      ctx!.stroke();
    }
    ctx!.restore();

    // Particles
    for (const p of ignitionParticles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      const pg = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8);
      pg.addColorStop(0, `rgba(255,255,255,${alpha})`);
      pg.addColorStop(
        0.5,
        `rgba(${p.color.r},${p.color.g},${p.color.b},${alpha * 0.5})`,
      );
      pg.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx!.fillStyle = pg;
      ctx!.fill();
    }
  }

  function drawVignette() {
    const g = ctx!.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      Math.max(canvas.width, canvas.height) * 0.65,
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.4, "rgba(0,0,0,0)");
    g.addColorStop(0.75, "rgba(0,0,0,0.35)");
    g.addColorStop(1, "rgba(0,0,0,0.7)");
    ctx!.fillStyle = g;
    ctx!.fillRect(0, 0, canvas.width, canvas.height);
  }
</script>

<canvas
  bind:this={canvas}
  class="fixed inset-0 w-full h-full living-space-canvas"
/>

{#if openingPhase !== "idle"}
  <div
    class="opening-text"
    style="
      left: {openingTextScreen.x}px;
      top: {openingTextScreen.y - 60}px;
      opacity: {openingTextAlpha};
    "
  >
    {OPENING_TEXT.slice(0, openingRevealIdx)}
    {#if openingPhase === "typing"}
      <span class="cursor-blink">|</span>
    {/if}
  </div>
{/if}

{#if emergingFrags.some((ef) => ef.textAlpha > 0.01)}
  <div class="emerging-texts-layer">
    {#each emergingFrags as ef}
      {#if ef.textAlpha > 0.01}
        <div
          class="emerge-text"
          style="
            left: {ef.screenX}px;
            top: {ef.screenY - ef.size * 14 * viewport.zoom}px;
            opacity: {ef.textAlpha};
            --glow-color: rgb({ef.color.r},{ef.color.g},{ef.color.b});
          "
        >
          {ef.shortText}
        </div>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .living-space-canvas {
    z-index: 0;
    cursor: grab;
    touch-action: none;
  }
  .living-space-canvas:active {
    cursor: grabbing;
  }

  .emerging-texts-layer {
    position: fixed;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    overflow: hidden;
  }

  .opening-text {
    position: fixed;
    z-index: 2;
    transform: translate(-50%, -100%);
    font-family: "LXGW WenKai", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: calc(0.7vw + 15px);
    font-weight: 100;
    letter-spacing: 0.15em;
    text-align: center;
    color: rgba(200, 210, 255, 0.85);
    text-shadow:
      0 0 20px rgba(180, 200, 255, 0.6),
      0 0 50px rgba(160, 180, 255, 0.3);
    pointer-events: none;
  }

  .cursor-blink {
    animation: cursorBlink 0.6s step-end infinite;
    color: rgba(220, 210, 255, 0.8);
  }

  @keyframes cursorBlink {
    50% {
      opacity: 0;
    }
  }

  .emerge-text {
    position: absolute;
    transform: translate(-50%, -100%);
    font-family: "LXGW WenKai", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: calc(0.6vw + 13px);
    font-weight: 300;
    text-align: center;
    white-space: nowrap;
    letter-spacing: 0.01em;
    color: var(--glow-color);
    text-shadow:
      0 0 12px var(--glow-color),
      0 0 28px var(--glow-color);
  }
</style>
