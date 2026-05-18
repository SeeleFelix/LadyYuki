# Visual Enrichment Design Spec

Date: 2026-05-18

## Problem

Current canvas visuals are flat, monotonous, and lack the mysterious/profound tone the project aims for. Specifically:

- Void entrance is two faint purple blobs — no structure, no ceremony
- Opening animation lacks visual weight before ignition
- All graphical elements are radial gradient circles — no geometric variety
- Connection lines are plain dashed lines — no texture

## Approach

Incremental rewrite (Plan A): keep current architecture (CanvasRenderer + systems/ modules), rewrite draw logic per system. No structural changes, no interaction logic changes.

## Scope

1. Void Gate — rift rewrite
2. Fragment star flare differentiation
3. Ritual ignition explosion
4. Background geometry + rune textures

Colors and animation timing remain unchanged.

---

## 1. Void Gate: Abyssal Rift

Replace `drawVortex` (two faint purple blobs) with a twisting rift.

### Pre-ignition (replaces drawVortex)

- Rift body: 2-3 Bezier curves stacked with slight offsets, forming a jagged tear
- Core width: 1-2px dark line
- Edge glow: thin bright lines on both sides (cool white with purple tint, alpha 0.3-0.5), pulsing with breath cycle
- Interior void: darker than background (#000000) via narrow radial gradient centered on rift — "nothing inside" feeling
- Drift particles: tiny dark particles occasionally float outward from rift edges

### Fissure transition (enhance drawFissure)

- Rift curves expand rapidly, bend amplitude increases
- Edge glow brightens to white-purple, alpha maxed
- Interior shifts from black to white-hot (white center → purple → dark edge)
- Curve count increases from 2-3 to 5-7 lines

### Post-ignition (modify drawRing → rift scar)

- Thin dark crack scar remains at center, pulsing slowly
- Fragmented light orbits the scar (like current ring arcs but more irregular/shattered)
- As readCount increases, rune symbols appear along the crack

### Theme params

```ts
voidGate: {
  rift: {
    curveCount: 3,
    baseLength: 0.35,       // relative to screen height
    width: 1.5,
    edgeGlowWidth: 12,
    edgeGlowAlpha: 0.4,
    breathFreq: 0.25,
    breathAmp: 0.15,
    particleRate: 0.02,     // particles per frame
    voidDepth: 0.03,
  },
}
```

---

## 2. Star Flare Differentiation

Replace uniform circular glow points with geometric flare shapes per group.

### Group → Flare mapping

| Group | Shape | Rays | Notes |
|-------|-------|------|-------|
| origin | Cross | 4 rays, 90deg | Equal length |
| seelefelix | Hexagram | 6 rays, 60deg | Faint hex outline at center |
| chain | Trident | 3 main + 3 aux rays | 120deg main, aux between |
| silhouette | Dual flare | 2 rays, diagonal | Like staring eyes |
| axiom | Pentagram | 5 rays, 72deg | Geometric, seal-like |
| standard | Diamond | 4 rays, diamond layout | Top/bottom long, left/right short |
| closing | Octagram | 8 rays | Light wheel |
| void-gate | — | — | Drawn by rift system |

### Drawing

- Rays via `ctx.beginPath()` + `moveTo/lineTo`, gradient fade to transparent outward
- Width tapers from 2-3px center to 0px tip
- Layered on top of existing radial gradient halos (halos = ambient glow, flares = structure)
- Breath/pulse animates ray length and brightness, synced to existing params

### Theme params

```ts
fragmentStars: {
  flare: {
    origin:      { rays: 4, angleOffset: 0,           lengthMul: 6,   widthBase: 2.5 },
    seelefelix:  { rays: 6, angleOffset: 0,           lengthMul: 5,   widthBase: 2.0 },
    chain:       { rays: 3, angleOffset: 0,           lengthMul: 7,   widthBase: 2.5, auxRays: 3, auxLengthMul: 3 },
    silhouette:  { rays: 2, angleOffset: Math.PI / 4, lengthMul: 8,   widthBase: 3.0 },
    axiom:       { rays: 5, angleOffset: 0,           lengthMul: 5.5, widthBase: 2.0 },
    standard:    { rays: 4, angleOffset: 0,           lengthMul: 5,   widthBase: 2.0, lengthVar: [4, 7] },
    closing:     { rays: 8, angleOffset: 0,           lengthMul: 4.5, widthBase: 1.8 },
  },
}
```

### Read/unread states

- Read: sharp clear rays, normal brightness
- Unread: slightly wider rays + extra bloom, pulsing

---

## 3. Ritual Ignition Explosion

Replace simple particles + circular shockwave with geometric burst.

### Sequence (0-5s)

1. **Central flash** (0-0.25s) — diamond/hexagonal shape instead of circle
2. **Main burst** (0.1-3s) — geometric ray beams from rift center:
   - 12-16 rays, unequal length, slight angular jitter
   - Each ray: thin line (1px white core) + outer glow (4-6px purple halo)
   - Ray tips have small cross/flare burst points
3. **Concentric geo-rings** (0.3-4s) — replace circular shockwaves:
   - 3-5 concentric rings as polygons (hexagon/octagon)
   - Edge distortion pulsing
   - Innermost ring brightest, outer rings fade
4. **Fragment debris** (0.2-2s) — replace round particles:
   - Small geometric shards (triangles, quads, line segments)
   - Rotating, with light trails
   - Color gradient: white center → purple → dark edge
5. **Central afterglow** (1-5s) — shrinking geometric glow like a closing flower

### Theme params

```ts
ignition: {
  burst: {
    rayCount: 14,
    rayLengthMul: [8, 18],
    rayWidth: 1.5,
    rayGlowWidth: 5,
    auxFlareRays: 3,
  },
  geoRings: {
    count: 4,
    sides: [6, 8, 6, 8],
    expansionSpeed: 0.2,
    baseAlpha: 0.7,
    distortFreq: 1.5,
  },
  fragments: {
    count: 24,
    types: ['triangle', 'quad', 'line'],
    speed: [300, 1000],
    life: [0.4, 1.2],
    rotSpeed: [2, 8],
    trailLength: 6,
  },
}
```

---

## 4. Background Geometry + Rune Textures

### Background star chart overlay

Layer on top of existing dust/field/beacon stars:

- 2-3 large rotating rings (radius 400-800px), extremely faint (alpha 0.02-0.04)
- Tick marks on rings at equal intervals (like astrolabe graduations)
- Thin dashed lines between some brighter background stars forming faint constellations
- Only visible post-ignition (explore phase), fade in with fieldBrightness

### Rune texture on connection lines

Overlay on existing dashed connection lines:

- Small geometric symbols at equal intervals along lines (up triangle, down triangle, dot, cross, square)
- Symbols move with dash animation, like scripture being transmitted
- Size: 2-3px, alpha: 0.1-0.2 (nearly invisible, atmospheric)
- Read lines: brighter symbols; unread lines: nearly invisible

---

## Files Changed

| File | Change |
|------|--------|
| `theme.ts` | Add rift, flare, geoRings, fragments, background geometry params |
| `void-gate.ts` | Rewrite `drawVortex` → rift, rewrite `drawIgnition` → geometric burst |
| `constellation.ts` | Add flare layer to `drawFragmentStars`, add rune texture to `drawConnectionLines` |
| `background/` | Add geometric star chart ring drawing layer |
| `types.ts` | Add geo-fragment, flare config types |

## Out of Scope

- Color palette changes
- Animation timing changes
- Interaction/click logic changes
- Camera/viewport changes
- Ambient mode changes
