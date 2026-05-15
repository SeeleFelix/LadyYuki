// ══════════════════════════════════════
//  AnimationTimeline — master clock + narrative phase management
// ══════════════════════════════════════

export type TimelinePhase = "intro" | "settle" | "explore" | "revelation";

export interface TimelineState {
  phase: TimelinePhase;
  masterBeat: number;
  time: number;
  readCount: number;
}

const MASTER_BPM = 12;
const BEAT_DURATION = 60 / MASTER_BPM; // 5s per beat

export function createTimeline(): TimelineState {
  return { phase: "intro", masterBeat: 0, time: 0, readCount: 0 };
}

export function updateTimeline(
  state: TimelineState,
  time: number,
  readCount: number,
): void {
  state.time = time;
  state.masterBeat = Math.floor(time / BEAT_DURATION);

  const prevReadCount = state.readCount;
  state.readCount = readCount;

  // Phase transitions
  if (state.phase === "intro") {
    // intro → settle: after ignition completes and first whisper launches
    // (this is triggered externally by the cinematic camera logic)
  }

  if (state.phase === "settle" || state.phase === "intro") {
    // → explore: when user starts interacting or after initial cinematic
    // (triggered externally)
  }

  if (readCount >= 16 && prevReadCount < 16) {
    state.phase = "revelation";
  }
}

export function setPhase(state: TimelineState, phase: TimelinePhase): void {
  state.phase = phase;
}

// ── Phase-aware animation parameters ──

export function getEnergyDotSpeedMul(phase: TimelinePhase): number {
  switch (phase) {
    case "intro":
      return 0.4;
    case "settle":
      return 0.7;
    case "explore":
      return 1.0;
    case "revelation":
      return 1.5;
  }
}

export function getConnectionPulseMul(phase: TimelinePhase): number {
  switch (phase) {
    case "intro":
      return 0.5;
    case "settle":
      return 0.8;
    case "explore":
      return 1.0;
    case "revelation":
      return 1.3;
  }
}

export function getStarBreathMul(phase: TimelinePhase): number {
  switch (phase) {
    case "intro":
      return 0.5;
    case "settle":
      return 0.8;
    case "explore":
      return 1.0;
    case "revelation":
      return 1.2;
  }
}

// For bidirectional dots: in intro phase, all flow outward
export function getEnergyDotDirection(
  phase: TimelinePhase,
  index: number,
): 1 | -1 {
  if (phase === "intro") return 1; // all flow outward from void-entry
  // explore / revelation: bidirectional
  return index % 2 === 0 ? 1 : -1;
}

// Beat-aligned pulse value (0..1) for elements that should sync to master beat
export function getBeatPulse(state: TimelineState, offset: number = 0): number {
  const beatProgress = (state.time / BEAT_DURATION + offset) % 1;
  return Math.sin(beatProgress * Math.PI);
}
