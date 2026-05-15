import { describe, it, expect } from "vitest";
import { theme, easeInOutQuad, pseudoNoise, chunkSeed } from "../theme";

describe("theme.starColorTemp", () => {
  it("returns pure blue at temp 0", () => {
    const c = theme.starColorTemp(0);
    expect(c).toEqual({ r: 180, g: 200, b: 255 });
  });

  it("returns pure white at temp 0.5", () => {
    const c = theme.starColorTemp(0.5);
    expect(c).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("returns warm gold at temp 1.0", () => {
    const c = theme.starColorTemp(1.0);
    expect(c).toEqual({ r: 255, g: 200, b: 100 });
  });

  it("interpolates between blue and white for temp < 0.5", () => {
    const c = theme.starColorTemp(0.25);
    expect(c.g).toBeGreaterThan(c.r);
    expect(c.b).toBe(255);
  });

  it("interpolates between white and gold for temp > 0.5", () => {
    const c = theme.starColorTemp(0.75);
    expect(c.r).toBe(255);
    expect(c.g).toBeLessThan(255);
  });
});

describe("easeInOutQuad", () => {
  it("returns 0 at t=0", () => {
    expect(easeInOutQuad(0)).toBe(0);
  });

  it("returns 1 at t=1", () => {
    expect(easeInOutQuad(1)).toBe(1);
  });

  it("returns 0.5 at t=0.5", () => {
    expect(easeInOutQuad(0.5)).toBe(0.5);
  });

  it("is below linear in first half", () => {
    expect(easeInOutQuad(0.25)).toBeLessThan(0.25);
  });

  it("is above linear in second half", () => {
    expect(easeInOutQuad(0.75)).toBeGreaterThan(0.75);
  });

  it("is monotonic", () => {
    const steps = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    for (let i = 1; i < steps.length; i++) {
      expect(easeInOutQuad(steps[i])).toBeGreaterThan(
        easeInOutQuad(steps[i - 1]),
      );
    }
  });
});

describe("pseudoNoise", () => {
  it("returns values between 0 and 1", () => {
    for (let i = 0; i < 100; i++) {
      const n = pseudoNoise(i, i * 2, 42);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it("is deterministic", () => {
    const a = pseudoNoise(10, 20, 30);
    const b = pseudoNoise(10, 20, 30);
    expect(a).toBe(b);
  });

  it("produces different values for different seeds", () => {
    const values = new Set<number>();
    for (let s = 0; s < 50; s++) {
      values.add(pseudoNoise(1, 1, s));
    }
    expect(values.size).toBeGreaterThan(30);
  });
});

describe("chunkSeed", () => {
  it("returns consistent seeds for same input", () => {
    expect(chunkSeed(0, 0)).toBe(chunkSeed(0, 0));
    expect(chunkSeed(-1, 5)).toBe(chunkSeed(-1, 5));
  });

  it("never returns 0", () => {
    for (let cx = -5; cx <= 5; cx++) {
      for (let cy = -5; cy <= 5; cy++) {
        expect(chunkSeed(cx, cy)).not.toBe(0);
      }
    }
  });

  it("returns different seeds for different chunks", () => {
    const seeds = new Set<number>();
    for (let cx = -3; cx <= 3; cx++) {
      for (let cy = -3; cy <= 3; cy++) {
        seeds.add(chunkSeed(cx, cy));
      }
    }
    expect(seeds.size).toBe(49);
  });
});

describe("theme canvas config", () => {
  it("has a single unified background color", () => {
    expect(theme.canvas.bg).toBe("#05050d");
  });

  it("has chunk configuration", () => {
    expect(theme.background.chunkSize).toBe(1200);
    expect(theme.background.starCount).toBe(800);
  });

  it("has group colors available", () => {
    expect(theme.groups.origin).toEqual({ r: 255, g: 180, b: 100 });
    expect(theme.groups.void).toBeDefined();
  });

  it("has constellation animation params", () => {
    expect(theme.constellation.energyDots.bidirectional).toBe(true);
    expect(theme.constellation.connection.pulseAmp).toBe(0.15);
  });
});
