import { describe, it, expect } from "vitest";
import {
  createTimeline,
  updateTimeline,
  setPhase,
  getEnergyDotSpeedMul,
  getConnectionPulseMul,
  getStarBreathMul,
  getEnergyDotDirection,
  getBeatPulse,
  type TimelinePhase,
} from "../timeline";

function makeState(
  overrides?: Partial<{
    phase: TimelinePhase;
    time: number;
    readCount: number;
  }>,
) {
  const s = createTimeline();
  if (overrides?.phase) s.phase = overrides.phase;
  if (overrides?.time !== undefined) s.time = overrides.time;
  if (overrides?.readCount !== undefined) s.readCount = overrides.readCount;
  return s;
}

describe("createTimeline", () => {
  it("starts in intro phase", () => {
    const state = createTimeline();
    expect(state.phase).toBe("intro");
  });

  it("starts with zero beat and readCount", () => {
    const state = createTimeline();
    expect(state.masterBeat).toBe(0);
    expect(state.readCount).toBe(0);
  });
});

describe("updateTimeline", () => {
  it("updates master beat from time", () => {
    const state = createTimeline();
    updateTimeline(state, 10, 0);
    expect(state.masterBeat).toBe(2); // 10s / 5s per beat = beat 2
  });

  it("transitions to revelation when all 16 fragments read", () => {
    const state = makeState({ phase: "explore", readCount: 15 });
    updateTimeline(state, 20, 16);
    expect(state.phase).toBe("revelation");
  });

  it("stays in current phase when readCount < 16", () => {
    const state = makeState({ phase: "explore", readCount: 5 });
    updateTimeline(state, 20, 10);
    expect(state.phase).toBe("explore");
  });
});

describe("setPhase", () => {
  it("sets phase to desired value", () => {
    const state = makeState({ phase: "intro" });
    setPhase(state, "explore");
    expect(state.phase).toBe("explore");
  });
});

describe("getEnergyDotSpeedMul", () => {
  it("returns < 1 for intro phase", () => {
    expect(getEnergyDotSpeedMul("intro")).toBeLessThan(1);
  });

  it("returns 1 for explore phase", () => {
    expect(getEnergyDotSpeedMul("explore")).toBe(1);
  });

  it("returns > 1 for revelation phase", () => {
    expect(getEnergyDotSpeedMul("revelation")).toBeGreaterThan(1);
  });

  it("increases monotonically through phases", () => {
    const phases: TimelinePhase[] = [
      "intro",
      "settle",
      "explore",
      "revelation",
    ];
    const speeds = phases.map(getEnergyDotSpeedMul);
    for (let i = 1; i < speeds.length; i++) {
      expect(speeds[i]).toBeGreaterThan(speeds[i - 1]);
    }
  });
});

describe("getEnergyDotDirection", () => {
  it("all flow outward in intro phase", () => {
    for (let i = 0; i < 10; i++) {
      expect(getEnergyDotDirection("intro", i)).toBe(1);
    }
  });

  it("alternates direction in explore phase", () => {
    expect(getEnergyDotDirection("explore", 0)).toBe(1);
    expect(getEnergyDotDirection("explore", 1)).toBe(-1);
    expect(getEnergyDotDirection("explore", 2)).toBe(1);
    expect(getEnergyDotDirection("explore", 3)).toBe(-1);
  });
});

describe("getBeatPulse", () => {
  it("returns 0 at start of beat", () => {
    const state = makeState({ time: 0 });
    expect(getBeatPulse(state)).toBeCloseTo(0, 5);
  });

  it("returns 1 at mid-beat (2.5s)", () => {
    const state = makeState({ time: 2.5 });
    expect(getBeatPulse(state)).toBeCloseTo(1, 5);
  });

  it("returns 0 at end of beat (5s)", () => {
    const state = makeState({ time: 5 });
    expect(getBeatPulse(state)).toBeCloseTo(0, 5);
  });

  it("applies offset correctly", () => {
    const state = makeState({ time: 0 });
    expect(getBeatPulse(state, 0.5)).toBeCloseTo(1, 5);
  });
});

describe("getConnectionPulseMul", () => {
  it("increases across phases", () => {
    const phases: TimelinePhase[] = [
      "intro",
      "settle",
      "explore",
      "revelation",
    ];
    const values = phases.map(getConnectionPulseMul);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});

describe("getStarBreathMul", () => {
  it("increases across phases", () => {
    const phases: TimelinePhase[] = [
      "intro",
      "settle",
      "explore",
      "revelation",
    ];
    const values = phases.map(getStarBreathMul);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});
