# Canvas Visual Redesign — Design Spec

**Date:** 2026-05-15
**Status:** Approved
**Scope:** Full visual redesign of Portal's Canvas rendering system

## Context

The Portal's two main pages (Living Space `/` and Void Chat `/void`) implement the same visual concepts (starfield, constellation stars, connection lines, nebulas, energy dots, cross flares, vignettes) through **two completely independent rendering engines** with zero code sharing. This has caused:

- 3 different near-black background colors (#04040a, #06060e, #0a0a0f)
- 4 duplicate implementations of `drawCrossFlare` (1 dead code)
- 2 duplicate implementations of `starColor`, `noise`, `drawVignette`
- Void Chat page missing features (no shooting stars, fewer star halo layers, hardcoded connection colors)
- CSS variables redefined in 4 separate component `:root` blocks
- Canvas colors hardcoded as raw `rgba()` in 6+ files with no central palette
- 9 independent animation timing parameters with no coordinated rhythm
- All 16 fragment stars visually equal — no hierarchy or focal guidance

## Design Decisions

### 1. Color System

Single source of truth — `CanvasTheme`:

| Token | Value | Usage |
|---|---|---|
| `bg.void` | `#05050d` | All backgrounds (replaces 3 existing values) |
| `bg.deep` | `#08081a` | Nebula edges, depth layers |

Group colors (semantic, retained from current `groupColors`):

| Group | Color | Semantic meaning |
|---|---|---|
| void-gate | Indigo (#6366f1) | Entry point, the unknown |
| origin | Gold (#f59e0b) | Origin, warmth, light |
| seelefelix | Purple (#8b5cf6) | Self, soul |
| chain | Blue (#3b82f6) | Connection, chain |
| silhouette | Pink (#ec4899) | Silhouette, emergence |
| axiom | Cyan (#06b6d4) | Axiom, truth |
| standard | Violet (#a78bfa) | Standard, measure |
| closing | Rose (#f472b6) | Closing, completion |

### 2. Visual Hierarchy (4 Tiers)

| Tier | Elements | Rendering strategy |
|---|---|---|
| **L0 · Focus** | Current interaction target, Void Gate | Brightest, largest glow radius, exclusive warm-white core |
| **L1 · Narrative** | Read fragment stars, connection lines, energy dots | Semantic group color, medium glow, subtle breath animation |
| **L2 · Waiting** | Unread fragment stars | Dimmed, faint pulsing ring to hint interactivity |
| **L3 · Atmosphere** | Background stars, nebulas, Milky Way, dust | Lowest brightness, large-scale gradients, no independent animation |

### 3. Animation Philosophy

Shift from "decorative looping pulses" to "narrative phase-driven animation":

- **Master clock:** Global BPM = 12 (5s per beat). All cyclical animations align to beats.
- **Intro phase:** Slow outward expansion from void-entry. Energy dots flow outward.
- **Explore phase:** Bidirectional energy dots at full speed, expressing mutual reflection between fragments. All fragment stars breathing in sync on the master beat.
- **Revelation phase:** When all 16 fragments read, energy dots accelerate and converge.
- **Entrance animations:** Elements animate on first appearance, then settle (no continuous flashing).
- **Response animations:** Triggered only by user interaction (hover enlarge, click ripple, read resonance).
- **Atmosphere animations:** Only L3 retains very slow cycles (>10s period), never competing for attention.
- **Easing curve:** Unified `cubic-bezier(0.4, 0, 0.2, 1)`.

### 4. Spatial Depth

- **Atmospheric perspective:** Stars farther from void-entry shift cooler/bluer and less saturated.
- **Vignette:** Edge darkening from 0.70 → 0.85 alpha. Center stays clear.
- **Nebula layering:** Large nebulas at distance (low opacity), small nebulas near (higher opacity).
- **Fragment star depth offset:** Subtle per-star parallax factor so fragment stars don't sit on the same plane as background stars.

## Architecture

### New Module: `src/lib/canvas/`

```
canvas/
├── theme.ts            CanvasTheme — single source of truth for all visual parameters
├── renderer.ts         CanvasRenderer — unified rendering pipeline
├── timeline.ts         AnimationTimeline — master clock + phase management
├── primitives/
│   ├── stars.ts        All star types (L0-L3)
│   ├── connections.ts  Connection lines + bidirectional energy dots
│   ├── nebula.ts       Nebulas, Milky Way band
│   ├── atmosphere.ts   Vignette, atmospheric perspective, dust
│   └── effects.ts      Cross flare, click ripple, resonance wave
└── systems/
    ├── background.ts   Chunk-based background star system (ported from living-space)
    ├── constellation.ts Force layout + fragment stars (ported from living-space)
    ├── void-gate.ts    Void Gate + ignition particles (ported from living-space)
    ├── whispers.ts     Whisper trajectory system (ported from living-space)
    └── meteors.ts      Shooting star system (ported from living-space)
```

### CanvasRenderer

Single class instantiated with different configs per page:

```ts
// Living Space page
new CanvasRenderer(canvas, {
  mode: 'explore',    // pannable, zoomable, clickable stars
  systems: ['background', 'constellation', 'voidGate', 'whispers', 'meteors'],
});

// Void Chat page
new CanvasRenderer(canvas, {
  mode: 'ambient',    // background atmosphere only, non-interactive
  systems: ['background', 'constellation'],
  parallaxFollow: pointer,
});
```

### Render Order (per frame)

1. Clear → fill `theme.bg.void`
2. L3 Atmosphere → nebulas → Milky Way → dust → background stars → meteors
3. L2 Waiting → unread fragment stars (pulsing ring)
4. L1 Narrative → connection lines → bidirectional energy dots → read fragment stars
5. Whispers → flying text trajectories
6. L0 Focus → Void Gate → current interaction highlight
7. Post → vignette → atmospheric perspective overlay

### AnimationTimeline

```ts
class AnimationTimeline {
  masterBeat: number;  // Global beat counter, advances by BPM
  phase: 'intro' | 'settle' | 'explore' | 'revelation';

  // Bidirectional energy dots — narrative-aware:
  //   intro: slow, outward from void-entry
  //   explore: bidirectional full speed (mutual reflection)
  //   revelation: all dots accelerate and converge toward center
  getEnergyDotSpeed(phase): number;
  getConnectionPulse(phase): number;
  getStarBreathAmplitude(phase): number;
}
```

### Bidirectional Energy Dots (Preserved)

Retained from current implementation and integrated into the narrative system:
- Dots alternate direction (even index one way, odd index the other)
- Ease curve near endpoints retained: `1 - (2t - 1)²`
- Behavior changes by timeline phase:
  - **intro:** All flow outward from void-entry (exploration begins)
  - **explore:** Full bidirectional flow (fragments reflecting each other)
  - **revelation:** Converge toward center (all fragments unified)

## Migration Strategy

Three incremental steps, each with verifiable visual output:

### Step 1: Extract Theme + Timeline (Low Risk)
- Create `canvas/theme.ts` with all visual parameters
- Create `canvas/timeline.ts` with AnimationTimeline
- Update existing `living-space/*.ts` modules to import from theme/timeline instead of using inline constants
- Zero visual change, only parameter source changes

### Step 2: Create CanvasRenderer, Migrate LivingSpace (Medium Risk)
- Build `canvas/primitives/` — shared draw functions
- Build `canvas/systems/` — ported from `living-space/`, using primitives + theme
- Build `CanvasRenderer` class with the render loop
- Replace `LivingSpace.svelte`'s inline render loop with CanvasRenderer
- Void page starts using CanvasRenderer in `ambient` mode
- Delete `StarBackground.svelte` and `Constellation.svelte`

### Step 3: Apply Visual Redesign (Medium Risk)
- Implement L0-L3 visual hierarchy (adjusted glow radii, brightness, animation behavior)
- Tune animation parameters (unified BPM, phase-driven speed changes)
- Apply atmospheric perspective
- Enhance vignette
- Remove dead code

## Files Affected

### New Files
- `Portal/src/lib/canvas/theme.ts`
- `Portal/src/lib/canvas/renderer.ts`
- `Portal/src/lib/canvas/timeline.ts`
- `Portal/src/lib/canvas/primitives/stars.ts`
- `Portal/src/lib/canvas/primitives/connections.ts`
- `Portal/src/lib/canvas/primitives/nebula.ts`
- `Portal/src/lib/canvas/primitives/atmosphere.ts`
- `Portal/src/lib/canvas/primitives/effects.ts`
- `Portal/src/lib/canvas/systems/background.ts`
- `Portal/src/lib/canvas/systems/constellation.ts`
- `Portal/src/lib/canvas/systems/void-gate.ts`
- `Portal/src/lib/canvas/systems/whispers.ts`
- `Portal/src/lib/canvas/systems/meteors.ts`

### Modified Files
- `Portal/src/lib/components/LivingSpace.svelte` — simplified shell, delegates to CanvasRenderer
- `Portal/src/routes/void/+page.svelte` — use CanvasRenderer instead of StarBackground + Constellation
- `Portal/src/app.css` — consolidate CSS variables, remove `*` transition

### Deleted Files
- `Portal/src/lib/components/StarBackground.svelte`
- `Portal/src/lib/components/Constellation.svelte`
- `Portal/src/lib/components/living-space/` (entire directory, ported to canvas/)

## Verification

1. **Step 1:** Dev server running, both pages visually identical to before (no visual change)
2. **Step 2:** Both pages still render correctly. Void Chat page gains features it was missing (shooting stars, 4-layer star halos, semantic connection colors)
3. **Step 3:** A/B comparison with screenshots of the old version. Verify:
   - Visual hierarchy: L0 > L1 > L2 > L3 in perceived brightness
   - Color consistency: no element uses a different black than `#05050d`
   - Animation rhythm: all cyclical elements align to 5s beat
   - Bidirectional dots: preserved and phase-aware
   - Both pages render identically for shared systems
