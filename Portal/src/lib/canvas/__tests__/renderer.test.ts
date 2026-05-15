import { describe, it, expect } from "vitest";

describe("CanvasRenderer", () => {
  it("can be instantiated with explore mode", async () => {
    const { CanvasRenderer } = await import("../renderer");
    const canvas = {
      width: 800,
      height: 600,
      getContext: () => null,
    } as unknown as HTMLCanvasElement;
    const renderer = new CanvasRenderer(canvas, { mode: "explore" });
    expect(renderer.mode).toBe("explore");
  });

  it("can be instantiated with ambient mode", async () => {
    const { CanvasRenderer } = await import("../renderer");
    const canvas = {
      width: 800,
      height: 600,
      getContext: () => null,
    } as unknown as HTMLCanvasElement;
    const renderer = new CanvasRenderer(canvas, { mode: "ambient" });
    expect(renderer.mode).toBe("ambient");
  });

  it("defaults systems to all when not specified", async () => {
    const { CanvasRenderer } = await import("../renderer");
    const canvas = {
      width: 800,
      height: 600,
      getContext: () => null,
    } as unknown as HTMLCanvasElement;
    const renderer = new CanvasRenderer(canvas, { mode: "explore" });
    expect(renderer.systems.size).toBeGreaterThan(0);
  });

  it("accepts custom system list", async () => {
    const { CanvasRenderer } = await import("../renderer");
    const canvas = {
      width: 800,
      height: 600,
      getContext: () => null,
    } as unknown as HTMLCanvasElement;
    const renderer = new CanvasRenderer(canvas, {
      mode: "ambient",
      systems: ["background", "constellation"],
    });
    expect(renderer.systems.has("background")).toBe(true);
    expect(renderer.systems.has("constellation")).toBe(true);
    expect(renderer.systems.has("meteors")).toBe(false);
  });

  it("rejects canvas without 2d context", async () => {
    const { CanvasRenderer } = await import("../renderer");
    const canvas = {
      width: 800,
      height: 600,
      getContext: () => null,
    } as unknown as HTMLCanvasElement;
    const renderer = new CanvasRenderer(canvas, { mode: "explore" });
    expect(renderer.ctx).toBeNull();
  });
});
