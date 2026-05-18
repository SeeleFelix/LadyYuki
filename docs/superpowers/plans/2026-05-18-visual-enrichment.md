# Visual Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite void gate as abyssal rift, add group-specific star flares, replace ignition with geometric burst, add background star chart rings and connection-line rune textures.

**Architecture:** Incremental rewrite of draw logic within existing systems. No structural or interaction changes. Each task adds theme params + types, then rewrites the corresponding draw function. Theme params and types are introduced in the task that uses them.

**Tech Stack:** Canvas 2D API, TypeScript, Vitest

---

## File Structure

| File | Responsibility |
|------|---------------|
| `Portal/src/lib/canvas/theme.ts` | All visual parameters (existing + new rift/flare/geoIgnition/starChart/rune params) |
| `Portal/src/lib/canvas/types.ts` | Type definitions (existing + new GeoFragment, RiftParticle types) |
| `Portal/src/lib/canvas/systems/void-gate.ts` | Rift drawing + geometric ignition (rewrite drawVortex, drawFissure, drawRing, drawIgnition) |
| `Portal/src/lib/canvas/systems/constellation.ts` | Flare drawing + rune texture (modify drawFragmentStars, drawConnectionLines) |
| `Portal/src/lib/canvas/systems/background.ts` | Star chart rings (new drawStarChart function, called from renderer) |
| `Portal/src/lib/canvas/renderer.ts` | Wire star chart drawing into render pipeline |
| `Portal/src/lib/canvas/__tests__/theme.test.ts` | Tests for new theme params |
| `Portal/src/lib/canvas/__tests__/visual-enrichment.test.ts` | Tests for new draw functions |

---

### Task 1: Add new types to types.ts

**Files:**
- Modify: `Portal/src/lib/canvas/types.ts`

- [ ] **Step 1: Add GeoFragment and RiftParticle types**

Add these types after the existing `IgnitionParticle` interface (around line 64):

```ts
// ── Geometric ignition fragments ──
export type GeoFragmentShape = "triangle" | "quad" | "line";

export interface GeoFragment {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotSpeed: number;
  shape: GeoFragmentShape;
  size: number;
  color: { r: number; g: number; b: number };
  trail: Array<{ x: number; y: number }>;
}

// ── Rift drift particles ──
export interface RiftParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add Portal/src/lib/canvas/types.ts
git commit -m "feat: add GeoFragment and RiftParticle types for visual enrichment"
```

---

### Task 2: Add rift, flare, geoIgnition, starChart, rune params to theme.ts

**Files:**
- Modify: `Portal/src/lib/canvas/theme.ts`
- Test: `Portal/src/lib/canvas/__tests__/theme.test.ts`

- [ ] **Step 1: Write failing test for new theme params**

Append to `Portal/src/lib/canvas/__tests__/theme.test.ts`:

```ts
describe("theme visual enrichment params", () => {
  it("has rift configuration in voidGate", () => {
    const rift = (theme.voidGate as Record<string, unknown>).rift;
    expect(rift).toBeDefined();
    const r = rift as Record<string, unknown>;
    expect(r.curveCount).toBe(3);
    expect(r.baseLength).toBe(0.35);
    expect(r.width).toBe(1.5);
    expect(r.edgeGlowWidth).toBe(12);
    expect(r.edgeGlowAlpha).toBe(0.4);
    expect(r.breathFreq).toBe(0.25);
    expect(r.breathAmp).toBe(0.15);
    expect(r.particleRate).toBe(0.02);
    expect(r.voidDepth).toBe(0.03);
  });

  it("has flare configuration per group", () => {
    const flare = (theme.constellation.fragmentStars as Record<string, unknown>).flare;
    expect(flare).toBeDefined();
    const f = flare as Record<string, Record<string, unknown>>;
    expect(f.origin.rays).toBe(4);
    expect(f.seelefelix.rays).toBe(6);
    expect(f.chain.rays).toBe(3);
    expect(f.silhouette.rays).toBe(2);
    expect(f.axiom.rays).toBe(5);
    expect(f.standard.rays).toBe(4);
    expect(f.closing.rays).toBe(8);
  });

  it("chain flare has auxRays", () => {
    const flare = (theme.constellation.fragmentStars as Record<string, unknown>).flare as Record<string, Record<string, unknown>>;
    expect(flare.chain.auxRays).toBe(3);
    expect(flare.chain.auxLengthMul).toBe(3);
  });

  it("standard flare has lengthVar for diamond layout", () => {
    const flare = (theme.constellation.fragmentStars as Record<string, unknown>).flare as Record<string, Record<string, unknown>>;
    expect(flare.standard.lengthVar).toEqual([4, 7]);
  });

  it("has geoIgnition configuration", () => {
    const gi = (theme.ignition as Record<string, unknown>).geoIgnition;
    expect(gi).toBeDefined();
    const g = gi as Record<string, unknown>;
    expect(g.burst).toBeDefined();
    expect(g.geoRings).toBeDefined();
    expect(g.fragments).toBeDefined();
  });

  it("has starChart configuration in background", () => {
    const sc = (theme.background as Record<string, unknown>).starChart;
    expect(sc).toBeDefined();
    const s = sc as Record<string, unknown>;
    expect(s.ringCount).toBe(3);
    expect(s.ringRadii).toBeDefined();
    expect(s.ringAlpha).toBeDefined();
    expect(s.tickCount).toBeDefined();
  });

  it("has rune configuration in constellation connection", () => {
    const rune = (theme.constellation.connection as Record<string, unknown>).rune;
    expect(rune).toBeDefined();
    const r = rune as Record<string, unknown>;
    expect(r.symbolSpacing).toBe(40);
    expect(r.symbolSize).toBe(2.5);
    expect(r.alpha).toBeLessThan(0.25);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd Portal && npx vitest run src/lib/canvas/__tests__/theme.test.ts`
Expected: FAIL — new properties don't exist yet

- [ ] **Step 3: Add params to theme.ts**

In `Portal/src/lib/canvas/theme.ts`, add the following nested objects inside the `theme` object:

Replace the existing `voidGate.vortex` block (lines 173-178) with:

```ts
  // ── Void Gate ──
  voidGate: {
    // Rift (pre-ignition) — replaces vortex
    rift: {
      curveCount: 3,
      baseLength: 0.35,
      width: 1.5,
      edgeGlowWidth: 12,
      edgeGlowAlpha: 0.4,
      breathFreq: 0.25,
      breathAmp: 0.15,
      particleRate: 0.02,
      voidDepth: 0.03,
    },

    // Fissure (ignition in progress)
    fissure: {
      duration: 0.3,
      maxAlpha: 0.85,
      arcCount: 3,
      arcAlpha: 0.15,
    },

    // Ring / scar (post-ignition)
    ring: {
      baseRadiusMul: 10,
      rotSpeed: 0.08,
      baseFragmentCount: 8,
      fragmentWidth: [4, 1.5] as [number, number],
      pulseDuration: 3.0,
      heartbeatInterval: 1.0,
    },
  },
```

Add flare config inside `constellation.fragmentStars` (after the `unreadRing` block, before the closing brace of `fragmentStars`):

```ts
      // Flare shapes per group
      flare: {
        origin:      { rays: 4, angleOffset: 0,           lengthMul: 6,   widthBase: 2.5 } as const,
        seelefelix:  { rays: 6, angleOffset: 0,           lengthMul: 5,   widthBase: 2.0 } as const,
        chain:       { rays: 3, angleOffset: 0,           lengthMul: 7,   widthBase: 2.5, auxRays: 3, auxLengthMul: 3 } as const,
        silhouette:  { rays: 2, angleOffset: Math.PI / 4, lengthMul: 8,   widthBase: 3.0 } as const,
        axiom:       { rays: 5, angleOffset: 0,           lengthMul: 5.5, widthBase: 2.0 } as const,
        standard:    { rays: 4, angleOffset: 0,           lengthMul: 5,   widthBase: 2.0, lengthVar: [4, 7] as [number, number] } as const,
        closing:     { rays: 8, angleOffset: 0,           lengthMul: 4.5, widthBase: 1.8 } as const,
      },
```

Add rune config inside `constellation.connection` (after the `mainLine` block):

```ts
      // Rune texture overlay
      rune: {
        symbolSpacing: 40,
        symbolSize: 2.5,
        alpha: 0.15,
        symbols: ["triangle-up", "triangle-down", "dot", "cross", "square"] as const,
      },
```

Add geoIgnition config inside `ignition` (after the existing `shockwave` block):

```ts
    // Geometric ignition (replaces simple particles + shockwave)
    geoIgnition: {
      burst: {
        rayCount: 14,
        rayLengthMul: [8, 18] as [number, number],
        rayWidth: 1.5,
        rayGlowWidth: 5,
        auxFlareRays: 3,
      },
      geoRings: {
        count: 4,
        sides: [6, 8, 6, 8] as [number, number, number, number],
        expansionSpeed: 0.2,
        baseAlpha: 0.7,
        distortFreq: 1.5,
      },
      fragments: {
        count: 24,
        speed: [300, 1000] as [number, number],
        life: [0.4, 1.2] as [number, number],
        rotSpeed: [2, 8] as [number, number],
        trailLength: 6,
      },
    },
```

Add starChart config inside `background` (after the `meteors` block):

```ts
    // Star chart geometry overlay
    starChart: {
      ringCount: 3,
      ringRadii: [400, 580, 780] as [number, number, number],
      ringAlpha: [0.035, 0.025, 0.018] as [number, number, number],
      tickCount: [36, 48, 60] as [number, number, number],
      rotSpeed: [0.003, -0.002, 0.0015] as [number, number, number],
      connectionAlpha: 0.015,
    },
```

- [ ] **Step 4: Run test to verify pass**

Run: `cd Portal && npx vitest run src/lib/canvas/__tests__/theme.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add Portal/src/lib/canvas/theme.ts Portal/src/lib/canvas/__tests__/theme.test.ts
git commit -m "feat: add rift, flare, geoIgnition, starChart, rune theme params"
```

---

### Task 3: Rewrite drawVortex → drawRift in void-gate.ts

**Files:**
- Modify: `Portal/src/lib/canvas/systems/void-gate.ts`

This rewrites the `drawVortex` function (lines 95-142) and renames it to `drawRift`. Also updates the call site in `drawVoidGate` (line 86).

- [ ] **Step 1: Rewrite drawVortex as drawRift**

Replace the `drawVortex` function (lines 95-142) with:

```ts
// ── Rift — twisting abyssal tear in reality ──
function drawRift(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number,
  canvas: HTMLCanvasElement,
) {
  const cfg = theme.voidGate.rift as {
    curveCount: number;
    baseLength: number;
    width: number;
    edgeGlowWidth: number;
    edgeGlowAlpha: number;
    breathFreq: number;
    breathAmp: number;
    particleRate: number;
    voidDepth: number;
  };
  const w = canvas.width;
  const h = canvas.height;
  const maxDim = Math.max(w, h);
  const breath = Math.sin(time * cfg.breathFreq) * cfg.breathAmp + 1;
  const riftLen = maxDim * cfg.baseLength * breath;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 2 + Math.sin(time * 0.08) * 0.1);

  // Interior void — darker than background
  const voidW = cfg.width * 3 * breath;
  const voidH = riftLen;
  const vg = ctx.createRadialGradient(0, 0, 0, 0, 0, riftLen * cfg.voidDepth * 10);
  vg.addColorStop(0, "rgba(0,0,0,0.6)");
  vg.addColorStop(0.5, "rgba(0,0,2,0.3)");
  vg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = vg;
  ctx.fillRect(-riftLen * cfg.voidDepth * 5, -voidH, riftLen * cfg.voidDepth * 10, voidH * 2);

  // Rift curves — jagged Bezier tears
  for (let i = 0; i < cfg.curveCount; i++) {
    const offset = (i - (cfg.curveCount - 1) / 2) * 3;
    const jitter1 = Math.sin(time * 0.3 + i * 2.1) * riftLen * 0.08;
    const jitter2 = Math.sin(time * 0.25 + i * 3.7) * riftLen * 0.06;

    ctx.beginPath();
    ctx.moveTo(offset, -riftLen / 2);
    ctx.bezierCurveTo(
      offset + jitter1, -riftLen / 4,
      offset - jitter2, riftLen / 4,
      offset, riftLen / 2,
    );
    ctx.strokeStyle = `rgba(0,0,0,${0.7 + i * 0.1})`;
    ctx.lineWidth = cfg.width + i * 0.5;
    ctx.stroke();

    // Edge glow on both sides
    const glowAlpha = cfg.edgeGlowAlpha * breath * (0.7 + 0.3 * Math.sin(time * cfg.breathFreq + i));
    for (const side of [-1, 1]) {
      const gx = offset + side * cfg.edgeGlowWidth * 0.5;
      const gg = ctx.createLinearGradient(gx - cfg.edgeGlowWidth / 2, 0, gx + cfg.edgeGlowWidth / 2, 0);
      gg.addColorStop(0, "rgba(0,0,0,0)");
      gg.addColorStop(0.5, `rgba(180,170,240,${glowAlpha})`);
      gg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.moveTo(gx + side * 2 + jitter1 * 0.5, -riftLen / 2);
      ctx.bezierCurveTo(
        gx + jitter1 * 0.3, -riftLen / 4,
        gx - jitter2 * 0.3, riftLen / 4,
        gx + side * 2 - jitter2 * 0.5, riftLen / 2,
      );
      ctx.strokeStyle = gg;
      ctx.lineWidth = cfg.edgeGlowWidth;
      ctx.stroke();
    }
  }

  ctx.restore();
}
```

- [ ] **Step 2: Update call site in drawVoidGate**

In the `drawVoidGate` function, replace line 86:

```ts
    drawVortex(ctx, sx, sy, time, canvas);
```

with:

```ts
    drawRift(ctx, sx, sy, time, canvas);
```

- [ ] **Step 3: Remove old drawVortex function**

Delete the old `drawVortex` function (was lines 95-142). It has been fully replaced by `drawRift`.

- [ ] **Step 4: Run existing tests to verify no regressions**

Run: `cd Portal && npx vitest run`
Expected: ALL PASS (no test directly tests drawVortex by name)

- [ ] **Step 5: Commit**

```bash
git add Portal/src/lib/canvas/systems/void-gate.ts
git commit -m "feat: rewrite void vortex as abyssal rift with Bezier tear curves"
```

---

### Task 4: Enhance drawFissure for rift expansion

**Files:**
- Modify: `Portal/src/lib/canvas/systems/void-gate.ts`

This rewrites the `drawFissure` function to use the rift's expanding tear aesthetic.

- [ ] **Step 1: Rewrite drawFissure**

Replace the existing `drawFissure` function with:

```ts
// ── Fissure — rift tearing open ──
function drawFissure(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cs: number,
  t: number,
  time: number,
  prox: number,
) {
  const progress = Math.min(1, t / 0.3);
  const eased = 1 - Math.pow(1 - progress, 3);
  const alpha = progress * 0.85;

  ctx.save();
  ctx.translate(cx, cy);

  // Expanding rift lines
  const lineCount = 3 + Math.floor(eased * 4);
  const riftSpread = cs * 4 + eased * cs * 20;
  const riftHeight = cs * 30 + eased * cs * 40;

  for (let i = 0; i < lineCount; i++) {
    const frac = i / (lineCount - 1);
    const offsetX = (frac - 0.5) * riftSpread;
    const jitter1 = Math.sin(time * 2 + i * 1.7) * riftHeight * 0.06 * eased;
    const jitter2 = Math.cos(time * 1.5 + i * 2.3) * riftHeight * 0.04 * eased;
    const lineAlpha = alpha * (0.4 + 0.6 * (1 - Math.abs(frac - 0.5) * 2));

    ctx.beginPath();
    ctx.moveTo(offsetX, -riftHeight / 2);
    ctx.bezierCurveTo(
      offsetX + jitter1, -riftHeight / 4,
      offsetX - jitter2, riftHeight / 4,
      offsetX, riftHeight / 2,
    );

    const brightness = Math.floor(180 + 75 * (1 - Math.abs(frac - 0.5) * 2));
    ctx.strokeStyle = `rgba(${brightness},${brightness - 20},255,${lineAlpha})`;
    ctx.lineWidth = 1 + (1 - Math.abs(frac - 0.5) * 2) * 2 * eased;
    ctx.stroke();
  }

  // Central hot core
  const coreR = cs * 2 + eased * cs * 8;
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
  cg.addColorStop(0, `rgba(255,255,255,${alpha})`);
  cg.addColorStop(0.3, `rgba(220,200,255,${alpha * 0.7})`);
  cg.addColorStop(0.6, `rgba(140,100,220,${alpha * 0.3})`);
  cg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, Math.PI * 2);
  ctx.fill();

  // Rotating vortex arcs (remnant from old fissure, enhanced)
  for (let i = 0; i < 3; i++) {
    const rot = time * (0.12 + i * 0.06) * (i % 2 === 0 ? 1 : -1) + progress * 2;
    const rx = cs * 6 * (1 + i * 0.5) * (1 + progress * 0.6);
    const ry = rx * 0.4 * (1 - progress * 0.6);
    const a = (0.15 - progress * 0.1) * (1 + prox * 0.3);

    ctx.save();
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(160,140,220,${a})`;
    ctx.lineWidth = 1.5 * (1 - progress * 0.5);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
```

- [ ] **Step 2: Run tests**

Run: `cd Portal && npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add Portal/src/lib/canvas/systems/void-gate.ts
git commit -m "feat: rewrite fissure as expanding rift tear with multi-line burst"
```

---

### Task 5: Rewrite drawRing → rift scar in void-gate.ts

**Files:**
- Modify: `Portal/src/lib/canvas/systems/void-gate.ts`

- [ ] **Step 1: Rewrite drawRing as drawRiftScar**

Replace the existing `drawRing` function with:

```ts
// ── Rift Scar — healing crack with orbiting shards ──
function drawRiftScar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cs: number,
  time: number,
  breathCycle: number,
  prox: number,
  readCount: number,
  ignitionAge: number,
) {
  const ringR = cs * 10 + Math.sin(time * 0.3) * cs;
  const fragmentCount = 8 + Math.min(readCount, 16);
  const rotSpeed = 0.08;

  const pulseAge = Math.max(0, ignitionAge - 0.3);
  const pulseCycle = (pulseAge % 1.0) / 1.0;
  const pulseIntensity = Math.sin(pulseCycle * Math.PI);
  const pulseBoost = pulseAge < 3.0 ? 1 + pulseIntensity * 0.4 : 1;

  ctx.save();
  ctx.translate(cx, cy);

  // Dark scar line — thin crack at center
  const scarLen = cs * 4 * pulseBoost;
  ctx.beginPath();
  ctx.moveTo(-scarLen * 0.1, -scarLen / 2);
  ctx.bezierCurveTo(
    Math.sin(time * 0.4) * scarLen * 0.1, -scarLen / 4,
    -Math.sin(time * 0.35) * scarLen * 0.1, scarLen / 4,
    scarLen * 0.08, scarLen / 2,
  );
  ctx.strokeStyle = `rgba(5,2,15,${0.6 * pulseBoost})`;
  ctx.lineWidth = 2 * pulseBoost;
  ctx.stroke();

  // Scar edge glow
  ctx.beginPath();
  ctx.moveTo(-scarLen * 0.1, -scarLen / 2);
  ctx.bezierCurveTo(
    Math.sin(time * 0.4) * scarLen * 0.1, -scarLen / 4,
    -Math.sin(time * 0.35) * scarLen * 0.1, scarLen / 4,
    scarLen * 0.08, scarLen / 2,
  );
  ctx.strokeStyle = `rgba(140,120,200,${0.12 * pulseBoost})`;
  ctx.lineWidth = 6 * pulseBoost;
  ctx.stroke();

  // Dark core
  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, cs * 2 * pulseBoost);
  coreGrad.addColorStop(0, "rgba(10,5,20,0.9)");
  coreGrad.addColorStop(0.5, `rgba(40,30,80,${0.4 * pulseBoost})`);
  coreGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, cs * 2 * pulseBoost, 0, Math.PI * 2);
  ctx.fill();

  // L0 bright center
  const brightCore = ctx.createRadialGradient(0, 0, 0, 0, 0, cs * 0.8 * pulseBoost);
  brightCore.addColorStop(0, `rgba(255,255,255,${0.6 * pulseBoost})`);
  brightCore.addColorStop(0.5, `rgba(200,180,255,${0.2 * pulseBoost})`);
  brightCore.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = brightCore;
  ctx.beginPath();
  ctx.arc(0, 0, cs * 0.8 * pulseBoost, 0, Math.PI * 2);
  ctx.fill();

  // Irregular shattered shards orbiting
  const pulseR = ringR * pulseBoost;
  for (let i = 0; i < fragmentCount; i++) {
    const baseAngle = (i / fragmentCount) * Math.PI * 2;
    const wobble = Math.sin(time * 1.5 + i * 2.3) * 0.15;
    const angle = baseAngle + time * rotSpeed + wobble;
    const arcLen = ((Math.PI * 2) / fragmentCount) * (0.3 + Math.sin(time * 0.8 + i * 1.9) * 0.2);
    const startAngle = angle - arcLen / 2;
    const endAngle = angle + arcLen / 2;
    const fragBrightness = 0.5 + breathCycle * 0.3 + Math.sin(time * 2 + i * 1.7) * 0.15;
    const a = fragBrightness * 1.1 * pulseBoost;

    // Shard glow
    ctx.beginPath();
    ctx.arc(0, 0, pulseR, startAngle, endAngle);
    ctx.strokeStyle = `rgba(190,170,240,${a})`;
    ctx.lineWidth = 3 + Math.sin(time + i) * 1;
    ctx.shadowColor = `rgba(170,150,230,${a * 0.5})`;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Shard core
    ctx.beginPath();
    ctx.arc(0, 0, pulseR, startAngle, endAngle);
    ctx.strokeStyle = `rgba(240,230,255,${a * 1.2})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Orbital dots at shard tips
  for (let i = 0; i < fragmentCount; i++) {
    const angle = (i / fragmentCount) * Math.PI * 2 + time * rotSpeed;
    const dotX = Math.cos(angle) * pulseR;
    const dotY = Math.sin(angle) * pulseR;
    const dotA = 0.8 + breathCycle * 0.3;
    const dg = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, cs * 0.8);
    dg.addColorStop(0, `rgba(255,255,255,${dotA})`);
    dg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(dotX, dotY, cs * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Proximity glow
  if (prox > 0) {
    const pg = ctx.createRadialGradient(cx, cy, cs, cx, cy, ringR * 1.5);
    pg.addColorStop(0, `rgba(140,120,200,${prox * 0.12})`);
    pg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

- [ ] **Step 2: Update call site in drawVoidGate**

In `drawVoidGate`, replace the call from `drawRing` to `drawRiftScar` (around line 90):

```ts
    drawRiftScar(ctx, cx, cy, cs, time, breathCycle, prox, readCount, ignitionAge);
```

- [ ] **Step 3: Run tests**

Run: `cd Portal && npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add Portal/src/lib/canvas/systems/void-gate.ts
git commit -m "feat: rewrite void ring as rift scar with crack and shattered shards"
```

---

### Task 6: Rewrite drawIgnition as geometric burst in void-gate.ts

**Files:**
- Modify: `Portal/src/lib/canvas/systems/void-gate.ts`
- Modify: `Portal/src/lib/canvas/types.ts` (if GeoFragment not yet imported)
- Modify: `Portal/src/lib/components/LivingSpace.svelte` (particle system integration)

This is the largest task. It replaces the simple circular shockwave + round particles with geometric burst + polygon rings + geometric fragment debris.

- [ ] **Step 1: Add geometric ignition system state**

Add after the `IgnitionSystem` interface (around line 13) in `void-gate.ts`:

```ts
export interface GeoIgnitionSystem extends IgnitionSystem {
  geoFragments: GeoFragment[];
  riftParticles: RiftParticle[];
}

export function createGeoIgnitionSystem(): GeoIgnitionSystem {
  return {
    particles: [],
    shake: 0,
    geoFragments: [],
    riftParticles: [],
  };
}

export function updateGeoIgnition(sys: GeoIgnitionSystem, dt: number): void {
  updateIgnition(sys, dt);

  for (const f of sys.geoFragments) {
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.rotation += f.rotSpeed * dt;
    f.life -= dt;
    f.trail.push({ x: f.x, y: f.y });
    if (f.trail.length > 6) f.trail.shift();
  }
  sys.geoFragments = sys.geoFragments.filter((f) => f.life > 0);

  for (const p of sys.riftParticles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  sys.riftParticles = sys.riftParticles.filter((p) => p.life > 0);
}

export function spawnGeoIgnitionBurst(
  sys: GeoIgnitionSystem,
  x: number,
  y: number,
): void {
  spawnIgnitionBurst(sys, x, y);

  const giCfg = (theme.ignition as Record<string, unknown>).geoIgnition as {
    burst: { rayCount: number; rayLengthMul: [number, number]; rayWidth: number; rayGlowWidth: number; auxFlareRays: number };
    fragments: { count: number; speed: [number, number]; life: [number, number]; rotSpeed: [number, number]; trailLength: number };
  };

  const shapes: GeoFragmentShape[] = ["triangle", "quad", "line"];
  const colors = theme.ignition.particleColors;

  for (let i = 0; i < giCfg.fragments.count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = giCfg.fragments.speed[0] + Math.random() * (giCfg.fragments.speed[1] - giCfg.fragments.speed[0]);
    const life = giCfg.fragments.life[0] + Math.random() * (giCfg.fragments.life[1] - giCfg.fragments.life[0]);
    const rotSpd = giCfg.fragments.rotSpeed[0] + Math.random() * (giCfg.fragments.rotSpeed[1] - giCfg.fragments.rotSpeed[0]);

    sys.geoFragments.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() > 0.5 ? 1 : -1) * rotSpd,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      size: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      trail: [],
    });
  }
}
```

- [ ] **Step 2: Add GeoFragment and RiftParticle imports**

At the top of `void-gate.ts`, update the import from types:

```ts
import type { EmergingFrag, IgnitionParticle, GeoFragment, GeoFragmentShape, RiftParticle } from "../types";
```

- [ ] **Step 3: Rewrite drawIgnition**

Replace the existing `drawIgnition` function with:

```ts
// ══════════════════════════════════════════
//  Geometric Ignition — burst + geo-rings + fragment debris
// ══════════════════════════════════════════

export function drawIgnition(
  ctx: CanvasRenderingContext2D,
  emergingFrags: EmergingFrag[],
  ignitionAge: number,
  ignitionParticles: IgnitionParticle[],
  viewport: SpaceViewport,
  canvas: HTMLCanvasElement,
  geoFragments?: GeoFragment[],
) {
  if (ignitionAge <= 0 || ignitionAge > 5) return;
  const ef = emergingFrags.find((f) => f.starId === "void-entry");
  if (!ef) return;
  const cx = ef.x,
    cy = ef.y;
  const t = ignitionAge;
  const maxDim = Math.max(canvas.width, canvas.height) / viewport.zoom;

  const giCfg = (theme.ignition as Record<string, unknown>).geoIgnition as {
    burst: { rayCount: number; rayLengthMul: [number, number]; rayWidth: number; rayGlowWidth: number; auxFlareRays: number };
    geoRings: { count: number; sides: number[]; expansionSpeed: number; baseAlpha: number; distortFreq: number };
    fragments: { count: number; speed: [number, number]; life: [number, number]; rotSpeed: [number, number]; trailLength: number };
  };

  // Diamond-shaped central flash
  const flashCfg = theme.ignition.flash;
  if (t < flashCfg.duration) {
    const flashA = (1 - t / flashCfg.duration) * flashCfg.maxAlpha;
    const flashR = maxDim * flashCfg.radiusMul * 0.3;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, flashR);
    fg.addColorStop(0, `rgba(255,255,255,${flashA})`);
    fg.addColorStop(0.1, `rgba(220,210,255,${flashA * 0.6})`);
    fg.addColorStop(0.3, `rgba(140,120,220,${flashA * 0.15})`);
    fg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = fg;
    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(0, -flashR);
    ctx.lineTo(flashR * 0.4, 0);
    ctx.lineTo(0, flashR);
    ctx.lineTo(-flashR * 0.4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Geometric burst rays
  if (t > 0.1 && t < 3) {
    const rayAge = t - 0.1;
    const rayFade = rayAge < 0.5 ? rayAge / 0.5 : Math.max(0, 1 - (rayAge - 0.5) / 2.5);
    const rayCount = giCfg.burst.rayCount;
    const efSize = ef.size;

    ctx.save();
    ctx.translate(cx, cy);

    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2 + Math.sin(i * 7.3) * 0.15;
      const lengthMul = giCfg.burst.rayLengthMul[0] + ((Math.sin(i * 3.7) + 1) / 2) * (giCfg.burst.rayLengthMul[1] - giCfg.burst.rayLengthMul[0]);
      const rayLen = efSize * lengthMul * rayFade;
      const endX = Math.cos(angle) * rayLen;
      const endY = Math.sin(angle) * rayLen;

      // Outer glow
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = `rgba(140,120,210,${rayFade * 0.35})`;
      ctx.lineWidth = giCfg.burst.rayGlowWidth;
      ctx.stroke();

      // Core ray
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = `rgba(255,255,255,${rayFade * 0.8})`;
      ctx.lineWidth = giCfg.burst.rayWidth;
      ctx.stroke();

      // Tip flare (small cross)
      if (rayLen > efSize * 4) {
        const tipSize = efSize * 1.5 * rayFade;
        for (let a = 0; a < giCfg.burst.auxFlareRays; a++) {
          const fAngle = angle + (a / giCfg.burst.auxFlareRays) * Math.PI;
          const fLen = tipSize * (0.5 + 0.5 * Math.sin(a * 2.1));
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX + Math.cos(fAngle) * fLen,
            endY + Math.sin(fAngle) * fLen,
          );
          ctx.strokeStyle = `rgba(200,190,240,${rayFade * 0.5})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  // Concentric polygon rings (replacing circular shockwave)
  if (t > 0.3 && t < 4) {
    const waveSpeed = maxDim / 5;
    const geoRings = giCfg.geoRings;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (let i = 0; i < geoRings.count; i++) {
      const startT = theme.ignition.shockwave.startOffset + i * theme.ignition.shockwave.spacing;
      const ringLife = theme.ignition.shockwave.ringLife;
      if (t < startT || t > startT + ringLife) continue;
      const age = t - startT;
      const ringProgress = age / ringLife;
      const eased = 1 - (1 - ringProgress) * (1 - ringProgress);
      const ringR = eased * waveSpeed * ringLife;
      const intensity = age < 0.3 ? age / 0.3 : 1 - (age - 0.3) / (ringLife - 0.3);
      const a = intensity * geoRings.baseAlpha;
      const sides = geoRings.sides[i];

      // Draw polygon ring
      ctx.beginPath();
      for (let s = 0; s <= sides; s++) {
        const angle = (s / sides) * Math.PI * 2;
        const distort = 1 + Math.sin(angle * geoRings.distortFreq + t * 3 + i) * 0.03;
        const px = cx + Math.cos(angle) * ringR * distort;
        const py = cy + Math.sin(angle) * ringR * distort;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      // Outer glow
      ctx.strokeStyle = `rgba(140,120,210,${a * 0.4})`;
      ctx.lineWidth = 14;
      ctx.shadowColor = `rgba(150,130,220,${a * 0.5})`;
      ctx.shadowBlur = 35;
      ctx.stroke();

      // Core ring
      ctx.strokeStyle = `rgba(220,200,245,${a * 0.7})`;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 12;
      ctx.stroke();

      // Inner bright edge
      ctx.strokeStyle = `rgba(255,255,255,${a * 0.9})`;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Old-style round particles (kept as legacy base layer)
  for (const p of ignitionParticles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8);
    pg.addColorStop(0, `rgba(255,255,255,${alpha})`);
    pg.addColorStop(0.5, `rgba(${p.color.r},${p.color.g},${p.color.b},${alpha * 0.5})`);
    pg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = pg;
    ctx.fill();
  }

  // Geometric fragment debris
  if (geoFragments) {
    for (const f of geoFragments) {
      const alpha = Math.max(0, f.life / f.maxLife);
      if (alpha < 0.02) continue;

      // Trail
      if (f.trail.length > 1) {
        for (let ti = 1; ti < f.trail.length; ti++) {
          const ta = alpha * (ti / f.trail.length) * 0.3;
          ctx.beginPath();
          ctx.moveTo(f.trail[ti - 1].x, f.trail[ti - 1].y);
          ctx.lineTo(f.trail[ti].x, f.trail[ti].y);
          ctx.strokeStyle = `rgba(${f.color.r},${f.color.g},${f.color.b},${ta})`;
          ctx.lineWidth = f.size * 0.5;
          ctx.stroke();
        }
      }

      // Fragment shape
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rotation);

      ctx.fillStyle = `rgba(${f.color.r},${f.color.g},${f.color.b},${alpha})`;
      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.7})`;
      ctx.lineWidth = 0.5;

      if (f.shape === "triangle") {
        ctx.beginPath();
        ctx.moveTo(0, -f.size);
        ctx.lineTo(f.size * 0.87, f.size * 0.5);
        ctx.lineTo(-f.size * 0.87, f.size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (f.shape === "quad") {
        ctx.beginPath();
        ctx.rect(-f.size * 0.7, -f.size * 0.7, f.size * 1.4, f.size * 1.4);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(-f.size, 0);
        ctx.lineTo(f.size, 0);
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // Central afterglow — shrinking geometric glow
  if (t > 1 && t < 5) {
    const agAge = t - 1;
    const agProgress = agAge / 4;
    const agFade = 1 - agProgress;
    const agR = ef.size * 15 * agFade;
    if (agR > 1) {
      const ag = ctx.createRadialGradient(cx, cy, 0, cx, cy, agR);
      ag.addColorStop(0, `rgba(255,255,255,${agFade * 0.3})`);
      ag.addColorStop(0.2, `rgba(200,180,240,${agFade * 0.15})`);
      ag.addColorStop(0.5, `rgba(120,100,200,${agFade * 0.05})`);
      ag.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ag;
      ctx.beginPath();
      ctx.arc(cx, cy, agR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
```

- [ ] **Step 4: Update drawIgnition call site in renderer.ts**

In `renderer.ts`, update the `drawIgnition` call (around line 215-221) to pass geo fragments. First, add `GeoFragment` to the imports from types, then add `geoFragments` to `FrameState`:

Add to `FrameState` interface:
```ts
  geoFragments: GeoFragment[];
```

Add import at top:
```ts
import type { ..., GeoFragment } from "./types";
```

Update the drawIgnition call to pass geoFragments as last arg:
```ts
      drawIgnition(
        ctx,
        state.emergingFrags,
        state.ignitionAge,
        state.ignitionParticles,
        state.viewport,
        this.canvas,
        state.geoFragments,
      );
```

- [ ] **Step 5: Update LivingSpace.svelte to use GeoIgnitionSystem**

In `LivingSpace.svelte`:

Change import:
```ts
import {
  createGeoIgnitionSystem,
  updateGeoIgnition,
  spawnGeoIgnitionBurst,
  type GeoIgnitionSystem,
} from "$lib/canvas/systems/void-gate";
```

Change `ignitionSys` declaration:
```ts
let ignitionSys!: GeoIgnitionSystem;
```

Change initialization:
```ts
ignitionSys = createGeoIgnitionSystem();
```

Change spawn call:
```ts
spawnGeoIgnitionBurst(ignitionSys, voidEf.x, voidEf.y);
```

Change update call:
```ts
updateGeoIgnition(ignitionSys, 1 / 60);
```

Add `geoFragments` to the render state:
```ts
geoFragments: ignitionSys.geoFragments,
```

- [ ] **Step 6: Run tests**

Run: `cd Portal && npx vitest run`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add Portal/src/lib/canvas/systems/void-gate.ts Portal/src/lib/canvas/renderer.ts Portal/src/lib/components/LivingSpace.svelte
git commit -m "feat: rewrite ignition as geometric burst with polygon rings and shard debris"
```

---

### Task 7: Add star flare drawing to constellation.ts

**Files:**
- Modify: `Portal/src/lib/canvas/systems/constellation.ts`

- [ ] **Step 1: Add flare drawing helper**

Add this function before `drawFragmentStars`:

```ts
function drawStarFlare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: { r: number; g: number; b: number },
  groupArea: string,
  brightness: number,
  time: number,
) {
  const flareCfg = (cStars as Record<string, unknown>).flare as Record<string, {
    rays: number;
    angleOffset: number;
    lengthMul: number;
    widthBase: number;
    auxRays?: number;
    auxLengthMul?: number;
    lengthVar?: [number, number];
  }>;

  const cfg = flareCfg[groupArea];
  if (!cfg) return;

  const baseLen = size * cfg.lengthMul;
  const rotOffset = cfg.angleOffset + time * 0.02;

  for (let i = 0; i < cfg.rays; i++) {
    const angle = rotOffset + (i / cfg.rays) * Math.PI * 2;
    let rayLen = baseLen;

    // Diamond layout for standard group: alternating long/short
    if (cfg.lengthVar && cfg.rays === 4) {
      rayLen = size * (i % 2 === 0 ? cfg.lengthVar[1] : cfg.lengthVar[0]);
    }

    const endX = x + Math.cos(angle) * rayLen;
    const endY = y + Math.sin(angle) * rayLen;

    // Tapered ray: draw as triangle from center to tip
    const perpAngle = angle + Math.PI / 2;
    const halfW = cfg.widthBase / 2;

    ctx.beginPath();
    ctx.moveTo(x + Math.cos(perpAngle) * halfW, y + Math.sin(perpAngle) * halfW);
    ctx.lineTo(endX, endY);
    ctx.lineTo(x - Math.cos(perpAngle) * halfW, y - Math.sin(perpAngle) * halfW);
    ctx.closePath();

    // Gradient from center to tip
    const rg = ctx.createLinearGradient(x, y, endX, endY);
    rg.addColorStop(0, `rgba(${color.r},${color.g},${color.b},${brightness * 0.6})`);
    rg.addColorStop(0.5, `rgba(${color.r},${color.g},${color.b},${brightness * 0.2})`);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.fill();
  }

  // Aux rays for chain group
  if (cfg.auxRays && cfg.auxLengthMul) {
    for (let i = 0; i < cfg.auxRays; i++) {
      const baseAngle = rotOffset + (i / cfg.rays) * Math.PI * 2;
      const auxAngle = baseAngle + Math.PI / cfg.rays;
      const auxLen = size * cfg.auxLengthMul;
      const endX = x + Math.cos(auxAngle) * auxLen;
      const endY = y + Math.sin(auxAngle) * auxLen;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${brightness * 0.3})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Hex outline for seelefelix group
  if (groupArea === "seelefelix") {
    const hexR = size * 2;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = rotOffset + (i / 6) * Math.PI * 2;
      const px = x + Math.cos(a) * hexR;
      const py = y + Math.sin(a) * hexR;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${brightness * 0.15})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}
```

- [ ] **Step 2: Add flare call to drawFragmentStars**

In `drawFragmentStars`, after the existing "Core + inner point" block (the last drawing code before the function closes), add the flare call. Find the line:

```ts
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.fill();
  }
```

Change it to:

```ts
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.fill();

    // Flare shape per group
    if (ef.phase === "star" || ef.phase === "crystallizing") {
      drawStarFlare(ctx, ef.x, ef.y, cs, ef.color, ef.groupArea, eff * proxBoost, time);
    }
  }
```

- [ ] **Step 3: Run tests**

Run: `cd Portal && npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add Portal/src/lib/canvas/systems/constellation.ts
git commit -m "feat: add group-specific star flare shapes (cross, hex, trident, etc.)"
```

---

### Task 8: Add rune texture to connection lines in constellation.ts

**Files:**
- Modify: `Portal/src/lib/canvas/systems/constellation.ts`

- [ ] **Step 1: Add rune symbol drawing helper**

Add before `drawConnectionLines`:

```ts
const RUNE_SYMBOLS = ["triangle-up", "triangle-down", "dot", "cross", "square"] as const;

function drawRuneSymbol(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number,
  symbol: string,
  angle: number,
) {
  if (alpha < 0.02) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.fillStyle = `rgba(200,190,240,${alpha})`;
  ctx.strokeStyle = `rgba(200,190,240,${alpha})`;
  ctx.lineWidth = 0.5;

  const s = size;
  switch (symbol) {
    case "triangle-up":
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.87, s * 0.5);
      ctx.lineTo(-s * 0.87, s * 0.5);
      ctx.closePath();
      ctx.stroke();
      break;
    case "triangle-down":
      ctx.beginPath();
      ctx.moveTo(0, s);
      ctx.lineTo(s * 0.87, -s * 0.5);
      ctx.lineTo(-s * 0.87, -s * 0.5);
      ctx.closePath();
      ctx.stroke();
      break;
    case "dot":
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "cross":
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.lineTo(s, 0);
      ctx.moveTo(0, -s);
      ctx.lineTo(0, s);
      ctx.stroke();
      break;
    case "square":
      ctx.beginPath();
      ctx.rect(-s * 0.6, -s * 0.6, s * 1.2, s * 1.2);
      ctx.stroke();
      break;
  }
  ctx.restore();
}
```

- [ ] **Step 2: Add rune overlay to drawConnectionLines**

At the end of the `drawConnectionLines` function, after the existing `ctx.setLineDash([])` and before the closing brace of the for loop, add:

```ts
    // Rune texture overlay
    const runeCfg = (cConn as Record<string, unknown>).rune as {
      symbolSpacing: number;
      symbolSize: number;
      alpha: number;
      symbols: readonly string[];
    };

    const dx = s2.x - s1.x;
    const dy = s2.y - s1.y;
    const lineLen = Math.hypot(dx, dy);
    const lineAngle = Math.atan2(dy, dx);

    if (lineLen > runeCfg.symbolSpacing) {
      const numSymbols = Math.floor(lineLen / runeCfg.symbolSpacing);
      const dashOffset = time * (bothRead ? cConn.mainLine.dashSpeed.read : cConn.mainLine.dashSpeed.unread);
      const shiftedOffset = ((dashOffset % runeCfg.symbolSpacing) + runeCfg.symbolSpacing) % runeCfg.symbolSpacing;

      for (let si = 0; si < numSymbols; si++) {
        const baseT = (si * runeCfg.symbolSpacing + shiftedOffset) / lineLen;
        if (baseT < 0.05 || baseT > 0.95) continue;
        const sx = s1.x + dx * baseT;
        const sy = s1.y + dy * baseT;
        const sym = runeCfg.symbols[si % runeCfg.symbols.length];
        const runeAlpha = runeCfg.alpha * alpha * (bothRead ? 1 : 0.4);
        drawRuneSymbol(ctx, sx, sy, runeCfg.symbolSize, runeAlpha, sym, lineAngle);
      }
    }
```

- [ ] **Step 3: Run tests**

Run: `cd Portal && npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add Portal/src/lib/canvas/systems/constellation.ts
git commit -m "feat: add rune symbol texture overlay on connection lines"
```

---

### Task 9: Add star chart geometry to background.ts

**Files:**
- Modify: `Portal/src/lib/canvas/systems/background.ts`
- Modify: `Portal/src/lib/canvas/renderer.ts`

- [ ] **Step 1: Add drawStarChart function to background.ts**

Add at the end of `background.ts`, before the final exports:

```ts
export function drawStarChart(
  ctx: CanvasRenderingContext2D,
  time: number,
  fieldBrightness: number,
  viewport: SpaceViewport,
  canvas: HTMLCanvasElement,
): void {
  const scCfg = (theme.background as Record<string, unknown>).starChart as {
    ringCount: number;
    ringRadii: [number, number, number];
    ringAlpha: [number, number, number];
    tickCount: [number, number, number];
    rotSpeed: [number, number, number];
    connectionAlpha: number;
  };

  // Only draw post-ignition when field brightness is high enough
  if (fieldBrightness < 0.7) return;

  const alphaMul = Math.min(1, (fieldBrightness - 0.7) / 0.3);
  const cx = viewport.x;
  const cy = viewport.y;

  ctx.save();

  for (let i = 0; i < scCfg.ringCount; i++) {
    const r = scCfg.ringRadii[i];
    const alpha = scCfg.ringAlpha[i] * alphaMul;
    const ticks = scCfg.tickCount[i];
    const rot = time * scCfg.rotSpeed[i];

    if (alpha < 0.005) continue;

    // Ring circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(160,150,220,${alpha})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Tick marks
    for (let t = 0; t < ticks; t++) {
      const angle = rot + (t / ticks) * Math.PI * 2;
      const tickLen = t % 6 === 0 ? 12 : 5;
      const innerR = r - tickLen;
      const outerR = r + tickLen * 0.3;

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
      ctx.strokeStyle = `rgba(160,150,220,${alpha * 0.7})`;
      ctx.lineWidth = t % 6 === 0 ? 0.8 : 0.4;
      ctx.stroke();
    }
  }

  ctx.restore();
}
```

- [ ] **Step 2: Wire drawStarChart into renderer.ts**

In `renderer.ts`, add the import:

```ts
import {
  drawBgStars,
  drawNebulas,
  drawDusts,
  drawShootingStars,
  drawStarChart,
  updateActiveChunks,
} from "./systems/background";
```

In the `render` method, after the background drawing block (after `drawBgStars` and before the comment `// L1 Narrative`), add:

```ts
      // Star chart geometry overlay
      if (this.systems.has("meteors")) {
        drawStarChart(ctx, state.time, state.fieldBrightness, state.viewport, this.canvas);
      }
```

- [ ] **Step 3: Run tests**

Run: `cd Portal && npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add Portal/src/lib/canvas/systems/background.ts Portal/src/lib/canvas/renderer.ts
git commit -m "feat: add rotating star chart ring overlay with tick marks"
```

---

### Task 10: Visual verification and type-safety cleanup

**Files:**
- Modify: various files as needed

- [ ] **Step 1: Run full type check**

Run: `cd Portal && npm run check`
Expected: No type errors

- [ ] **Step 2: Run full test suite**

Run: `cd Portal && npm run test`
Expected: ALL PASS

- [ ] **Step 3: Fix any type errors**

If the type checker reports issues with the `as Record<string, unknown>` casts used to access new theme params, add proper type declarations. The cleanest approach: add interface types for the new configs and cast `theme` accordingly in each file, or access the params through properly typed local constants.

- [ ] **Step 4: Start dev server and visually verify**

Run: `cd Portal && npm run dev`

Open browser and verify:
1. Pre-ignition: rift tear visible with edge glow and breath animation
2. Fissure: expanding multi-line tear with bright core
3. Ignition: geometric ray burst + polygon rings + geometric debris
4. Post-ignition: rift scar with orbiting shards
5. Stars: different flare shapes per group (cross, hex, trident, etc.)
6. Connections: faint rune symbols moving along lines
7. Background: rotating star chart rings with tick marks

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address type errors and visual tuning from verification"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- Void Gate rift: Task 3 (drawRift), Task 4 (drawFissure), Task 5 (drawRiftScar) ✓
- Star flare differentiation: Task 7 ✓
- Ritual ignition explosion: Task 6 ✓
- Background geometry: Task 9 ✓
- Rune textures: Task 8 ✓

**2. Placeholder scan:** No TBDs, TODOs, or "implement later" found. All steps contain complete code.

**3. Type consistency:**
- `GeoFragment` and `RiftParticle` defined in Task 1, imported in Task 6
- `GeoIgnitionSystem` defined in Task 6, extends `IgnitionSystem` from same file
- `drawIgnition` signature extended with optional `geoFragments` param (backward compatible)
- Theme params accessed via `as Record<string, unknown>` casts — Task 10 includes cleanup
- All function names consistent across definition and call sites
