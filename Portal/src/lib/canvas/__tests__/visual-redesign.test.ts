import { describe, it, expect } from "vitest";

describe("getHierarchyConfig", () => {
  it("returns L0 as highest brightness tier", async () => {
    const { getHierarchyConfig } = await import("../primitives/stars");
    const l0 = getHierarchyConfig("l0");
    const l1 = getHierarchyConfig("l1");
    const l2 = getHierarchyConfig("l2");
    const l3 = getHierarchyConfig("l3");

    expect(l0.coreAlpha).toBeGreaterThan(l1.coreAlpha);
    expect(l0.glowRadiusMul).toBeGreaterThan(l1.glowRadiusMul);
    expect(l0.bloomAlpha).toBeGreaterThan(l1.bloomAlpha);
  });

  it("L3 has minimal or zero bloom", async () => {
    const { getHierarchyConfig } = await import("../primitives/stars");
    const l3 = getHierarchyConfig("l3");
    expect(l3.bloomAlpha).toBeLessThanOrEqual(0.01);
  });

  it("L2 unread has pulsing ring indicator", async () => {
    const { getHierarchyConfig } = await import("../primitives/stars");
    const l2 = getHierarchyConfig("l2");
    expect(l2.showUnreadRing).toBe(true);
  });

  it("L1 read has no unread ring", async () => {
    const { getHierarchyConfig } = await import("../primitives/stars");
    const l1 = getHierarchyConfig("l1");
    expect(l1.showUnreadRing).toBe(false);
  });

  it("L0 has no unread ring", async () => {
    const { getHierarchyConfig } = await import("../primitives/stars");
    const l0 = getHierarchyConfig("l0");
    expect(l0.showUnreadRing).toBe(false);
  });
});

describe("applyAtmosphericPerspective", () => {
  it("shifts color toward blue with increasing distance", async () => {
    const { applyAtmosphericPerspective } =
      await import("../primitives/atmosphere");
    const white = { r: 255, g: 255, b: 255 };
    // Near: should be close to white
    const near = applyAtmosphericPerspective(white, 0, 2000);
    expect(near.r).toBeGreaterThan(200);
    // Far: should be bluer/darker
    const far = applyAtmosphericPerspective(white, 2000, 2000);
    expect(far.r).toBeLessThan(near.r);
    expect(far.b).toBeGreaterThanOrEqual(far.r);
  });

  it("returns unchanged color at zero distance", async () => {
    const { applyAtmosphericPerspective } =
      await import("../primitives/atmosphere");
    const color = { r: 200, g: 150, b: 100 };
    const result = applyAtmosphericPerspective(color, 0, 1000);
    expect(result).toEqual(color);
  });

  it("clamps distance to maxDistance", async () => {
    const { applyAtmosphericPerspective } =
      await import("../primitives/atmosphere");
    const color = { r: 255, g: 255, b: 255 };
    const a = applyAtmosphericPerspective(color, 500, 500);
    const b = applyAtmosphericPerspective(color, 1000, 500);
    expect(a).toEqual(b); // both clamped
  });

  it("blue component never decreases", async () => {
    const { applyAtmosphericPerspective } =
      await import("../primitives/atmosphere");
    const color = { r: 255, g: 200, b: 100 };
    const result = applyAtmosphericPerspective(color, 1000, 2000);
    expect(result.b).toBeGreaterThanOrEqual(color.b);
  });
});
