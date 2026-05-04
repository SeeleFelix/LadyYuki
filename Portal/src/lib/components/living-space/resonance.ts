import type { EmergingFrag, Resonance } from "./types";

export const RESONANCE_DURATION = 2.0;

export function triggerResonance(
  fragmentId: string,
  emergingFrags: EmergingFrag[],
  resonances: Resonance[],
  readCount: number,
  time: number,
): number {
  const ef = emergingFrags.find((f) => f.fragmentId === fragmentId);
  if (!ef || ef.read) return readCount;

  ef.read = true;
  readCount++;

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
  return readCount;
}

export function updateResonances(
  resonances: Resonance[],
  time: number,
): Resonance[] {
  return resonances.filter((r) => time - (r.startTime + r.delay) < r.duration);
}
