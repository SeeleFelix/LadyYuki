<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import { areas, connections } from "$lib/data/constellation";
  import { getFragmentById } from "$lib/data/fragments";
  import { theme } from "$lib/canvas/theme";
  import {
    createTimeline,
    updateTimeline,
    type TimelinePhase,
    type TimelineState,
  } from "$lib/canvas/timeline";
  import type { SpaceStar } from "$lib/types/space";
  import type { Fragment } from "$lib/types/agent";
  import type { Locale } from "$lib/i18n/detector";

  import {
    createIgnitionSystem,
    updateIgnition,
    spawnIgnitionBurst,
    type IgnitionSystem,
  } from "$lib/canvas/systems/void-gate";
  import {
    spawnShootingStar,
    updateShootingStars,
    updateActiveChunks,
    CHUNK_SIZE,
  } from "$lib/canvas/systems/background";
  import {
    generateEmergingFrags,
    buildConnData,
    createEDots,
    updateEmergence,
  } from "$lib/canvas/systems/constellation";
  import {
    updateWhispers,
    WHISPER_DURATION,
  } from "$lib/canvas/systems/whispers";
  import {
    triggerResonance,
    updateResonances,
  } from "$lib/canvas/systems/resonance";
  import { CanvasRenderer, type FrameState } from "$lib/canvas/renderer";
  import {
    createCamera,
    updateCamera,
    onWhisperLaunched,
    beginPanToVoid,
    spaceToScreen,
    isAutoPanning,
    type CameraState,
  } from "$lib/canvas/systems/camera";
  import { createInput, type InputState } from "$lib/canvas/systems/input";
  import type {
    EmergingFrag,
    Whisper,
    Resonance,
    ConnData,
    EDot,
    PendingWhisper,
    Nebula,
    ShootingStar,
    Chunk,
  } from "$lib/canvas/types";

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

  // ── Canvas ──
  let canvas!: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrameId: number;

  // ── Reactive state (needed by template) ──
  let emergingFrags: EmergingFrag[] = $state([]);
  let emergeQueue: EmergingFrag[] = [];
  let readCount = $state(0);
  let revelationPulse = $state(0);
  let resonances: Resonance[] = $state([]);

  let rippleX = $state(0);
  let rippleY = $state(0);
  let rippleAge = $state(Infinity);
  const RIPPLE_DURATION = 0.45;

  let whispers: Whisper[] = $state([]);

  const OPENING_TEXT = theme.opening.text;
  let openingPhase = $state<"idle" | "typing" | "hold" | "fading">("idle");
  let openingTextAlpha = $state(0);
  let openingTextScreen = $state({ x: 0, y: 0 });
  let openingRevealIdx = $state(0);
  let openingRevealTimer = $state(0);
  let firstWhisperTime = $state(Infinity);
  let nextWhisperTime = $state(Infinity);

  const WHISPER_INTERVAL = 10;

  // ── Renderer ──
  let renderer: CanvasRenderer;

  // ── Non-reactive state ──
  let bootTime = 0;
  let ignitionAge = 0;
  let prevFrameTime = 0;

  let cam: CameraState = $state(createCamera(0, 0));
  let inputState!: InputState;
  let inputDestroy!: () => void;
  let ignitionSys!: IgnitionSystem;

  let chunkCache = new Map<string, Chunk>();
  let activeChunks: string[] = [];
  let lastChunkUpdateX = Infinity;
  let lastChunkUpdateY = Infinity;
  let shootingStars: ShootingStar[] = [];
  let nextShootingStarTime = Infinity;
  let nebulas: Nebula[] = [];

  let eDots: EDot[] = [];
  let connData: ConnData[] = [];
  let timeline: TimelineState = createTimeline();

  let pendingWhisper: PendingWhisper | null = null;

  // ── Locale reactivity ──
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

  // ── Lifecycle ──
  onMount(() => {
    ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderer = new CanvasRenderer(canvas, { mode: "explore" });

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const inputResult = createInput(
      canvas,
      () => cam,
      () => isAutoPanning(cam),
      {
        onClick: (wx, wy, sx, sy) => handleClick(wx, wy, sx, sy),
      },
    );
    inputState = inputResult.state;
    inputDestroy = inputResult.destroy;

    createNebulas();
    const fragResult = generateEmergingFrags(locale as Locale);
    emergingFrags = fragResult.emergingFrags;
    emergeQueue = fragResult.emergeQueue;
    cam = createCamera(fragResult.voidX, fragResult.voidY);
    connData = buildConnData(emergingFrags, connections);
    eDots = createEDots(connData, timeline.phase);
    ignitionSys = createIgnitionSystem();

    bootTime = performance.now() / 1000;
    setTimeout(() => {
      openingPhase = "typing";
      openingRevealIdx = 1;
      openingRevealTimer = 0;
    }, theme.opening.initialDelay * 1000);
    firstWhisperTime =
      bootTime +
      theme.opening.awakenStartDelay +
      theme.opening.awakenDuration +
      0.5;

    animate();
  });

  onDestroy(() => {
    if (!browser) return;
    window.removeEventListener("resize", resizeCanvas);
    inputDestroy();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  });

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // ── Nebula creation ──
  function createNebulas() {
    nebulas = [];
    const colors = theme.background.nebulaColors;
    for (let i = 0; i < theme.background.nebulaCount; i++) {
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

  // ── Click handling ──
  function handleClick(wx: number, wy: number, sx: number, sy: number) {
    for (const ef of emergingFrags) {
      if (ef.phase !== "star") continue;
      const hitR = Math.max(ef.size * 10, 30);
      if (Math.hypot(wx - ef.x, wy - ef.y) <= hitR) {
        if (ef.starId === "void-entry") {
          onentervoid?.();
          return;
        }
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

  // ── External API ──
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

  // ── Opening text animation ──
  function updateOpeningText() {
    if (openingPhase === "typing") {
      openingRevealTimer += 1 / 60;
      if (
        openingRevealTimer >= theme.opening.charDelay &&
        openingRevealIdx < OPENING_TEXT.length
      ) {
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
      if (openingRevealTimer >= theme.opening.holdDuration) {
        openingPhase = "fading";
        openingRevealTimer = 0;
      }
    } else if (openingPhase === "fading") {
      openingRevealTimer += 1 / 60;
      openingTextAlpha = Math.max(
        0,
        1 - openingRevealTimer / theme.opening.fadeDuration,
      );
      if (openingTextAlpha <= 0) openingPhase = "idle";
    }
  }

  // ── Main animation loop ──
  function animate(now: number = 0) {
    if (!ctx) return;
    const time = now ? now / 1000 : performance.now() / 1000;
    const dt = prevFrameTime > 0 ? time - prevFrameTime : 1 / 60;
    prevFrameTime = time;

    // Opening text animation — runs before camera so camera can override
    updateOpeningText();

    // Track void screen position — basic tracking, camera may override
    const voidEf = emergingFrags.find((f) => f.starId === "void-entry");
    if (voidEf) {
      openingTextScreen = spaceToScreen(cam, canvas, voidEf.x, voidEf.y);
    }

    // Camera — handles auto-pan, cinematic zoom, drift (runs after text, can override)
    const camActions = updateCamera(
      cam,
      time,
      bootTime,
      ignitionAge,
      pendingWhisper,
      whispers,
      canvas,
    );

    // Apply camera actions
    if (camActions.openingTextAlpha !== null)
      openingTextAlpha = camActions.openingTextAlpha;
    if (camActions.openingTextScreen !== null)
      openingTextScreen = camActions.openingTextScreen;
    if (camActions.triggerIgnition) {
      ignitionAge = 0.001;
      if (voidEf) spawnIgnitionBurst(ignitionSys, voidEf.x, voidEf.y);
    }
    if (camActions.launchWhisper) {
      if (pendingWhisper) {
        whispers.push({
          ...pendingWhisper,
          progress: 0,
          life: WHISPER_DURATION,
        });
        onWhisperLaunched(cam, whispers.length - 1);
        pendingWhisper = null;
        openingTextAlpha = 0;
        ignitionAge = 6;
        nextWhisperTime = time + WHISPER_INTERVAL;
      }
    }

    // Ignition age increment during first-opening settle
    if (
      cam.autoPanPhase === "settle" &&
      cam.isFirstOpening &&
      ignitionAge > 0 &&
      ignitionAge < 5
    ) {
      ignitionAge += dt;
    }

    // Time-driven systems
    if (!paused) {
      updateEmergence(time, emergingFrags, emergeQueue);

      const shouldSpawnFirst =
        firstWhisperTime < Infinity &&
        time >= firstWhisperTime &&
        emergeQueue.length === 16;
      const shouldSpawnNext =
        time >= nextWhisperTime &&
        emergeQueue.length > 0 &&
        !cam.isFirstOpening;

      if ((shouldSpawnFirst || shouldSpawnNext) && voidEf) {
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
          beginPanToVoid(cam, shouldSpawnFirst);
          if (shouldSpawnFirst) {
            firstWhisperTime = Infinity;
            openingTextScreen = spaceToScreen(cam, canvas, voidEf.x, voidEf.y);
          }
        }
      }

      const wResult = updateWhispers(
        whispers,
        emergingFrags,
        emergeQueue,
        time,
      );
      whispers = wResult.whispers;
      emergeQueue = wResult.emergeQueue;
    }

    // Resonance
    resonances = updateResonances(resonances, time);

    // Proximity + text alpha
    for (const ef of emergingFrags) {
      const sp = spaceToScreen(cam, canvas, ef.x, ef.y);
      ef.screenX = sp.x;
      ef.screenY = sp.y;
      const screenDist = Math.hypot(
        inputState.mouseScreenX - sp.x,
        inputState.mouseScreenY - sp.y,
      );
      ef.proximity = Math.max(0, 1 - (screenDist - 40) / 180);

      if (
        ef.phase === "emerging" ||
        ef.phase === "lingering" ||
        ef.phase === "crystallizing"
      ) {
        const elapsed = time - ef.phaseStart;
        let alpha = 0;
        if (ef.phase === "emerging") {
          alpha = Math.min(1, elapsed / 1.2);
          alpha = 1 - Math.pow(1 - alpha, 2);
        } else if (ef.phase === "lingering") {
          alpha = 1;
        } else if (ef.phase === "crystallizing") {
          const t = Math.min(1, elapsed / 1.0);
          alpha = t < 0.45 ? 1 : 1 - Math.pow((t - 0.45) / 0.55, 2);
        }
        ef.textAlpha = alpha;
      } else {
        ef.textAlpha = 0;
      }
    }

    // Drift
    if (!inputState.isDragging) {
      const driftForce = 0.003;
      cam.viewport.targetX +=
        (cam.driftTarget.x - cam.viewport.targetX) * driftForce;
      cam.viewport.targetY +=
        (cam.driftTarget.y - cam.viewport.targetY) * driftForce;
    }

    // Chunk update
    if (
      Math.abs(cam.viewport.x - lastChunkUpdateX) > 300 ||
      Math.abs(cam.viewport.y - lastChunkUpdateY) > 300
    ) {
      activeChunks = updateActiveChunks(
        canvas,
        cam.viewport,
        CHUNK_SIZE,
        chunkCache,
        activeChunks,
      );
      lastChunkUpdateX = cam.viewport.x;
      lastChunkUpdateY = cam.viewport.y;
    }

    // Ignition update
    updateIgnition(ignitionSys, 1 / 60);

    // Shooting stars
    if (nextShootingStarTime === Infinity && ignitionAge >= 0.3)
      nextShootingStarTime = time + 3;
    if (time > nextShootingStarTime && ignitionAge >= 0.3) {
      spawnShootingStar(shootingStars, cam.viewport, canvas);
      nextShootingStarTime = time + 12 + Math.random() * 18;
    }
    updateShootingStars(shootingStars);

    // Revelation pulse + field brightness
    if (revelationPulse > 0)
      revelationPulse = Math.max(0, revelationPulse - 1 / 180);
    const fieldBrightness =
      ignitionAge <= 0
        ? 0.45
        : ignitionAge < 5
          ? 0.45 + (ignitionAge / 5) * 0.55
          : 1.0 + Math.min(readCount / 16, 1) * 0.1 + revelationPulse * 0.5;

    const rawAwaken = Math.max(
      0,
      Math.min(
        1,
        (time - bootTime - theme.opening.awakenStartDelay) /
          theme.opening.awakenDuration,
      ),
    );
    const awakenProgress = 1 - (1 - rawAwaken) * (1 - rawAwaken);

    // Ripple update
    if (rippleAge < RIPPLE_DURATION) rippleAge += 1 / 60;

    // Unified render
    updateTimeline(timeline, time, readCount);
    const shakeX = Math.sin(time * 55) * ignitionSys.shake;
    const shakeY = Math.cos(time * 48) * ignitionSys.shake;
    const shakenViewport = {
      ...cam.viewport,
      x: cam.viewport.x + shakeX,
      y: cam.viewport.y + shakeY,
    };

    renderer.render(
      {
        time,
        phase: timeline.phase,
        fieldBrightness,
        ignitionAge,
        awakenProgress,
        revelationPulse,
        readCount,
        mouseSpaceX: inputState.mouseSpaceX,
        mouseSpaceY: inputState.mouseSpaceY,
        viewport: shakenViewport,
        emergingFrags,
        connData,
        eDots,
        resonances,
        whispers,
        nebulas,
        shootingStars,
        ignitionParticles: ignitionSys.particles,
        activeChunks,
        chunkCache,
      },
      { x: rippleX, y: rippleY, age: rippleAge },
    );

    animationFrameId = requestAnimationFrame(animate);
  }
</script>

<canvas
  bind:this={canvas}
  class="fixed inset-0 w-full h-full living-space-canvas"
></canvas>

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
            top: {ef.screenY - ef.size * 14 * cam.viewport.zoom}px;
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
