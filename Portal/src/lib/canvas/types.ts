import type { Fragment } from "$lib/types/agent";

// ── Emergence ──
export type EmergePhase =
  | "hidden"
  | "emerging"
  | "lingering"
  | "crystallizing"
  | "star";

export interface EmergingFrag {
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
  zDepth: number;
}

// ── Whispers ──
export interface Whisper {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  text: string;
  progress: number;
  color: { r: number; g: number; b: number };
  life: number;
}

// ── Resonance ──
export interface Resonance {
  starId: string;
  color: { r: number; g: number; b: number };
  startTime: number;
  delay: number;
  duration: number;
}

// ── Ignition ──
export interface IgnitionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: { r: number; g: number; b: number };
}

// ── Cinematography ──
export type AutoPanPhase = "none" | "panToVoid" | "followWhisper" | "settle";

export interface PendingWhisper {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  text: string;
  color: { r: number; g: number; b: number };
}

// ── Background ──
export type StarType = "dust" | "field" | "beacon";

export interface BgStar {
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

export interface Dust {
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

export interface Chunk {
  stars: BgStar[];
  dusts: Dust[];
}

export interface Nebula {
  bx: number;
  by: number;
  radius: number;
  opacity: number;
  color: { r: number; g: number; b: number };
  speed: number;
  phase: number;
  seed: number;
}

export type MeteorType = "swift" | "fireball" | "longtrail";

export interface ShootingStar {
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

// ── Connection / Energy dots ──
export interface ConnData {
  s1: EmergingFrag;
  s2: EmergingFrag;
  c1: { r: number; g: number; b: number };
  c2: { r: number; g: number; b: number };
  isInterGroup: boolean;
}

export interface EDot {
  connIdx: number;
  progress: number;
  speed: number;
  size: number;
  alpha: number;
  color: { r: number; g: number; b: number };
}
