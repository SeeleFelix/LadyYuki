import { describe, it, expect, beforeEach } from "vitest";

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
}

describe("drawAgentStar", () => {
  let ctx: MockCtx;
  beforeEach(() => {
    ctx = new MockCtx();
  });

  it("draws halo layers and core for a visible star", async () => {
    const { drawAgentStar } = await import("../primitives/stars");
    const star = {
      id: "s1",
      x: 400,
      y: 300,
      size: 3,
      brightness: 0.8,
      twinkleSpeed: 1.5,
      createdAt: 0,
    };
    drawAgentStar(
      ctx as unknown as CanvasRenderingContext2D,
      star,
      10,
      false,
      false,
    );
    const arcCalls = ctx.calls.filter((c) => c.method === "arc");
    const fillCalls = ctx.calls.filter((c) => c.method === "fill");
    expect(arcCalls.length).toBeGreaterThanOrEqual(3);
    expect(fillCalls.length).toBeGreaterThanOrEqual(3);
  });

  it("draws selection ring when selected", async () => {
    const { drawAgentStar } = await import("../primitives/stars");
    const star = {
      id: "s1",
      x: 400,
      y: 300,
      size: 3,
      brightness: 0.8,
      twinkleSpeed: 1.5,
      createdAt: 0,
    };
    drawAgentStar(
      ctx as unknown as CanvasRenderingContext2D,
      star,
      10,
      true,
      false,
    );
    const strokeCalls = ctx.calls.filter((c) => c.method === "stroke");
    expect(strokeCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("uses entrance animation for recently created stars", async () => {
    const { drawAgentStar } = await import("../primitives/stars");
    const star = {
      id: "s1",
      x: 400,
      y: 300,
      size: 1,
      brightness: 0.3,
      twinkleSpeed: 1.5,
      createdAt: Date.now(),
    };
    drawAgentStar(
      ctx as unknown as CanvasRenderingContext2D,
      star,
      star.createdAt / 1000 + 0.5,
      false,
      false,
    );
    const arcCalls = ctx.calls.filter((c) => c.method === "arc");
    expect(arcCalls.length).toBeGreaterThan(0);
  });
});

describe("drawAgentConnection", () => {
  let ctx: MockCtx;
  beforeEach(() => {
    ctx = new MockCtx();
  });

  it("draws gradient line between two stars", async () => {
    const { drawAgentConnection } = await import("../primitives/connections");
    const s1 = {
      id: "s1",
      x: 100,
      y: 100,
      size: 3,
      brightness: 0.8,
      twinkleSpeed: 1.5,
      createdAt: Date.now(),
    };
    const s2 = {
      id: "s2",
      x: 400,
      y: 300,
      size: 3,
      brightness: 0.8,
      twinkleSpeed: 1.5,
      createdAt: Date.now(),
    };
    drawAgentConnection(
      ctx as unknown as CanvasRenderingContext2D,
      s1,
      s2,
      0.6,
      10,
    );
    const strokeCalls = ctx.calls.filter((c) => c.method === "stroke");
    expect(strokeCalls.length).toBeGreaterThanOrEqual(2);
  });
});
