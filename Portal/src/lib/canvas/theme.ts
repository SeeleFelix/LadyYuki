import { groupColors } from "$lib/data/constellation";

// ══════════════════════════════════════
//  CanvasTheme — single source of truth for all visual parameters
// ══════════════════════════════════════

export const theme = {
  // ── Canvas background ──
  canvas: {
    bg: "#05050d",
    bgDeep: "#08081a",
  },

  // ── Chunk-based background stars ──
  background: {
    chunkSize: 1200,
    starCount: 800,
    starTypeDistribution: {
      dust: {
        count: 560,
        size: [0.2, 0.6] as [number, number],
        opacity: [0.03, 0.16] as [number, number],
        twinkleSpeed: [0.1, 0.35] as [number, number],
        tempRange: 0.3,
      },
      field: {
        count: 200,
        size: [0.6, 1.6] as [number, number],
        opacity: [0.2, 0.55] as [number, number],
        twinkleSpeed: [0.3, 1.1] as [number, number],
      },
      beacon: {
        count: 40,
        size: [1.5, 4.3] as [number, number],
        opacity: [0.5, 0.9] as [number, number],
        twinkleSpeed: [0.4, 1.6] as [number, number],
        flareChance: 0.15,
      },
    },
    dustCount: 35,
    dustColors: [
      { r: 139, g: 92, b: 246 },
      { r: 59, g: 130, b: 246 },
      { r: 236, g: 72, b: 153 },
      { r: 255, g: 220, b: 180 },
    ],
    chunkCacheMax: 200,

    // Milky Way
    milkyWayBandWidth: 800,
    milkyWayColors: [
      { r: 139, g: 92, b: 246 }, // purple
      { r: 59, g: 130, b: 246 }, // blue
      { r: 180, g: 130, b: 255 }, // violet
    ],

    // Nebula
    nebulaCount: 8,
    nebulaColors: [
      { r: 139, g: 92, b: 246 },
      { r: 59, g: 130, b: 246 },
      { r: 236, g: 72, b: 153 },
      { r: 99, g: 102, b: 241 },
      { r: 6, g: 182, b: 212 },
      { r: 180, g: 130, b: 255 },
      { r: 255, g: 180, b: 100 },
    ],

    // Shooting stars
    meteors: {
      types: {
        swift: {
          color: { r: 255, g: 255, b: 255 },
          screenSpeed: [200, 400] as [number, number],
          maxLife: [1.5, 3.5] as [number, number],
          headRadius: 8,
        },
        fireball: {
          color: { r: 255, g: 220, b: 155 },
          screenSpeed: [100, 250] as [number, number],
          maxLife: [3, 6] as [number, number],
          headRadius: 18,
        },
        longtrail: {
          color: { r: 200, g: 220, b: 255 },
          screenSpeed: [60, 160] as [number, number],
          maxLife: [4, 8] as [number, number],
          headRadius: 10,
        },
      },
      burstChance: 0.2,
      interval: [12, 30] as [number, number],
      trailMaxLength: 50,
    },
  },

  // ── Constellation layout + emergence ──
  constellation: {
    // Force-directed layout
    force: {
      iterations: 180,
      repulsion: 80000,
      springLen: 280,
      springK: 0.06,
      centerK: 0.002,
    },

    // Emergence phase durations (seconds)
    emergence: { emerge: 1.2, linger: 3.5, crystallize: 1.0 },

    // Connection lines
    connection: {
      baseAlpha: { read: 0.45, unread: 0.2 },
      pulseFreq: 0.8,
      pulseAmp: 0.15,
      outerGlow: { lineWidth: 8, alphaMul: 0.25 },
      mainLine: {
        lineWidth: { read: 1.8, unread: 1.2 },
        dash: [4, 12] as [number, number],
        dashSpeed: { read: 30, unread: 15 },
      },
    },

    // Energy dots (bidirectional)
    energyDots: {
      bidirectional: true,
      interGroupCount: 4,
      intraGroupCount: 3,
      baseSpeed: [0.0004, 0.0014] as [number, number],
      size: [1, 3] as [number, number],
      alpha: [0.2, 0.7] as [number, number],
      unreadAlphaMul: 0.35,
      glowRadiusMul: 5,
      pulseFreq: 2.5,
    },

    // Fragment stars
    fragmentStars: {
      size: [4.5, 5.0] as [number, number],
      brightness: [0.8, 0.9] as [number, number],
      breathFreq: 0.5,
      breathAmp: 0.06,
      twinkleFreq: 1.5,
      twinkleAmp: 0.05,
      unreadPulseFreq: 2.5,
      unreadPulseAmp: 0.08,
      unreadBrightnessBoost: 1.2,
      proximityBoostMul: 0.5,
      resonanceBoost: 0.6,

      // Halo layer radii (multipliers of star size)
      halo: {
        superOuterBloom: 14,
        outerHalo: 8,
        midHalo: 4,
        innerGlow: 2.5,
      },

      // Unread ring
      unreadRing: {
        radiusOffset: 3,
        lineWidth: 2,
        alpha: 0.45,
      },
    },

    // Resonance
    resonance: { duration: 2, cascadeDelay: 0.3 },
  },

  // ── Void Gate ──
  voidGate: {
    // Vortex (pre-ignition)
    vortex: {
      blobCount: 2,
      hazeAlpha: 0.06,
    },

    // Fissure (ignition in progress)
    fissure: {
      duration: 0.3,
      maxAlpha: 0.85,
      arcCount: 3,
      arcAlpha: 0.15,
    },

    // Ring (post-ignition)
    ring: {
      baseRadiusMul: 10,
      rotSpeed: 0.08,
      baseFragmentCount: 8,
      fragmentWidth: [4, 1.5] as [number, number],
      pulseDuration: 3.0,
      heartbeatInterval: 1.0,
    },
  },

  // ── Ignition (explosion + shockwave) ──
  ignition: {
    particleCount: 30,
    particleSpeed: [400, 1300] as [number, number],
    particleLife: [0.3, 0.8] as [number, number],
    particleColors: [
      { r: 220, g: 210, b: 255 },
      { r: 180, g: 160, b: 240 },
      { r: 255, g: 255, b: 255 },
      { r: 160, g: 180, b: 255 },
      { r: 200, g: 180, b: 240 },
    ],
    shake: { initial: 18, decay: 40 },
    flash: { duration: 0.25, maxAlpha: 0.9, radiusMul: 0.8 },
    shockwave: {
      ringCount: 5,
      startOffset: 0.05,
      spacing: 0.15,
      ringLife: 4,
      maxIntensity: 0.75,
    },
  },

  // ── Whispers (text trajectory arcs) ──
  whispers: {
    duration: 3.5,
    trailLength: 160,
    coreRadius: 30,
    sparkCount: 4,
    lineWidth: 3,
    alpha: 0.85,
    fadeInThreshold: 0.08,
    fadeOutThreshold: 0.85,
  },

  // ── Atmosphere / post-processing ──
  atmosphere: {
    vignette: { edgeAlpha: 0.85, startRatio: 0.4, cutoffRatio: 0.65 },
    depthShift: {
      blueShiftStrength: 0.15,
      parallaxFactor: 0.3,
      maxPerspectiveDistance: 2500,
    },
  },

  // ── Interaction ──
  interaction: {
    clickRipple: {
      duration: 0.45,
      startRadius: 20,
      endRadius: 140,
      maxAlpha: 0.7,
    },
    starHitRadiusMul: 10,
    proximityDistance: 180,
    proximityDeadZone: 40,
  },

  // ── Opening cinematic ──
  opening: {
    text: "她在诉说。",
    initialDelay: 1.5,
    charDelay: 1.0,
    holdDuration: 1.5,
    fadeDuration: 2.5,
    cameraSettleZoom: { start: 0.35, end: 0.65, duration: 9 },
    awakenDuration: 5,
    awakenStartDelay: 3.5,
  },

  // ── Color temperature (0=cool blue, 0.5=white, 1=warm gold) ──
  starColorTemp(temp: number): { r: number; g: number; b: number } {
    if (temp < 0.5) {
      const t = temp * 2;
      return {
        r: Math.floor(180 + 75 * t),
        g: Math.floor(200 + 55 * t),
        b: 255,
      };
    }
    const t = (temp - 0.5) * 2;
    return {
      r: 255,
      g: Math.floor(255 - 55 * t),
      b: Math.floor(255 - 155 * t),
    };
  },

  // ── Reference to semantic group colors (managed in data/constellation.ts) ──
  groups: groupColors,
} as const;

export type CanvasTheme = typeof theme;

// ── Shared math helpers ──

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function pseudoNoise(x: number, y: number, s: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + s) * 43758.5453;
  return n - Math.floor(n);
}

export function chunkSeed(cx: number, cy: number): number {
  return (cx * 374761393 + cy * 668265263) & 0x7fffffff || 1;
}
