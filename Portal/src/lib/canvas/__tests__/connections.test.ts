import { describe, it, expect, beforeEach } from "vitest";

// ── Minimal mock ──
interface MockCall {
  method: string;
  args: unknown[];
}

class MockCtx {
  calls: MockCall[] = [];
  _strokeStyle: string = "";
  _lineWidth: number = 1;
  _fillStyle: string = "";

  save() {
    this.calls.push({ method: "save", args: [] });
  }
  restore() {
    this.calls.push({ method: "restore", args: [] });
  }
  beginPath() {
    this.calls.push({ method: "beginPath", args: [] });
  }
  moveTo(x: number, y: number) {
    this.calls.push({ method: "moveTo", args: [x, y] });
  }
  lineTo(x: number, y: number) {
    this.calls.push({ method: "lineTo", args: [x, y] });
  }
  arc(x: number, y: number, r: number, s: number, e: number) {
    this.calls.push({ method: "arc", args: [x, y, r, s, e] });
  }
  stroke() {
    this.calls.push({ method: "stroke", args: [] });
  }
  fill() {
    this.calls.push({ method: "fill", args: [] });
  }
  createRadialGradient() {
    this.calls.push({ method: "createRadialGradient", args: [] });
    return { addColorStop: () => {} };
  }
  createLinearGradient() {
    this.calls.push({ method: "createLinearGradient", args: [] });
    return { addColorStop: () => {} };
  }
  set strokeStyle(v: string) {
    this._strokeStyle = v;
  }
  set lineWidth(v: number) {
    this._lineWidth = v;
  }
  set fillStyle(v: string) {
    this._fillStyle = v;
  }
  setLineDash(d: number[]) {
    this.calls.push({ method: "setLineDash", args: [d] });
  }
  set lineDashOffset(v: number) {
    this.calls.push({ method: "setLineDashOffset", args: [v] });
  }
  getLineDash(): number[] {
    return [];
  }
}

function makeFrag(overrides: Record<string, unknown> = {}) {
  return {
    id: "emerge-test",
    fragmentId: "frag-1",
    starId: "frag-1",
    x: 100,
    y: 200,
    size: 3,
    brightness: 0.8,
    phase: "star" as const,
    phaseStart: 0,
    read: false,
    groupArea: "chain",
    color: { r: 59, g: 130, b: 246 },
    shortText: "",
    fragment: null,
    connections: [],
    proximity: 0,
    screenX: 0,
    screenY: 0,
    textAlpha: 0,
    ...overrides,
  };
}

describe("drawConnectionLine", () => {
  it("skips when either star is hidden", async () => {
    const { drawConnectionLine } = await import("../primitives/connections");
    const ctx = new MockCtx();
    const s1 = makeFrag({ x: 0, y: 0, phase: "hidden" });
    const s2 = makeFrag({ x: 100, y: 100 });

    drawConnectionLine(ctx as unknown as CanvasRenderingContext2D, s1, s2, 0);
    expect(ctx.calls.length).toBe(0);
  });

  it("draws outer glow and dashed main line for visible stars", async () => {
    const { drawConnectionLine } = await import("../primitives/connections");
    const ctx = new MockCtx();
    const s1 = makeFrag({ x: 0, y: 0 });
    const s2 = makeFrag({ x: 100, y: 100 });

    drawConnectionLine(ctx as unknown as CanvasRenderingContext2D, s1, s2, 10);

    const strokeCalls = ctx.calls.filter((c) => c.method === "stroke");
    expect(strokeCalls.length).toBeGreaterThanOrEqual(2); // glow + main
  });
});

describe("drawEnergyDots", () => {
  it("mutates dot progress by speed", async () => {
    const { drawEnergyDots } = await import("../primitives/connections");
    const ctx = new MockCtx();
    const s1 = makeFrag({ x: 0, y: 0 });
    const s2 = makeFrag({ x: 100, y: 100 });
    const dots = [
      {
        connIdx: 0,
        progress: 0.4,
        speed: 0.01,
        size: 2,
        alpha: 0.5,
        color: { r: 255, g: 200, b: 100 },
      },
    ];
    const connData = [
      { s1, s2, c1: s1.color, c2: s2.color, isInterGroup: false },
    ];

    drawEnergyDots(
      ctx as unknown as CanvasRenderingContext2D,
      dots,
      connData,
      0,
    );
    expect(dots[0].progress).not.toBe(0.4);
  });

  it("wraps progress > 1 back to 0", async () => {
    const { drawEnergyDots } = await import("../primitives/connections");
    const ctx = new MockCtx();
    const s1 = makeFrag({ x: 0, y: 0 });
    const s2 = makeFrag({ x: 100, y: 100 });
    const dots = [
      {
        connIdx: 0,
        progress: 0.999,
        speed: 0.005,
        size: 2,
        alpha: 0.5,
        color: { r: 255, g: 200, b: 100 },
      },
    ];
    const connData = [
      { s1, s2, c1: s1.color, c2: s2.color, isInterGroup: false },
    ];

    drawEnergyDots(
      ctx as unknown as CanvasRenderingContext2D,
      dots,
      connData,
      0,
    );
    expect(dots[0].progress).toBeLessThan(1); // wrapped
  });

  it("wraps negative progress back around", async () => {
    const { drawEnergyDots } = await import("../primitives/connections");
    const ctx = new MockCtx();
    const s1 = makeFrag({ x: 0, y: 0 });
    const s2 = makeFrag({ x: 100, y: 100 });
    const dots = [
      {
        connIdx: 0,
        progress: 0.0,
        speed: -0.005,
        size: 2,
        alpha: 0.5,
        color: { r: 255, g: 200, b: 100 },
      },
    ];
    const connData = [
      { s1, s2, c1: s1.color, c2: s2.color, isInterGroup: false },
    ];

    drawEnergyDots(
      ctx as unknown as CanvasRenderingContext2D,
      dots,
      connData,
      0,
    );
    expect(dots[0].progress).toBeGreaterThanOrEqual(0);
    expect(dots[0].progress).toBeLessThan(1);
  });
});

describe("drawFragmentStar", () => {
  it("skips hidden stars", async () => {
    const { drawFragmentStar } = await import("../primitives/stars");
    const ctx = new MockCtx();
    const ef = makeFrag({ phase: "hidden" });

    drawFragmentStar(
      ctx as unknown as CanvasRenderingContext2D,
      ef,
      [],
      0,
      false,
    );
    expect(ctx.calls.length).toBe(0);
  });

  it("draws halo layers for visible stars", async () => {
    const { drawFragmentStar } = await import("../primitives/stars");
    const ctx = new MockCtx();
    const ef = makeFrag({ phase: "star", read: true });

    drawFragmentStar(
      ctx as unknown as CanvasRenderingContext2D,
      ef,
      [],
      10,
      false,
    );

    const arcCalls = ctx.calls.filter((c) => c.method === "arc");
    const fillCalls = ctx.calls.filter((c) => c.method === "fill");
    // Should have multiple halo layers + core
    expect(arcCalls.length).toBeGreaterThanOrEqual(4);
    expect(fillCalls.length).toBeGreaterThanOrEqual(4);
  });
});

describe("drawBgStar", () => {
  it("draws dust-type stars as simple circles", async () => {
    const { drawBgStar } = await import("../primitives/stars");
    const ctx = new MockCtx();
    const star = {
      wx: 100,
      wy: 200,
      size: 0.5,
      opacity: 0.1,
      twinklePhase: 0,
      twinkleSpeed: 0.2,
      type: "dust" as const,
      temp: 0.3,
      flare: false,
    };

    drawBgStar(ctx as unknown as CanvasRenderingContext2D, star, 10, 1, false);
    const arcCalls = ctx.calls.filter((c) => c.method === "arc");
    expect(arcCalls.length).toBeGreaterThanOrEqual(1);
  });
});
