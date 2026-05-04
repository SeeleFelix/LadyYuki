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
    generateChunk,
    chunkKey,
    chunkSeed,
    getOrCreateChunk,
    milkyWayStrength,
    noise,
    starColor,
    createNebulas as createNebulasFn,
    spawnShootingStar,
    updateShootingStars,
    drawShootingStars,
    drawDusts,
    updateActiveChunks,
  } from "./living-space/background";
  import {
    generateEmergingFrags,
    buildConnData,
    createEDots,
    updateEmergence,
    drawConnectionLines,
    drawEDots,
    drawFragmentStars,
  } from "./living-space/constellation";
  import { drawWhispers } from "./living-space/whispers";
  import { triggerResonance, updateResonances } from "./living-space/resonance";
  import type {
    EmergingFrag,
    Whisper,
    ConnData,
    EDot,
  } from "./living-space/types";

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

  // Milky Way: diagonal band from bottom-left to top-right in world space

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
    const fragResult = generateEmergingFrags(locale as Locale);
    emergingFrags = fragResult.emergingFrags;
    emergeQueue = fragResult.emergeQueue;
    viewport.x = viewport.targetX = driftTarget.x = fragResult.voidX;
    viewport.y = viewport.targetY = driftTarget.y = fragResult.voidY;
    connData = buildConnData(emergingFrags, connections);
    eDots = createEDots(connData);

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

  // ── Build connection data for rendering ──
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
    const prevCount = readCount;
    readCount = triggerResonance(
      fragmentId,
      emergingFrags,
      resonances,
      readCount,
      performance.now() / 1000,
    );
    if (readCount > prevCount && readCount >= 16) revelationPulse = 1;
  }

  // ── Star emergence (whisper-driven, with initial boot) ──
  let firstWhisperTime = $state(Infinity);
  let openingTextAlpha = $state(0);
  let openingTextScreen = $state({ x: 0, y: 0 });
  let openingRevealIdx = $state(0); // streaming text char index
  let openingRevealTimer = $state(0); // accumulator for char reveal
  const OPENING_TEXT = "她在诉说。";
  let openingPhase = $state<"idle" | "typing" | "hold" | "fading">("idle");

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
      updateEmergence(time, emergingFrags, emergeQueue);

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
    resonances = updateResonances(resonances, time);

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
      activeChunks = updateActiveChunks(
        canvas,
        viewport,
        CHUNK_SIZE,
        chunkCache,
        activeChunks,
      );
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
      spawnShootingStar(shootingStars, viewport, canvas);
      nextShootingStarTime = time + 12 + Math.random() * 18;
    }
    updateShootingStars(shootingStars);

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
    drawDusts(ctx, time, activeChunks, chunkCache, CHUNK_SIZE);
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
    drawShootingStars(ctx, shootingStars);
    drawConnectionLines(ctx, connData, emergingFrags, time);
    drawEDots(ctx, eDots, connData, emergingFrags, time);
    drawFragmentStars(ctx, emergingFrags, resonances, time);
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
    drawWhispers(ctx, whispers, time);

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

  function easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
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
