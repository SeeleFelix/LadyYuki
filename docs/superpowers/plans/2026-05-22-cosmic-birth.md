# Cosmic Birth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign void gate as cosmic birth event. Stars are protagonist, void shader is origin point. Three acts with proper pacing.

**Architecture:** Enhance star vertex/fragment shaders for dramatic shockwave + illumination. Simplify void shader to origin-point role. Extend fissure timing from 0.3s to 2.5s in LivingSpace.svelte.

**Tech Stack:** WebGL 1.0, GLSL ES 1.0, Svelte 5, TypeScript

---

### Task 1: Extend fissure timing in LivingSpace.svelte

**Files:**
- Modify: `Portal/src/lib/components/LivingSpace.svelte:666-687`

- [ ] **Step 1: Change fissure threshold from 0.3 to 2.5 seconds**

In `LivingSpace.svelte`, the voidParams computation block:
```typescript
// Line ~673: change 0.3 to 2.5
} else if (ignitionAge > 0 && ignitionAge < 2.5) {
  voidParams = {
    cx: voidEf.x, cy: voidEf.y, phase: "fissure", ignitionAge,
    // ...
  };
} else if (ignitionAge >= 2.5) {
```

Also adjust waveActive and waveWidth computation to be stronger during the burst phase:
```typescript
const waveActive = ignitionAge > 0 && ignitionAge < 5;
// Strengthen wave during initial burst
const burstFactor = ignitionAge < 0.5 ? 2.5 :
                    ignitionAge < 1.5 ? 2.5 - (ignitionAge - 0.5) * 1.0 :
                    1.5;
bgStarParams = {
  // ...
  waveRadius: ignitionAge * 200,
  waveWidth: (120 + ignitionAge * 40) * burstFactor,
  waveActive,
  // ...
};
```

- [ ] **Step 2: Update gravity strength to handle fissure phase dynamics**

Change the gravity strength computation to weaken during explosion:
```typescript
const gravityStrength = gravityActive
  ? voidEf.phase === "emerging" ? 18
    : voidEf.phase === "lingering" ? 14
    : voidEf.phase === "crystallizing" ? 12
    : voidEf.phase === "star" ? 10
    : 0
  : 0;
```

Note: The gravity weakening during fissure (0–2.5s) can't be done via `voidEf.phase` since that maps to emergence phases. Instead, modulate in the star vertex shader using waveActive as a signal — when shockwave is active, reduce radial pull.

- [ ] **Step 3: Verify type check passes**

Run: `cd Portal && npx svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

---

### Task 2: Enhance shockwave in star vertex shader

**Files:**
- Modify: `Portal/src/lib/canvas/webgl-renderer.ts:194-206` (BGSTAR_VERT)

- [ ] **Step 1: Increase shockwave push strength from 80 to 250**

Change line:
```glsl
screen += waveDir * influence * 80.0 * uZoom;
```
To:
```glsl
screen += waveDir * influence * 250.0 * uZoom;
```

- [ ] **Step 2: Reduce radial gravity pull during active shockwave**

After the gravity block, reduce radial pull when shockwave is active:
```glsl
// ── Gravitational orbit around the birth region ──
float gravInfluence = 0.0;
if (uGravityStrength > 0.0) {
  vec2 gravDelta = uGravityCenter - aPosition;
  float gravDist = length(gravDelta);
  vec2 gravDir = gravDelta / (gravDist + 1.0);

  float pull = uGravityStrength / (1.0 + gravDist * 0.004);

  // Weaken radial pull during shockwave — let explosion push outward
  float radialDamp = 1.0 - influence * 0.8;

  vec2 tangent = vec2(-gravDir.y, gravDir.x);
  float orbitStrength = pull * 1.5 * smoothstep(1500.0, 60.0, gravDist);

  screen += (gravDir * pull * 0.5 * radialDamp + tangent * orbitStrength) * uZoom;
  gravInfluence = pull / (uGravityStrength + 0.001);
}
```

The key addition is `radialDamp = 1.0 - influence * 0.8` — when a star is at the shockwave front (influence ≈ 1.0), radial pull drops to 20%, letting the shockwave push stars outward freely.

- [ ] **Step 3: Type check**

---

### Task 3: Enhance shockwave illumination in star fragment shader

**Files:**
- Modify: `Portal/src/lib/canvas/webgl-renderer.ts:354-361` (BGSTAR_FRAG)

- [ ] **Step 1: Dramatically strengthen shockwave illumination**

Change:
```glsl
// Shockwave: brighten and blue-tint stars near the energy front
if (vWaveInfluence > 0.01) {
  color.rgb += vec3(0.15, 0.25, 0.5) * vWaveInfluence;
  alpha = min(1.0, alpha + vWaveInfluence * 0.15);
}
```
To:
```glsl
// Shockwave: stars at wave front glow near-white with energy
if (vWaveInfluence > 0.01) {
  color.rgb += vec3(0.5, 0.6, 1.0) * vWaveInfluence;
  alpha = min(1.0, alpha + vWaveInfluence * 0.5);
}
```

This makes the shockwave front dramatically brighter — stars hit by the wave glow near-white-blue instead of a subtle tint.

- [ ] **Step 2: Type check**

---

### Task 4: Update void shader timing for extended fissure

**Files:**
- Modify: `Portal/src/lib/canvas/void-mesh.ts` (VOID_FRAG, Act II section)

- [ ] **Step 1: Update fissure progress calculation for 2.5s duration**

In the Act II (fissure) section of VOID_FRAG, change:
```glsl
float progress = clamp(uIgnitionAge / 0.3, 0.0, 1.0);
```
To:
```glsl
float progress = clamp(uIgnitionAge / 2.5, 0.0, 1.0);
```

This makes the expanding shell, interior gas, and jets unfold over 2.5 seconds instead of 0.3 seconds.

- [ ] **Step 2: Verify void shader still works with ignition flash**

The ignition flash uses its own `uTime` (not `uIgnitionAge`) and has its own timing (0.18s implosion, 0.5s flash). The void shader's slower expansion won't conflict — the flash provides the instant visual, the void shader provides the sustained glow.

- [ ] **Step 3: Type check**

---

### Task 5: Visual verification and tuning

- [ ] **Step 1: Run dev server and verify all three acts**

Run: `npm run dev`

Check:
1. **Rift**: Bright singularity point, stars spiraling around it, visible orbital paths
2. **Fissure**: Click void → ignition flash → shockwave expands across screen pushing stars outward → stars at wave front glow bright → settles over ~3 seconds
3. **Scar**: Nebula glow at center, stars orbiting gently, new fragments emerging

- [ ] **Step 2: Tune parameters if needed**

If effects are too strong/weak, adjust:
- Shockwave push: `250.0` in BGSTAR_VERT (higher = more push)
- Shockwave illumination: `(0.5, 0.6, 1.0)` in BGSTAR_FRAG (higher = brighter)
- Wave width: burstFactor in LivingSpace.svelte (higher = wider wave band)
- Gravity strengths in LivingSpace.svelte
- Void shader brightness in void-mesh.ts

---

### Critical files
- `Portal/src/lib/canvas/void-mesh.ts` — timing fix (0.3→2.5)
- `Portal/src/lib/canvas/webgl-renderer.ts` — shockwave push 80→250, radial damp, illumination enhance
- `Portal/src/lib/components/LivingSpace.svelte` — fissure threshold 0.3→2.5, wave params, gravity
