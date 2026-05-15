# Step 3: Apply Visual Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the page visually different by implementing ALL remaining items from the design spec at `docs/superpowers/specs/2026-05-15-canvas-visual-redesign-design.md`.

**Architecture:** The infrastructure is already built — `getHierarchyConfig()` exists in `primitives/stars.ts`, `AnimationTimeline` exists in `timeline.ts`, theme params are centralized. The work is wiring these into the rendering code in `systems/constellation.ts`, `systems/void-gate.ts`, `systems/background.ts`, and `primitives/connections.ts`.

**Tech Stack:** TypeScript, Canvas 2D, Vitest

**Prerequisite spec:** `docs/superpowers/specs/2026-05-15-canvas-visual-redesign-design.md`

---

### Already Done (Steps 1-2, partial Step 3)

| Item | Status |
|---|---|
| theme.ts — all visual params centralized | ✅ |
| timeline.ts — AnimationTimeline class | ✅ |
| CanvasRenderer — unified render pipeline | ✅ |
| Both pages use CanvasRenderer | ✅ |
| StarBackground.svelte / Constellation.svelte deleted | ✅ |
| living-space/ ported to canvas/systems/ | ✅ |
| app.css unified bg, wildcard transition removed | ✅ |
| Vignette edge alpha 0.70 → 0.85 | ✅ |
| Pulse amplitudes reduced (breath/twinkle/connection) | ✅ |
| applyAtmosphericPerspective() exists and used in background.ts | ✅ |
| Bidirectional energy dots preserved | ✅ |
| getHierarchyConfig() defined in primitives/stars.ts | ✅ |
| AnimationTimeline phase-aware getters exist | ✅ |

### Remaining (ALL of the below)

| # | Item | Where |
|---|---|---|
| 1 | Wire L0-L3 hierarchy into fragment star rendering | `systems/constellation.ts` drawFragmentStars |
| 2 | Boost Void Gate to L0 focal prominence | `systems/void-gate.ts` drawRing |
| 3 | Dim background stars to L3 atmosphere tier | `systems/background.ts` drawBgStars |
| 4 | Wire energy dot direction per phase (intro=outward, explore=bidirectional) | `primitives/connections.ts` drawEnergyDots, `systems/constellation.ts` createEDots |
| 5 | Wire connection pulse per phase | `primitives/connections.ts` drawConnectionLine |
| 6 | Wire star breath per phase | `systems/constellation.ts` drawFragmentStars |
| 7 | Fragment star depth parallax offset | `systems/constellation.ts` generateEmergingFrags |
| 8 | Remove dead code (unused HierarchyConfig if still dead after wiring) | `primitives/stars.ts` |

---

### Task 1: Wire L0-L3 hierarchy into drawFragmentStars

**Files:**
- Modify: `Portal/src/lib/canvas/systems/constellation.ts`
- Test: existing `visual-redesign.test.ts`

**What changes:** Each fragment star's rendering (glow radius, bloom alpha, core brightness) is currently identical for all stars. After this task, read stars (L1) are brighter with larger halos, unread stars (L2) are dimmer with a pulsing ring, and the unread ring only appears on L2 stars.

- [ ] **Step 1: Add import and determine tier per star**

In `systems/constellation.ts`, add import at top:

```ts
import { getHierarchyConfig, type HierarchyTier } from "../primitives/stars";
```

In the `drawFragmentStars` function, inside the per-star `for` loop, after the `crystalScale` check (`if (crystalScale < 0.01) continue;`), add tier determination:

```ts
const tier: HierarchyTier = ef.read && ef.phase === "star" ? "l1"
  : !ef.read && ef.phase === "star" ? "l2"
  : "l3";
const hc = getHierarchyConfig(tier);
```

- [ ] **Step 2: Replace hardcoded halo multipliers with hierarchy-driven values**

Current code uses `halo.superOuterBloom` (14), `halo.outerHalo` (8), `halo.midHalo` (4), `halo.innerGlow` (2.5) for all stars.

Replace with hierarchy-scaled values. The theme halo values become the L1 (default) baseline, and other tiers scale relative to them:

Current super-outer bloom:
```ts
const soR = cs * halo.superOuterBloom;
const sog = ctx.createRadialGradient(ef.x, ef.y, cs * 5, ef.x, ef.y, soR);
sog.addColorStop(0, `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.02 * proxBoost})`);
```

Replace with:
```ts
const soR = cs * halo.superOuterBloom * (hc.glowRadiusMul / 8); // 8 is L1 baseline
const sog = ctx.createRadialGradient(ef.x, ef.y, cs * 5, ef.x, ef.y, soR);
sog.addColorStop(0, `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * hc.bloomAlpha * proxBoost})`);
```

Apply same pattern to outer halo, mid halo, inner glow:

Outer halo — replace `eff * 0.08` with `eff * 0.08 * (hc.coreAlpha / 0.85)`, replace `oR = cs * halo.outerHalo` with `oR = cs * halo.outerHalo * (hc.glowRadiusMul / 8)`.

Mid halo — replace `eff * 0.5` with `eff * 0.5 * (hc.coreAlpha / 0.85)`.

Inner glow — replace `eff * 0.65` with `eff * 0.65 * (hc.coreAlpha / 0.85)`.

Core — replace `rgba(255,255,255,${eff})` with `rgba(255,255,255,${eff * hc.coreAlpha})`.

- [ ] **Step 3: Use hierarchy for unread ring visibility**

Replace:
```ts
if (!ef.read && ef.phase === "star") {
```

With:
```ts
if (hc.showUnreadRing && !ef.read && ef.phase === "star") {
```

- [ ] **Step 4: Type check and run tests**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: zero type errors. Update any test expectations that hardcode specific halo counts.

- [ ] **Step 5: Visually verify**

```bash
npx vite dev
```

Open http://localhost:5173/ — read stars should be visibly brighter with larger halos than unread stars. Unread stars should show a pulsing ring.

- [ ] **Step 6: Commit**

```bash
git add Portal/src/lib/canvas/systems/constellation.ts
git commit -m "feat: wire L0-L3 visual hierarchy into fragment star rendering"
```

---

### Task 2: Boost Void Gate to L0 focal prominence

**Files:**
- Modify: `Portal/src/lib/canvas/systems/void-gate.ts` (the `drawRing` function)

L0 is the highest visual tier — the Void Gate must dominate the scene. Currently it's rendered with moderate opacities and a dark core. Boost everything.

- [ ] **Step 1: Increase ring fragment brightness**

In `drawRing`, find `const a = fragBrightness * 0.7 * pulseBoost;` → change to `const a = fragBrightness * 1.1 * pulseBoost;`

- [ ] **Step 2: Add bright center point inside dark core**

After the dark core radial gradient block (the `coreGrad` section ending with `ctx.fill()`), add:

```ts
// L0 bright center
const brightCore = ctx.createRadialGradient(0, 0, 0, 0, 0, cs * 0.8 * pulseBoost);
brightCore.addColorStop(0, `rgba(255,255,255,${0.6 * pulseBoost})`);
brightCore.addColorStop(0.5, `rgba(200,180,255,${0.2 * pulseBoost})`);
brightCore.addColorStop(1, "rgba(0,0,0,0)");
ctx.fillStyle = brightCore;
ctx.beginPath();
ctx.arc(0, 0, cs * 0.8 * pulseBoost, 0, Math.PI * 2);
ctx.fill();
```

- [ ] **Step 3: Enlarge and brighten orbital dots**

Change `const dotA = 0.5 + breathCycle * 0.2;` → `const dotA = 0.8 + breathCycle * 0.3;`

Change `ctx.arc(dotX, dotY, cs * 0.8, ...)` → `ctx.arc(dotX, dotY, cs * 1.2, ...)`

- [ ] **Step 4: Strengthen proximity glow**

Change `prox * 0.06` → `prox * 0.12` in the proximity glow radial gradient.

- [ ] **Step 5: Type check and visually verify**

```bash
npx tsc --noEmit && npx vitest run
```

Open http://localhost:5173/ — Void Gate should be the most visually dominant element, with a bright center, larger orbital dots, and a stronger glow.

- [ ] **Step 6: Commit**

```bash
git add Portal/src/lib/canvas/systems/void-gate.ts
git commit -m "feat: boost Void Gate to L0 focal prominence"
```

---

### Task 3: Dim background stars to L3 atmosphere tier

**Files:**
- Modify: `Portal/src/lib/canvas/systems/background.ts` (the `drawBgStars` function)

L3 is the quietest tier — background stars should be atmospheric, not competing for attention. Reduce twinkle range and halo opacities.

- [ ] **Step 1: Reduce twinkle range for all star types**

In `drawBgStars`, find the baseRange calculation. Change:
```ts
const baseRange = s.type === "dust" ? 0.15 : s.type === "beacon" ? 0.35 : 0.3;
```
To:
```ts
const baseRange = s.type === "dust" ? 0.10 : s.type === "beacon" ? 0.25 : 0.20;
```

- [ ] **Step 2: Reduce beacon star outer glow halo alpha**

In the beacon rendering section (`} else {`), find `a * 0.15` in the outer glow radial gradient. Change to `a * 0.10`.

- [ ] **Step 3: Reduce field star outer glow alpha**

In the field star section, find `a * 0.04` in the glow arc. Change to `a * 0.02`.

- [ ] **Step 4: Type check and visually verify**

```bash
npx tsc --noEmit
```

Open http://localhost:5173/ — background stars should be noticeably quieter. Fragment stars (L1/L2) and the Void Gate (L0) should clearly stand out.

- [ ] **Step 5: Commit**

```bash
git add Portal/src/lib/canvas/systems/background.ts
git commit -m "feat: dim background stars to L3 atmosphere tier"
```

---

### Task 4: Wire energy dot direction per timeline phase

**Files:**
- Modify: `Portal/src/lib/canvas/systems/constellation.ts` (`createEDots` function)
- Modify: `Portal/src/lib/canvas/primitives/connections.ts` (`drawEnergyDots` function)

Per the spec: intro phase = all dots flow outward from void-entry. Explore phase = bidirectional. Revelation phase = accelerate and converge.

The `AnimationTimeline` already has `getEnergyDotDirection(phase, index)` and `getEnergyDotSpeedMul(phase)`. Wire them in.

- [ ] **Step 1: Import timeline functions in constellation.ts**

```ts
import { getEnergyDotDirection, getEnergyDotSpeedMul } from "../timeline";
```

- [ ] **Step 2: Modify createEDots to accept phase**

Change `createEDots(connData: ConnData[]): EDot[]` to `createEDots(connData: ConnData[], phase: string = "explore"): EDot[]`.

Inside the per-dot loop, replace:
```ts
const direction = j % 2 === 0 ? 1 : -1;
```
With:
```ts
const direction = getEnergyDotDirection(phase as TimelinePhase, j);
```
Also multiply `baseSpeed` by `getEnergyDotSpeedMul(phase as TimelinePhase)`.

- [ ] **Step 3: Pass phase from LivingSpace.svelte**

In `Portal/src/lib/components/LivingSpace.svelte`, find where `createEDots` is called (in onMount). Add phase tracking and pass it.

- [ ] **Step 4: Update drawEnergyDots pulse frequency by phase**

In `primitives/connections.ts` `drawEnergyDots`, import `getEnergyDotSpeedMul` from timeline. The pulse and speed are already constants — they just need to read from timeline. Skip for now if this requires passing phase through too many layers — the direction change in createEDots is the visible win.

- [ ] **Step 5: Type check and visually verify**

```bash
npx tsc --noEmit && npx vitest run
```

Open http://localhost:5173/ — during the intro sequence, energy dots should all flow outward from void-entry. After the cinematic settles, they go bidirectional.

- [ ] **Step 6: Commit**

```bash
git add Portal/src/lib/canvas/systems/constellation.ts Portal/src/lib/canvas/primitives/connections.ts Portal/src/lib/components/LivingSpace.svelte
git commit -m "feat: wire energy dot direction and speed to timeline phase"
```

---

### Task 5: Wire connection pulse and star breath to timeline phase

**Files:**
- Modify: `Portal/src/lib/canvas/primitives/connections.ts` (`drawConnectionLine`)
- Modify: `Portal/src/lib/canvas/systems/constellation.ts` (`drawFragmentStars`)

The AnimationTimeline has `getConnectionPulseMul(phase)` and `getStarBreathMul(phase)`. Wire them to scale the existing pulse/breath amplitudes.

- [ ] **Step 1: In drawConnectionLine, scale pulse by phase**

In `primitives/connections.ts`, import `getConnectionPulseMul` from timeline. The pulse is `0.7 + cConn.pulseAmp * Math.sin(...)`. Multiply `cConn.pulseAmp` by `getConnectionPulseMul(phase)`.

Add `phase: string = "explore"` parameter to `drawConnectionLine`.

- [ ] **Step 2: In drawFragmentStars, scale breath by phase**

In `systems/constellation.ts`, import `getStarBreathMul` from timeline. The breath is `1 + Math.sin(...) * cStars.breathAmp`. Multiply `cStars.breathAmp` by `getStarBreathMul(phase)`.

Add `phase: string = "explore"` parameter to `drawFragmentStars`.

- [ ] **Step 3: Pass phase through CanvasRenderer.render()**

In `renderer.ts`, accept an optional `phase` in `FrameState` and pass it to `drawConnectionLines` and `drawFragmentStars`.

- [ ] **Step 4: Type check and visually verify**

```bash
npx tsc --noEmit && npx vitest run
```

Open http://localhost:5173/ — during intro, connections pulse less, stars breathe less. During explore, full animation.

- [ ] **Step 5: Commit**

```bash
git add Portal/src/lib/canvas/primitives/connections.ts Portal/src/lib/canvas/systems/constellation.ts Portal/src/lib/canvas/renderer.ts
git commit -m "feat: wire connection pulse and star breath to timeline phase"
```

---

### Task 6: Fragment star depth parallax offset

**Files:**
- Modify: `Portal/src/lib/canvas/systems/constellation.ts` (`generateEmergingFrags`)

Each fragment star gets a subtle depth value that affects its parallax movement relative to the background, creating a sense of spatial layering.

- [ ] **Step 1: Add zDepth to EmergingFrag type**

In `Portal/src/lib/canvas/types.ts`, add `zDepth?: number;` to the `EmergingFrag` interface. Default value 0 (same plane as background).

- [ ] **Step 2: Assign random zDepth when creating fragments**

In `generateEmergingFrags`, after assigning `size` and `brightness`, add:

```ts
zDepth: 0.3 + Math.random() * 0.7, // 0.3-1.0 depth range
```

- [ ] **Step 3: Apply parallax offset in LivingSpace.svelte camera transform**

In `LivingSpace.svelte`, when computing screen position for each fragment star, offset by `ef.zDepth * parallaxOffset` where parallaxOffset is derived from camera pan. Skip if this requires significant camera refactoring — the zDepth value alone is useful for future use.

- [ ] **Step 4: Type check and commit**

```bash
npx tsc --noEmit && npx vitest run
git add Portal/src/lib/canvas/types.ts Portal/src/lib/canvas/systems/constellation.ts
git commit -m "feat: add zDepth to fragment stars for spatial layering"
```

---

### Task 7: Remove dead code

**Files:**
- Modify: `Portal/src/lib/canvas/primitives/stars.ts`

After Tasks 1-6 are complete, if `getHierarchyConfig` is now used by rendering code, mark it as active. If any unused exports remain from the refactoring, remove them.

- [ ] **Step 1: Check for unused exports**

```bash
grep -rn "getHierarchyConfig" Portal/src/lib/canvas/
```

Confirm it is now imported and used by `systems/constellation.ts`.

- [ ] **Step 2: Remove the `bgDeep` theme property if unused**

```bash
grep -rn "bgDeep" Portal/src/lib/canvas/ Portal/src/lib/components/ Portal/src/routes/
```

If only defined in theme.ts but never read, remove it.

- [ ] **Step 3: Type check, run all tests, commit**

```bash
npx tsc --noEmit && npx vitest run
git add -A && git commit -m "chore: remove dead code after visual redesign"
```
