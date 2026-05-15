import { describe, it, expect, beforeEach } from "vitest";

// ── Minimal Canvas 2D mock ──

interface MockCall {
  method: string;
  args: unknown[];
}

class MockCanvasRenderingContext2D {
  calls: MockCall[] = [];
  _strokeStyle: string = "";
  _lineWidth: number = 1;
  _fillStyle: string = "";
  _globalAlpha: number = 1;
  _lineDash: number[] = [];
  _lineDashOffset: number = 0;

  // State trackers
  private _savedStates: number = 0;
  private _restoredStates: number = 0;

  save() {
    this.calls.push({ method: "save", args: [] });
    this._savedStates++;
  }

  restore() {
    this.calls.push({ method: "restore", args: [] });
    this._restoredStates++;
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

  arc(x: number, y: number, r: number, start: number, end: number) {
    this.calls.push({ method: "arc", args: [x, y, r, start, end] });
  }

  stroke() {
    this.calls.push({ method: "stroke", args: [] });
  }

  fill() {
    this.calls.push({ method: "fill", args: [] });
  }

  translate(x: number, y: number) {
    this.calls.push({ method: "translate", args: [x, y] });
  }

  createRadialGradient() {
    const mockGrad = {
      addColorStop: (_: number, __: string) => {},
    };
    this.calls.push({ method: "createRadialGradient", args: [] });
    return mockGrad;
  }

  createLinearGradient() {
    const mockGrad = {
      addColorStop: (_: number, __: string) => {},
    };
    this.calls.push({ method: "createLinearGradient", args: [] });
    return mockGrad;
  }

  set strokeStyle(v: string) {
    this.calls.push({ method: "setStrokeStyle", args: [v] });
    this._strokeStyle = v;
  }

  set lineWidth(v: number) {
    this.calls.push({ method: "setLineWidth", args: [v] });
    this._lineWidth = v;
  }

  set fillStyle(v: string) {
    this.calls.push({ method: "setFillStyle", args: [v] });
    this._fillStyle = v;
  }

  scale(_x: number, _y: number) {
    this.calls.push({ method: "scale", args: [_x, _y] });
  }

  fillRect(_x: number, _y: number, _w: number, _h: number) {
    this.calls.push({ method: "fillRect", args: [_x, _y, _w, _h] });
  }

  setLineDash(segments: number[]) {
    this.calls.push({ method: "setLineDash", args: [segments] });
    this._lineDash = segments;
  }

  set lineDashOffset(v: number) {
    this.calls.push({ method: "setLineDashOffset", args: [v] });
    this._lineDashOffset = v;
  }
}

// ══════════════════════════════════════
// Tests
// ══════════════════════════════════════

describe("drawCrossFlare", () => {
  let ctx: MockCanvasRenderingContext2D;

  beforeEach(() => {
    ctx = new MockCanvasRenderingContext2D();
  });

  it("draws two crossed lines (horizontal + vertical)", async () => {
    // Import dynamically so the module can fail before we implement it
    const { drawCrossFlare } = await import("../primitives/effects");
    drawCrossFlare(
      ctx as unknown as CanvasRenderingContext2D,
      100,
      200,
      3,
      0.8,
      { r: 255, g: 200, b: 100 },
    );

    // Should call translate to position
    expect(ctx.calls.some((c) => c.method === "translate")).toBe(true);

    // Should draw lines using moveTo + lineTo + stroke
    const moveToCalls = ctx.calls.filter((c) => c.method === "moveTo");
    const lineToCalls = ctx.calls.filter((c) => c.method === "lineTo");
    const strokeCalls = ctx.calls.filter((c) => c.method === "stroke");

    expect(moveToCalls.length).toBeGreaterThanOrEqual(4);
    expect(lineToCalls.length).toBeGreaterThanOrEqual(4);
    expect(strokeCalls.length).toBeGreaterThanOrEqual(4);
  });

  it("uses save/restore to isolate transform", async () => {
    const { drawCrossFlare } = await import("../primitives/effects");
    drawCrossFlare(ctx as unknown as CanvasRenderingContext2D, 0, 0, 2, 0.5, {
      r: 255,
      g: 255,
      b: 255,
    });

    const saveIdx = ctx.calls.findIndex((c) => c.method === "save");
    const restoreIdx = ctx.calls.findIndex((c) => c.method === "restore");
    expect(saveIdx).toBeGreaterThanOrEqual(0);
    expect(restoreIdx).toBeGreaterThan(saveIdx);
  });
});

describe("drawClickRipple", () => {
  let ctx: MockCanvasRenderingContext2D;

  beforeEach(() => {
    ctx = new MockCanvasRenderingContext2D();
  });

  it("draws an expanding ring when age < duration", async () => {
    const { drawClickRipple } = await import("../primitives/effects");
    drawClickRipple(
      ctx as unknown as CanvasRenderingContext2D,
      50,
      60,
      0.1,
      0.45,
    );

    const arcCalls = ctx.calls.filter((c) => c.method === "arc");
    const strokeCalls = ctx.calls.filter((c) => c.method === "stroke");
    expect(arcCalls.length).toBeGreaterThanOrEqual(1);
    expect(strokeCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("draws nothing when age >= duration", async () => {
    const { drawClickRipple } = await import("../primitives/effects");
    drawClickRipple(
      ctx as unknown as CanvasRenderingContext2D,
      50,
      60,
      0.5,
      0.45,
    );

    // No drawing calls when expired
    const drawCalls = ctx.calls.filter((c) =>
      ["moveTo", "lineTo", "arc", "stroke", "fill"].includes(c.method),
    );
    expect(drawCalls.length).toBe(0);
  });
});

describe("drawVignette", () => {
  let ctx: MockCanvasRenderingContext2D;

  beforeEach(() => {
    ctx = new MockCanvasRenderingContext2D();
  });

  it("creates a radial gradient and fills the full canvas", async () => {
    const { drawVignette } = await import("../primitives/atmosphere");
    drawVignette(ctx as unknown as CanvasRenderingContext2D, 800, 600);

    const fillRectCalls = ctx.calls.filter((c) => c.method === "fillRect");
    expect(fillRectCalls.length).toBeGreaterThanOrEqual(1);
  });
});
