# Cosmic Birth Narrative — Design Spec

## Goal

Redesign the void gate as a cosmic birth event that affects the entire star field, not a local overlay. Three acts: Singularity → Big Bang → Stellar Birth Region. The star field IS the visual; the void shader is just the origin point.

## Narrative Arc

**Act I — Singularity (Rift)**
A point of infinite density appears. Stars begin spiraling toward it. Slow, meditative.

**Act II — Big Bang (Fissure)**
The singularity explodes. A shockwave expands across the ENTIRE star field over 3 seconds, pushing and illuminating every star it touches. This is a screen-wide event.

**Act III — Stellar Birth Region (Scar)**
The explosion cools into a nebula. Stars orbit gently. New fragments emerge continuously. The region is permanently different from the rest of the sky.

## Architecture

### Principle: Stars are the protagonist

The void shader renders only the LOCAL origin point (bright flash, subtle glow). The star vertex/fragment shaders handle ALL global effects — gravity, shockwave, illumination, color shift. The visual impact comes from seeing the entire star field transform.

### Systems involved

| System | Scope | Role |
|--------|-------|------|
| Void shader | Local (billboard 1.5×R) | Origin point visual only |
| Star vertex shader | Global (all stars) | Gravity pull, orbital displacement, shockwave push |
| Star fragment shader | Global (all stars) | Shockwave illumination, void illumination, color shift |
| Ignition flash | Screen-wide | Big Bang flash |
| Ignition particles | Local | Explosion debris |

### Timing

```
Rift (singularity):    continuous until ignition triggered
Fissure (Big Bang):    0s ──────────────────── 2.5s    (was 0.3s)
Scar (birth region):   2.5s ────────────────── →
```

Shockwave already runs for 5 seconds. The void shader's fissure phase extends to 2.5s to overlap.

---

## Act I: Singularity (Rift)

### Void shader
- Ray march through concentrated 3D sphere (core radius 0.08×R)
- White-hot center → deep blue edge (temperature gradient)
- 3D torus accretion ring in Z=0 plane (major 0.28×R, noise-textured)
- Additive blending — blinding light
- Billboard covers 1.2×R (singularity is small)
- Breathing: intensity pulses 0.75–1.0 with breathCycle

### Star behavior
- **Gravity**: strong pull (strength=18), wide range (1500px)
- **Orbit**: strong tangential displacement (1.5× pull), visible spiral paths
- **Illumination**: stars near singularity grow up to 2.2×, blue-shift to `(0.35, 0.5, 1.0)`, alpha boosted 2×
- **Visual result**: stars visibly spiral toward a bright point

### Gravity strength
- `emerging`: 18

---

## Act II: Big Bang (Fissure)

### Void shader
- Expanding 3D spherical shell (radius grows 0 → 1.2×R over eased 2.5s)
- Interior filled with 3D hot gas (FBM density)
- Bipolar energy jets along Z axis (atan(z,r) cone)
- Central remnant glow persists
- Additive blending
- Simplified from current — lets star effects be the hero

### Ignition flash (existing)
- Implosion: 0–0.18s
- Genesis flash: 0.15–0.5s
- Afterglow: 0.8–5s
- No changes needed

### Star behavior — THREE SUB-PHASES

**t = 0–0.5s: Burst**
- Gravity WEAKENS (strength drops to 4) — stars not pulled back
- Shockwave front: stars pushed outward at 250px (was 80px)
- Shockwave front: stars illuminated near-white `(0.6, 0.7, 1.0)` (was `(0.15, 0.25, 0.5)`)
- Shockwave front: alpha boost +0.5 (was +0.15)
- Wave width: `120 + age * 40` (was `60 + age * 24`) — wider visible band

**t = 0.5–2.0s: Expansion**
- Shockwave continues expanding, covering more stars
- Behind wave front: stars cool from white → blue → normal
- Gravity gradually returns (strength ramps 4 → 10)

**t = 2.0–5.0s: Cooling**
- Shockwave reaches screen edges
- Stars settle into new positions
- Gravity at moderate (12) for gentle orbit
- Void shader transitions to scar

### Implementation: shockwave params change
The shockwave intensity, color, and width are controlled by uniforms from LivingSpace.svelte. These need to change based on ignitionAge to create the sub-phases.

Two options:
1. **Uniform-based**: Pass ignitionAge to star shaders, modulate shockwave behavior in-shader
2. **JS-computed**: Compute different shockwave params in LivingSpace.animate() per frame

Option 2 is cleaner — no shader changes for timing logic. JS computes the intensity multiplier and passes it via existing uniforms.

### Gravity strength transitions
- `emerging` (before ignition): 18
- During fissure (0–2.5s): compute dynamically in JS
  - 0–0.5s: 4 (weak — let shockwave push)
  - 0.5–2.0s: ramp 4 → 10
  - 2.0–2.5s: 12
- `crystallizing` / `star` (after 2.5s): 12

### Shockwave parameter changes (in JS)

```typescript
// During fissure phase (ignitionAge 0–2.5s)
const fissureT = ignitionAge / 2.5;
const burstIntensity = fissureT < 0.2 ? 3.0 :          // burst
                       fissureT < 0.8 ? 3.0 - (fissureT - 0.2) * 2.0 : // fade
                       1.8;                              // settling
waveWidth = (120 + ignitionAge * 40) * burstIntensity;
// Push strength: modulated by passing burstIntensity as uniform or
// by using a wider waveWidth (which naturally increases displacement area)
```

Actually, the push strength is hardcoded in the vertex shader as `influence * 80.0`. To increase it, we either:
1. Change the shader constant from 80 to 250
2. Add a new uniform for push strength
3. Use a wider wave (which increases the area but not peak displacement)

Option 1 is simplest but makes ALL shockwaves stronger, even non-Big-Bang ones.
Option 2 adds a uniform but is flexible.

**Decision**: Change the shader constant from 80 to 250. The shockwave only activates during ignition (`uWaveActive`), so this only affects the Big Bang moment. No other shockwaves exist.

---

## Act III: Stellar Birth Region (Scar)

### Void shader
- 3D volumetric nebula via domain-warped FBM with Z-depth noise
- Soft organic shape — no boundary, no circle
- Color: deep blue with warm hydrogen accents
- Orbiting nascent stars at varying Z depths (parallax)
- Standard alpha blending
- Billboard covers 1.5×R

### Star behavior
- **Gravity**: moderate (strength=12), gentle orbit
- **Illumination**: stars in region permanently brighter and bluer
- **New fragments**: emerge from region (existing logic — whispers, meteors)
- **Connections**: form between nearby stars (existing logic)

### Gravity strength
- `crystallizing`: 12
- `star`: 10

---

## Files to modify

| File | Changes |
|------|---------|
| `Portal/src/lib/canvas/void-mesh.ts` | Three-act ray march shader (already written, timing adjust) |
| `Portal/src/lib/canvas/webgl-renderer.ts` | Shockwave push 80→250, illumination color/intensity enhance, wave width params |
| `Portal/src/lib/components/LivingSpace.svelte` | Fissure threshold 0.3→2.5s, gravity strength per phase, wave params |

## What NOT to change
- Ignition flash (works as-is)
- Ignition particles (works as-is)
- Star generation/placement (density handled by gravity pull, not generation)
- Canvas 2D rendering (separate system)
