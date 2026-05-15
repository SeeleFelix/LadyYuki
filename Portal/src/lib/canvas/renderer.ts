import { theme } from "./theme";
import {
  drawBgStars,
  drawNebulas,
  drawDusts,
  drawShootingStars,
  updateActiveChunks,
} from "./systems/background";
import { drawMilkyWay } from "./systems/background";
import {
  drawConnectionLines,
  drawEDots,
  drawFragmentStars,
} from "./systems/constellation";
import type { TimelinePhase } from "./timeline";
import { drawVoidGate, drawIgnition } from "./systems/void-gate";
import { drawWhispers } from "./systems/whispers";
import { drawVignette } from "./primitives/atmosphere";
import { drawClickRipple } from "./primitives/effects";
import { drawAgentStar } from "./primitives/stars";
import { drawAgentConnection } from "./primitives/connections";
import type { Star } from "$lib/types/agent";
import type { ConstellationLine } from "$lib/types/agent";
import type { SpaceViewport } from "$lib/types/space";
import type {
  EmergingFrag,
  Whisper,
  Resonance,
  ConnData,
  EDot,
  ShootingStar,
  Nebula,
  Chunk,
  IgnitionParticle,
} from "./types";

export type RendererMode = "explore" | "ambient";
export type SystemName =
  | "background"
  | "constellation"
  | "voidGate"
  | "whispers"
  | "meteors";

export interface RendererConfig {
  mode: RendererMode;
  systems?: SystemName[];
}

const ALL_SYSTEMS: SystemName[] = [
  "background",
  "constellation",
  "voidGate",
  "whispers",
  "meteors",
];

export interface FrameState {
  time: number;
  phase: TimelinePhase;
  fieldBrightness: number;
  ignitionAge: number;
  awakenProgress: number;
  revelationPulse: number;
  readCount: number;
  mouseSpaceX: number;
  mouseSpaceY: number;
  viewport: SpaceViewport;
  emergingFrags: EmergingFrag[];
  connData: ConnData[];
  eDots: EDot[];
  resonances: Resonance[];
  whispers: Whisper[];
  nebulas: Nebula[];
  shootingStars: ShootingStar[];
  ignitionParticles: IgnitionParticle[];
  activeChunks: string[];
  chunkCache: Map<string, Chunk>;
}

export interface AmbientFrameState {
  time: number;
  fieldBrightness: number;
  stars: Star[];
  lines: ConstellationLine[];
  selectedStarId: string | null;
  viewport: { x: number; y: number; zoom: number };
}

export class CanvasRenderer {
  readonly mode: RendererMode;
  readonly systems: Set<SystemName>;
  readonly ctx: CanvasRenderingContext2D | null;
  private canvas: HTMLCanvasElement;

  // Ambient mode self-managed background
  private ambientChunks = new Map<string, Chunk>();
  private ambientActiveChunks: string[] = [];
  private ambientNebulas: Nebula[] = [];
  private ambientInitialized = false;

  constructor(canvas: HTMLCanvasElement, config: RendererConfig) {
    this.canvas = canvas;
    this.mode = config.mode;
    this.systems = new Set(config.systems ?? ALL_SYSTEMS);
    this.ctx = canvas.getContext("2d");
  }

  private initAmbient() {
    const colors = theme.background.nebulaColors;
    for (let i = 0; i < 6; i++) {
      this.ambientNebulas.push({
        bx: Math.random() * 1920,
        by: Math.random() * 1080,
        radius: 250 + Math.random() * 400,
        opacity: 0.015 + Math.random() * 0.03,
        color: colors[i % colors.length],
        speed: 0.008 + Math.random() * 0.015,
        phase: Math.random() * Math.PI * 2,
        seed: Math.random() * 1000,
      });
    }
    const initVp: SpaceViewport = {
      x: 0,
      y: 0,
      zoom: 1,
      targetX: 0,
      targetY: 0,
      targetZoom: 1,
    };
    this.ambientActiveChunks = updateActiveChunks(
      this.canvas,
      initVp,
      theme.background.chunkSize,
      this.ambientChunks,
      [],
    );
    this.ambientInitialized = true;
  }

  render(state: FrameState, ripple?: { x: number; y: number; age: number }) {
    const ctx = this.ctx;
    if (!ctx) return;
    const { width, height } = this.canvas;

    // Clear
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = theme.canvas.bg;
    ctx.fillRect(0, 0, width, height);

    // World transform
    ctx.save();
    const cx = width / 2;
    const cy = height / 2;
    ctx.translate(cx, cy);
    ctx.scale(state.viewport.zoom, state.viewport.zoom);
    ctx.translate(-state.viewport.x, -state.viewport.y);

    // L3 Atmosphere
    if (this.systems.has("background")) {
      drawNebulas(
        ctx,
        state.time,
        state.fieldBrightness,
        state.nebulas,
        state.viewport,
        this.canvas,
      );
      drawMilkyWay(ctx, state.fieldBrightness, state.viewport, this.canvas);
      drawDusts(
        ctx,
        state.time,
        state.activeChunks,
        state.chunkCache,
        theme.background.chunkSize,
      );
      drawBgStars(
        ctx,
        state.time,
        state.fieldBrightness,
        state.ignitionAge,
        state.awakenProgress,
        state.revelationPulse,
        state.emergingFrags,
        state.activeChunks,
        state.chunkCache,
        state.viewport,
        this.canvas,
      );

      if (this.systems.has("meteors")) {
        drawShootingStars(ctx, state.shootingStars);
      }
    }

    // L1 Narrative — connection lines + energy dots
    if (this.systems.has("constellation")) {
      drawConnectionLines(ctx, state.connData, state.time, state.phase);
      drawEDots(ctx, state.eDots, state.connData, state.time);
    }

    // L2 Waiting → L1 Narrative — fragment stars
    if (this.systems.has("constellation")) {
      drawFragmentStars(
        ctx,
        state.emergingFrags,
        state.resonances,
        state.time,
        state.phase,
      );
    }

    // L0 Focus — Void Gate + Ignition
    if (this.systems.has("voidGate")) {
      drawIgnition(
        ctx,
        state.emergingFrags,
        state.ignitionAge,
        state.ignitionParticles,
        state.viewport,
        this.canvas,
      );
      drawVoidGate(
        ctx,
        state.emergingFrags,
        state.ignitionAge,
        state.time,
        state.mouseSpaceX,
        state.mouseSpaceY,
        state.viewport,
        this.canvas,
        state.readCount,
      );
    }

    // Whispers
    if (this.systems.has("whispers")) {
      drawWhispers(ctx, state.whispers, state.time);
    }

    // Click ripple
    if (ripple && ripple.age < theme.interaction.clickRipple.duration) {
      drawClickRipple(
        ctx,
        ripple.x,
        ripple.y,
        ripple.age,
        theme.interaction.clickRipple.duration,
      );
    }

    ctx.restore();

    // Post — vignette (screen space)
    drawVignette(ctx, width, height);
  }

  renderAmbient(state: AmbientFrameState) {
    const ctx = this.ctx;
    if (!ctx) return;
    if (!this.ambientInitialized) this.initAmbient();

    const { width, height } = this.canvas;

    // Clear
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = theme.canvas.bg;
    ctx.fillRect(0, 0, width, height);

    // Chunk update
    const vp: SpaceViewport = {
      x: state.viewport.x,
      y: state.viewport.y,
      zoom: state.viewport.zoom,
      targetX: state.viewport.x,
      targetY: state.viewport.y,
      targetZoom: state.viewport.zoom,
    };
    this.ambientActiveChunks = updateActiveChunks(
      this.canvas,
      vp,
      theme.background.chunkSize,
      this.ambientChunks,
      this.ambientActiveChunks,
    );

    // World transform
    ctx.save();
    const cx = width / 2,
      cy = height / 2;
    ctx.translate(cx, cy);
    ctx.scale(state.viewport.zoom, state.viewport.zoom);
    ctx.translate(-state.viewport.x, -state.viewport.y);

    // Background
    if (this.systems.has("background")) {
      drawNebulas(
        ctx,
        state.time,
        state.fieldBrightness,
        this.ambientNebulas,
        vp,
        this.canvas,
      );
      drawDusts(
        ctx,
        state.time,
        this.ambientActiveChunks,
        this.ambientChunks,
        theme.background.chunkSize,
      );
      drawBgStars(
        ctx,
        state.time,
        state.fieldBrightness,
        5,
        1,
        0,
        [],
        this.ambientActiveChunks,
        this.ambientChunks,
        vp,
        this.canvas,
      );
    }

    // Agent connections
    if (this.systems.has("constellation")) {
      for (const line of state.lines) {
        const s1 = state.stars.find((s) => s.id === line.star1Id);
        const s2 = state.stars.find((s) => s.id === line.star2Id);
        if (!s1 || !s2) continue;
        drawAgentConnection(ctx, s1, s2, line.opacity, state.time);
      }

      // Agent stars
      for (const star of state.stars) {
        drawAgentStar(
          ctx,
          star,
          state.time,
          star.id === state.selectedStarId,
          false,
        );
      }
    }

    ctx.restore();

    // Vignette
    drawVignette(ctx, width, height);
  }
}
