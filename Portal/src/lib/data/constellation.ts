import type { SpaceArea, SpaceStar, SpaceConnection } from "$lib/types/space";

// ── Constellation group colors ──
export const groupColors: Record<string, { r: number; g: number; b: number }> =
  {
    origin: { r: 255, g: 180, b: 100 }, // warm gold
    seelefelix: { r: 139, g: 92, b: 246 }, // purple
    chain: { r: 59, g: 130, b: 246 }, // blue
    silhouette: { r: 6, g: 182, b: 212 }, // cyan
    axiom: { r: 180, g: 130, b: 255 }, // violet-white
    standard: { r: 236, g: 72, b: 153 }, // pink-gold
    closing: { r: 255, g: 255, b: 255 }, // pure white
    void: { r: 40, g: 40, b: 100 }, // deep blue-violet
  };

function c(group: string, alpha: number): string {
  const g = groupColors[group];
  return `rgba(${g.r},${g.g},${g.b},${alpha})`;
}

// ── Nebula areas for each constellation group ──
export const areas: SpaceArea[] = [
  {
    id: "origin",
    type: "void",
    centerX: -650,
    centerY: -180,
    radius: 200,
    color: c("origin", 0.5),
    nebulaColor: c("origin", 0.12),
  },
  {
    id: "seelefelix",
    type: "void",
    centerX: -280,
    centerY: -150,
    radius: 180,
    color: c("seelefelix", 0.5),
    nebulaColor: c("seelefelix", 0.12),
  },
  {
    id: "chain",
    type: "void",
    centerX: 60,
    centerY: -100,
    radius: 220,
    color: c("chain", 0.5),
    nebulaColor: c("chain", 0.1),
  },
  {
    id: "silhouette",
    type: "void",
    centerX: 380,
    centerY: -60,
    radius: 180,
    color: c("silhouette", 0.5),
    nebulaColor: c("silhouette", 0.1),
  },
  {
    id: "axiom",
    type: "void",
    centerX: 680,
    centerY: -20,
    radius: 220,
    color: c("axiom", 0.5),
    nebulaColor: c("axiom", 0.12),
  },
  {
    id: "standard",
    type: "void",
    centerX: 980,
    centerY: 30,
    radius: 200,
    color: c("standard", 0.5),
    nebulaColor: c("standard", 0.1),
  },
  {
    id: "closing",
    type: "void",
    centerX: 200,
    centerY: -450,
    radius: 140,
    color: c("closing", 0.3),
    nebulaColor: c("closing", 0.06),
  },
  {
    id: "void-gate",
    type: "void",
    centerX: 1250,
    centerY: 450,
    radius: 160,
    color: c("void", 0.4),
    nebulaColor: c("void", 0.08),
  },
];

// ── Stars — 16 fragments + void entry, arranged in 6 constellations ──
export const stars: SpaceStar[] = [
  // ═══ Origin (起源): frag-1, frag-2 ═══
  {
    id: "frag-1",
    areaId: "origin",
    x: -680,
    y: -200,
    size: 3.2,
    brightness: 0.85,
    contentType: "fragment",
    contentRef: "frag-1",
    label: {},
    connections: ["frag-2"],
    pulseSpeed: 1.5,
  },
  {
    id: "frag-2",
    areaId: "origin",
    x: -620,
    y: -150,
    size: 2.8,
    brightness: 0.8,
    contentType: "fragment",
    contentRef: "frag-2",
    label: {},
    connections: ["frag-1", "frag-3"],
    pulseSpeed: 1.2,
  },

  // ═══ SeeleFelix: frag-3, frag-4 ═══
  {
    id: "frag-3",
    areaId: "seelefelix",
    x: -310,
    y: -170,
    size: 3.0,
    brightness: 0.85,
    contentType: "fragment",
    contentRef: "frag-3",
    label: {},
    connections: ["frag-2", "frag-4", "frag-5"],
    pulseSpeed: 1.8,
  },
  {
    id: "frag-4",
    areaId: "seelefelix",
    x: -250,
    y: -120,
    size: 2.6,
    brightness: 0.78,
    contentType: "fragment",
    contentRef: "frag-4",
    label: {},
    connections: ["frag-3"],
    pulseSpeed: 1.3,
  },

  // ═══ Chain (链条): frag-5, frag-6, frag-7 ═══
  {
    id: "frag-5",
    areaId: "chain",
    x: 10,
    y: -130,
    size: 3.0,
    brightness: 0.85,
    contentType: "fragment",
    contentRef: "frag-5",
    label: {},
    connections: ["frag-3", "frag-6", "frag-8"],
    pulseSpeed: 2.0,
  },
  {
    id: "frag-6",
    areaId: "chain",
    x: 60,
    y: -80,
    size: 2.8,
    brightness: 0.8,
    contentType: "fragment",
    contentRef: "frag-6",
    label: {},
    connections: ["frag-5", "frag-7"],
    pulseSpeed: 1.5,
  },
  {
    id: "frag-7",
    areaId: "chain",
    x: 110,
    y: -110,
    size: 2.8,
    brightness: 0.82,
    contentType: "fragment",
    contentRef: "frag-7",
    label: {},
    connections: ["frag-6"],
    pulseSpeed: 1.6,
  },

  // ═══ Silhouette (轮廓): frag-8, frag-9 ═══
  {
    id: "frag-8",
    areaId: "silhouette",
    x: 340,
    y: -90,
    size: 3.0,
    brightness: 0.85,
    contentType: "fragment",
    contentRef: "frag-8",
    label: {},
    connections: ["frag-5", "frag-9", "frag-10"],
    pulseSpeed: 1.7,
  },
  {
    id: "frag-9",
    areaId: "silhouette",
    x: 410,
    y: -40,
    size: 2.8,
    brightness: 0.82,
    contentType: "fragment",
    contentRef: "frag-9",
    label: {},
    connections: ["frag-8"],
    pulseSpeed: 1.4,
  },

  // ═══ Axiom (公理): frag-10, frag-11, frag-12 ═══
  {
    id: "frag-10",
    areaId: "axiom",
    x: 620,
    y: -50,
    size: 3.2,
    brightness: 0.88,
    contentType: "fragment",
    contentRef: "frag-10",
    label: {},
    connections: ["frag-8", "frag-11", "frag-13"],
    pulseSpeed: 2.0,
  },
  {
    id: "frag-11",
    areaId: "axiom",
    x: 680,
    y: -10,
    size: 2.8,
    brightness: 0.82,
    contentType: "fragment",
    contentRef: "frag-11",
    label: {},
    connections: ["frag-10", "frag-12"],
    pulseSpeed: 1.5,
  },
  {
    id: "frag-12",
    areaId: "axiom",
    x: 730,
    y: -30,
    size: 2.6,
    brightness: 0.78,
    contentType: "fragment",
    contentRef: "frag-12",
    label: {},
    connections: ["frag-11"],
    pulseSpeed: 1.3,
  },

  // ═══ Standard (标准): frag-13, frag-14, frag-15 ═══
  {
    id: "frag-13",
    areaId: "standard",
    x: 920,
    y: 10,
    size: 3.0,
    brightness: 0.85,
    contentType: "fragment",
    contentRef: "frag-13",
    label: {},
    connections: ["frag-10", "frag-14"],
    pulseSpeed: 1.8,
  },
  {
    id: "frag-14",
    areaId: "standard",
    x: 980,
    y: 40,
    size: 2.8,
    brightness: 0.8,
    contentType: "fragment",
    contentRef: "frag-14",
    label: {},
    connections: ["frag-13", "frag-15"],
    pulseSpeed: 1.4,
  },
  {
    id: "frag-15",
    areaId: "standard",
    x: 1040,
    y: 20,
    size: 2.8,
    brightness: 0.82,
    contentType: "fragment",
    contentRef: "frag-15",
    label: {},
    connections: ["frag-14", "frag-16"],
    pulseSpeed: 1.6,
  },

  // ═══ Closing: frag-16 ═══
  {
    id: "frag-16",
    areaId: "closing",
    x: 180,
    y: -480,
    size: 3.5,
    brightness: 0.9,
    contentType: "fragment",
    contentRef: "frag-16",
    label: {},
    connections: ["frag-10", "frag-1", "frag-15"],
    pulseSpeed: 2.5,
  },

  // ═══ Void Entrance ═══
  {
    id: "void-entry",
    areaId: "void-gate",
    x: 1250,
    y: 450,
    size: 5,
    brightness: 0.35,
    contentType: "void-entry",
    contentRef: "void",
    label: {
      en: "Enter the Void",
      zh: "进入虚空",
      ja: "虚空へ",
      de: "Betrete die Leere",
    },
    connections: [],
    pulseSpeed: 6,
  },
];

// ── Connections ──
export const connections: SpaceConnection[] = extractConnections(stars);

function extractConnections(starList: SpaceStar[]): SpaceConnection[] {
  const seen = new Set<string>();
  const result: SpaceConnection[] = [];

  for (const star of starList) {
    for (const targetId of star.connections) {
      const key = [star.id, targetId].sort().join("-");
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ star1Id: star.id, star2Id: targetId, opacity: 0.35 });
      }
    }
  }

  return result;
}

// ── Helpers ──
export function getStarsByArea(areaId: string): SpaceStar[] {
  return stars.filter((s) => s.areaId === areaId);
}

export function getStarById(id: string): SpaceStar | undefined {
  return stars.find((s) => s.id === id);
}

export function getAreaById(id: string): SpaceArea | undefined {
  return areas.find((a) => a.id === id);
}

// Get the group color for a star (based on area)
export function getStarGroupColor(areaId: string): {
  r: number;
  g: number;
  b: number;
} {
  return groupColors[areaId] ?? groupColors.void;
}
