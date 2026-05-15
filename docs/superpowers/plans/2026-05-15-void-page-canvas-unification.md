# Void Page Canvas Unification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete StarBackground.svelte and Constellation.svelte; void page renders through same CanvasRenderer as main page.

**Architecture:** Add `drawAgentStar`/`drawAgentConnection` primitives that handle the `Star`/`ConstellationLine` types from visualStore. Add `ambient` mode to CanvasRenderer so the void page gets background + dynamic constellation overlay from one renderer. The void page keeps its own RAF loop (it needs mouse tracking and visualStore subscription) but delegates all draw calls to the renderer.

**Tech Stack:** TypeScript, Svelte 5, Canvas 2D, Vitest

---

### Task 1: Add drawAgentStar and drawAgentConnection primitives

**Files:**
- Modify: `Portal/src/lib/canvas/primitives/stars.ts`
- Modify: `Portal/src/lib/canvas/primitives/connections.ts`
- Test: `Portal/src/lib/canvas/__tests__/agent-stars.test.ts`

The void page's `Constellation.svelte` draws `Star` objects from visualStore. These have a simpler shape than `EmergingFrag`: just `{id, x, y, size, brightness, twinkleSpeed, fragmentId}`, no phases/groups/colors. We need drawing primitives that work with this type.

- [ ] **Step 1: Write the failing test**

Create `Portal/src/lib/canvas/__tests__/agent-stars.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";

interface MockCall { method: string; args: unknown[] }

class MockCtx {
  calls: MockCall[] = [];
  _strokeStyle: string = "";
  _lineWidth: number = 1;
  _fillStyle: string = "";

  save() { this.calls.push({ method: "save", args: [] }); }
  restore() { this.calls.push({ method: "restore", args: [] }); }
  beginPath() { this.calls.push({ method: "beginPath", args: [] }); }
  moveTo(x: number, y: number) { this.calls.push({ method: "moveTo", args: [x, y] }); }
  lineTo(x: number, y: number) { this.calls.push({ method: "lineTo", args: [x, y] }); }
  arc(x: number, y: number, r: number, s: number, e: number) { this.calls.push({ method: "arc", args: [x, y, r, s, e] }); }
  stroke() { this.calls.push({ method: "stroke", args: [] }); }
  fill() { this.calls.push({ method: "fill", args: [] }); }
  createRadialGradient() { this.calls.push({ method: "createRadialGradient", args: [] }); return { addColorStop: () => {} }; }
  createLinearGradient() { this.calls.push({ method: "createLinearGradient", args: [] }); return { addColorStop: () => {} }; }
  set strokeStyle(v: string) { this._strokeStyle = v; }
  set lineWidth(v: number) { this._lineWidth = v; }
  set fillStyle(v: string) { this._fillStyle = v; }
  setLineDash(d: number[]) { this.calls.push({ method: "setLineDash", args: [d] }); }
  set lineDashOffset(v: number) { this.calls.push({ method: "setLineDashOffset", args: [v] }); }
}

describe("drawAgentStar", () => {
  let ctx: MockCtx;
  beforeEach(() => { ctx = new MockCtx(); });

  it("draws halo layers and core for a visible star", async () => {
    const { drawAgentStar } = await import("../primitives/stars");
    const star = { id: "s1", x: 400, y: 300, size: 3, brightness: 0.8, twinkleSpeed: 1.5, createdAt: Date.now() };
    drawAgentStar(ctx as unknown as CanvasRenderingContext2D, star, 10, false, false);
    const arcCalls = ctx.calls.filter(c => c.method === "arc");
    const fillCalls = ctx.calls.filter(c => c.method === "fill");
    expect(arcCalls.length).toBeGreaterThanOrEqual(3); // halo layers + core
    expect(fillCalls.length).toBeGreaterThanOrEqual(3);
  });

  it("draws selection ring when selected", async () => {
    const { drawAgentStar } = await import("../primitives/stars");
    const star = { id: "s1", x: 400, y: 300, size: 3, brightness: 0.8, twinkleSpeed: 1.5, createdAt: Date.now() };
    drawAgentStar(ctx as unknown as CanvasRenderingContext2D, star, 10, true, false);
    const strokeCalls = ctx.calls.filter(c => c.method === "stroke");
    expect(strokeCalls.length).toBeGreaterThanOrEqual(1); // selection ring
  });

  it("uses entrance animation for recently created stars", async () => {
    const { drawAgentStar } = await import("../primitives/stars");
    const star = { id: "s1", x: 400, y: 300, size: 1, brightness: 0.3, twinkleSpeed: 1.5, createdAt: Date.now() };
    drawAgentStar(ctx as unknown as CanvasRenderingContext2D, star, star.createdAt / 1000 + 0.5, false, false);
    const arcCalls = ctx.calls.filter(c => c.method === "arc");
    // newly created star should still render
    expect(arcCalls.length).toBeGreaterThan(0);
  });
});

describe("drawAgentConnection", () => {
  let ctx: MockCtx;
  beforeEach(() => { ctx = new MockCtx(); });

  it("draws gradient line between two stars", async () => {
    const { drawAgentConnection } = await import("../primitives/connections");
    const s1 = { id: "s1", x: 100, y: 100, size: 3, brightness: 0.8, twinkleSpeed: 1.5, createdAt: Date.now() };
    const s2 = { id: "s2", x: 400, y: 300, size: 3, brightness: 0.8, twinkleSpeed: 1.5, createdAt: Date.now() };
    drawAgentConnection(ctx as unknown as CanvasRenderingContext2D, s1, s2, 0.6, 10);
    const strokeCalls = ctx.calls.filter(c => c.method === "stroke");
    expect(strokeCalls.length).toBeGreaterThanOrEqual(2); // glow + dashed main
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/canvas/__tests__/agent-stars.test.ts`
Expected: FAIL — "drawAgentStar is not a function" / "drawAgentConnection is not a function"

- [ ] **Step 3: Write minimal implementation**

Add to `Portal/src/lib/canvas/primitives/stars.ts`:

```ts
import type { Star } from "$lib/types/agent";

export function drawAgentStar(
  ctx: CanvasRenderingContext2D,
  star: Star,
  time: number,
  selected: boolean,
  hovered: boolean,
) {
  const age = time - star.createdAt / 1000;
  const entranceScale = Math.min(1, age / 0.8);
  const ease = 1 - Math.pow(1 - entranceScale, 3);
  const cs = star.size * ease;
  if (cs < 0.01) return;

  const twinkle = Math.sin(time * star.twinkleSpeed) * 0.08;
  const bright = star.brightness + twinkle + (hovered ? 0.15 : 0);

  // Outer halo
  const oR = cs * 8;
  const og = ctx.createRadialGradient(star.x, star.y, cs * 2, star.x, star.y, oR);
  og.addColorStop(0, `rgba(180,130,255,${bright * 0.08})`);
  og.addColorStop(0.5, `rgba(139,92,246,${bright * 0.03})`);
  og.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  ctx.arc(star.x, star.y, oR, 0, Math.PI * 2);
  ctx.fillStyle = og;
  ctx.fill();

  // Mid halo
  const mR = cs * 4;
  const mg = ctx.createRadialGradient(star.x, star.y, cs, star.x, star.y, mR);
  mg.addColorStop(0, `rgba(200,160,255,${bright * 0.5})`);
  mg.addColorStop(0.5, `rgba(139,92,246,${bright * 0.12})`);
  mg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  ctx.arc(star.x, star.y, mR, 0, Math.PI * 2);
  ctx.fillStyle = mg;
  ctx.fill();

  // Selection ring
  if (selected) {
    ctx.beginPath();
    ctx.arc(star.x, star.y, mR + 3, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,220,150,0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Core
  ctx.beginPath();
  ctx.arc(star.x, star.y, cs, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${bright})`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(star.x, star.y, cs * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.fill();
}
```

Add to `Portal/src/lib/canvas/primitives/connections.ts`:

```ts
import type { Star } from "$lib/types/agent";

export function drawAgentConnection(
  ctx: CanvasRenderingContext2D,
  s1: Star,
  s2: Star,
  opacity: number,
  time: number,
) {
  const alpha = opacity;
  const pulse = 0.7 + 0.15 * Math.sin(time * 0.8);

  // Outer glow
  ctx.beginPath();
  ctx.moveTo(s1.x, s1.y);
  ctx.lineTo(s2.x, s2.y);
  ctx.strokeStyle = `rgba(139,92,246,${alpha * 0.25 * pulse})`;
  ctx.lineWidth = 8;
  ctx.stroke();

  // Dashed line with pink-purple gradient
  const g = ctx.createLinearGradient(s1.x, s1.y, s2.x, s2.y);
  g.addColorStop(0, `rgba(139,92,246,${alpha * pulse})`);
  g.addColorStop(0.5, `rgba(236,72,153,${alpha * 0.6 * pulse})`);
  g.addColorStop(1, `rgba(59,130,246,${alpha * pulse})`);
  ctx.beginPath();
  ctx.moveTo(s1.x, s1.y);
  ctx.lineTo(s2.x, s2.y);
  ctx.strokeStyle = g;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 12]);
  ctx.lineDashOffset = -time * 20;
  ctx.stroke();
  ctx.setLineDash([]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/canvas/__tests__/agent-stars.test.ts`
Expected: PASS — 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add Portal/src/lib/canvas/primitives/stars.ts Portal/src/lib/canvas/primitives/connections.ts Portal/src/lib/canvas/__tests__/agent-stars.test.ts
git commit -m "feat: add drawAgentStar and drawAgentConnection primitives for void page stars"
```

---

### Task 2: Add ambient mode to CanvasRenderer

**Files:**
- Modify: `Portal/src/lib/canvas/renderer.ts`

CanvasRenderer currently only has `render(state: FrameState, ripple?)` which expects the full Living Space state. Ambient mode needs a simpler interface.

- [ ] **Step 1: Add AmbientFrameState type and renderAmbient method**

The ambient renderer manages its own background (chunks, nebulas, etc.) and accepts dynamic stars/lines from the void page.

```ts
import type { Star, ConstellationLine } from "$lib/types/agent";

export interface AmbientFrameState {
  time: number;
  fieldBrightness: number;
  mouseX: number;
  mouseY: number;
  stars: Star[];
  lines: ConstellationLine[];
  selectedStarId: string | null;
  viewport: { x: number; y: number; zoom: number };
}
```

Add to CanvasRenderer class:

```ts
// ── Ambient mode state ──
private ambientChunks = new Map<string, Chunk>();
private ambientActiveChunks: string[] = [];
private ambientNebulas: Nebula[] = [];
private ambientDust: DustParticle[] = [];
private ambientInitialized = false;

private initAmbient() {
  // create simple nebulas (screen space)
  this.ambientNebulas = [];
  const colors = theme.background.nebulaColors;
  for (let i = 0; i < 6; i++) {
    this.ambientNebulas.push({
      bx: Math.random() * 1920, by: Math.random() * 1080,
      radius: 250 + Math.random() * 400,
      opacity: 0.015 + Math.random() * 0.03,
      color: colors[i % colors.length],
      speed: 0.008 + Math.random() * 0.015,
      phase: Math.random() * Math.PI * 2,
      seed: Math.random() * 1000,
    });
  }
  // init chunks
  this.ambientActiveChunks = updateActiveChunks(
    this.canvas,
    { x: 0, y: 0, zoom: 1, targetX: 0, targetY: 0, targetZoom: 1 },
    theme.background.chunkSize,
    this.ambientChunks,
    [],
  );
  this.ambientInitialized = true;
}

renderAmbient(state: AmbientFrameState) {
  const ctx = this.ctx;
  if (!ctx) return;
  if (!this.ambientInitialized) this.initAmbient();

  const { width, height } = this.canvas;

  // Clear
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = theme.canvas.bg;
  ctx.fillRect(0, 0, width, height);

  // Chunk update (lazy)
  this.ambientActiveChunks = updateActiveChunks(
    this.canvas, state.viewport, theme.background.chunkSize,
    this.ambientChunks, this.ambientActiveChunks,
  );

  // World transform
  ctx.save();
  const cx = width / 2, cy = height / 2;
  ctx.translate(cx, cy);
  ctx.scale(state.viewport.zoom, state.viewport.zoom);
  ctx.translate(-state.viewport.x, -state.viewport.y);

  // Nebulas + dust + background stars
  drawNebulas(ctx, state.time, state.fieldBrightness, this.ambientNebulas, state.viewport, this.canvas);
  drawDusts(ctx, state.time, this.ambientActiveChunks, this.ambientChunks, theme.background.chunkSize);
  drawBgStars(ctx, state.time, state.fieldBrightness, 5, 1, 0, [], this.ambientActiveChunks, this.ambientChunks, state.viewport, this.canvas);

  // Agent lines
  for (const line of state.lines) {
    const s1 = state.stars.find(s => s.id === line.star1Id);
    const s2 = state.stars.find(s => s.id === line.star2Id);
    if (!s1 || !s2) continue;
    drawAgentConnection(ctx, s1, s2, line.opacity, state.time);
  }

  // Agent stars
  for (const star of state.stars) {
    drawAgentStar(ctx, star, state.time, star.id === state.selectedStarId, false);
  }

  ctx.restore();

  // Vignette
  drawVignette(ctx, width, height);
}
```

- [ ] **Step 2: Type check and run tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: zero errors, all tests pass

- [ ] **Step 3: Commit**

```bash
git add Portal/src/lib/canvas/renderer.ts
git commit -m "feat: add ambient mode to CanvasRenderer for void page"
```

---

### Task 3: Refactor void page to use CanvasRenderer

**Files:**
- Modify: `Portal/src/routes/void/+page.svelte`

Replace StarBackground + Constellation with a single CanvasRenderer in ambient mode.

- [ ] **Step 1: Replace the template**

Current template (conceptual):
```svelte
<StarBackground />
<Constellation onstarclick={...} />
```

New template:
```svelte
<canvas bind:this={canvas} class="fixed inset-0 w-full h-full" />
```

- [ ] **Step 2: Replace the script imports and logic**

Remove:
```ts
import { StarBackground, Constellation, ... } from "$lib/components";
```

Add:
```ts
import { CanvasRenderer, type AmbientFrameState } from "$lib/canvas/renderer";
import { drawAgentStar, drawAgentConnection } from "$lib/canvas/primitives/stars";
// ... connections imported separately
```

In onMount, create renderer and start RAF loop that calls `renderer.renderAmbient()`:

```ts
let renderer: CanvasRenderer;
let canvas: HTMLCanvasElement;
let mouseX = 0, mouseY = 0;

onMount(() => {
  renderer = new CanvasRenderer(canvas, { mode: "ambient", systems: ["background", "constellation"] });

  function animate() {
    const time = Date.now() * 0.001;
    const state: AmbientFrameState = {
      time,
      fieldBrightness: 1.0,
      mouseX, mouseY,
      stars: currentVisualState.stars,
      lines: currentVisualState.lines,
      selectedStarId,
      viewport: { x: 0, y: 0, zoom: 1, targetX: 0, targetY: 0, targetZoom: 1 },
    };
    renderer.renderAmbient(state);
    animationFrameId = requestAnimationFrame(animate);
  }
  animate();
});
```

Keep click handling in the void page (hit detection on agent stars, fires onstarclick).

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add Portal/src/routes/void/+page.svelte
git commit -m "refactor: void page uses CanvasRenderer ambient mode"
```

---

### Task 4: Delete StarBackground.svelte and Constellation.svelte

**Files:**
- Delete: `Portal/src/lib/components/StarBackground.svelte`
- Delete: `Portal/src/lib/components/Constellation.svelte`
- Modify: `Portal/src/lib/components/index.ts` (if it re-exports them)

- [ ] **Step 1: Delete the files**

```bash
rm Portal/src/lib/components/StarBackground.svelte
rm Portal/src/lib/components/Constellation.svelte
```

- [ ] **Step 2: Remove from barrel export**

Check if `index.ts` exports these components and remove those lines.

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: zero errors (no remaining imports of the deleted files)

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: delete StarBackground and Constellation, fully migrated to CanvasRenderer"
```

---

### Task 5: Port living-space modules to canvas/systems/ and delete living-space/

**Files:**
- Move: `Portal/src/lib/components/living-space/background.ts` → `Portal/src/lib/canvas/systems/background.ts`
- Move: `Portal/src/lib/components/living-space/constellation.ts` → `Portal/src/lib/canvas/systems/constellation.ts`
- Move: `Portal/src/lib/components/living-space/void-gate.ts` → `Portal/src/lib/canvas/systems/void-gate.ts`
- Move: `Portal/src/lib/components/living-space/whispers.ts` → `Portal/src/lib/canvas/systems/whispers.ts`
- Move: `Portal/src/lib/components/living-space/render-utils.ts` → `Portal/src/lib/canvas/primitives/atmosphere.ts` (merge)
- Move: `Portal/src/lib/components/living-space/camera.ts` → `Portal/src/lib/canvas/systems/camera.ts`
- Move: `Portal/src/lib/components/living-space/input.ts` → `Portal/src/lib/canvas/systems/input.ts`
- Move: `Portal/src/lib/components/living-space/resonance.ts` → `Portal/src/lib/canvas/systems/resonance.ts`
- Move: `Portal/src/lib/components/living-space/types.ts` → `Portal/src/lib/canvas/types.ts`
- Delete: `Portal/src/lib/components/living-space/` (entire directory)
- Modify: All imports in CanvasRenderer, LivingSpace.svelte, and systems to use new paths

- [ ] **Step 1: Create canvas/systems/ directory and move files**

```bash
mkdir -p Portal/src/lib/canvas/systems
cp Portal/src/lib/components/living-space/background.ts Portal/src/lib/canvas/systems/background.ts
cp Portal/src/lib/components/living-space/constellation.ts Portal/src/lib/canvas/systems/constellation.ts
cp Portal/src/lib/components/living-space/void-gate.ts Portal/src/lib/canvas/systems/void-gate.ts
cp Portal/src/lib/components/living-space/whispers.ts Portal/src/lib/canvas/systems/whispers.ts
cp Portal/src/lib/components/living-space/camera.ts Portal/src/lib/canvas/systems/camera.ts
cp Portal/src/lib/components/living-space/input.ts Portal/src/lib/canvas/systems/input.ts
cp Portal/src/lib/components/living-space/resonance.ts Portal/src/lib/canvas/systems/resonance.ts
cp Portal/src/lib/components/living-space/types.ts Portal/src/lib/canvas/types.ts
```

- [ ] **Step 2: Update imports in moved files**

In each moved file, update relative imports to point to new locations:
- `./types` → `../types`
- `./render-utils` → `../primitives/atmosphere` (or import directly from theme for easeInOutQuad)
- `$lib/canvas/theme` stays the same
- `./camera` → `./camera` (same directory, no change)

- [ ] **Step 3: Update imports in CanvasRenderer and LivingSpace.svelte**

In `canvas/renderer.ts`:
```
- from "../components/living-space/background" → from "../systems/background"
- from "../components/living-space/constellation" → from "../systems/constellation"
- from "../components/living-space/void-gate" → from "../systems/void-gate"
- from "../components/living-space/whispers" → from "../systems/whispers"
- from "../components/living-space/render-utils" → from "../primitives/atmosphere"
- from "../components/living-space/types" → from "../types"
```

In `LivingSpace.svelte`:
```
- from "./living-space/..." → from "$lib/canvas/systems/..."
```

- [ ] **Step 4: Remove render-utils.ts duplicate logic**

`render-utils.ts` has `drawVignette`, `drawClickRipple`, `easeInOutQuad`. These already exist in `canvas/primitives/atmosphere.ts` and `canvas/theme.ts`. Remove `render-utils.ts` after updating all imports. `easeInOutQuad` is already exported from `theme.ts`. `drawVignette` is already in `atmosphere.ts`.

- [ ] **Step 5: Delete living-space directory**

```bash
rm -rf Portal/src/lib/components/living-space
```

- [ ] **Step 6: Type check and run all tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: zero errors, all tests pass

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: port living-space modules to canvas/systems, delete living-space/"
```

---

### Task 6: End-to-end verification

- [ ] **Step 1: Dev server renders both pages**

Run: `npm run dev`
Check: http://localhost:5173/ — Living Space page renders constellation + background
Check: http://localhost:5173/void — Void page renders background + dynamic stars

- [ ] **Step 2: Type check and tests final pass**

Run: `npx tsc --noEmit && npx vitest run`
Expected: zero errors, all tests pass

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: final verification after void page unification"
```
