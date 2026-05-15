import type { EmergingFrag, Whisper, Resonance, ConnData, EDot } from "./types";
import type { Fragment } from "$lib/types/agent";
import type { Locale } from "$lib/i18n/detector";
import { getFragmentById } from "$lib/data/fragments";
import { groupColors, getStarById } from "$lib/data/constellation";
import { theme } from "$lib/canvas/theme";

const cEmergence = theme.constellation.emergence;
const cConn = theme.constellation.connection;
const cDots = theme.constellation.energyDots;
const cStars = theme.constellation.fragmentStars;
const cForce = theme.constellation.force;

// ══════════════════════════════════════
//  Force layout + emergence init
// ══════════════════════════════════════

export function generateEmergingFrags(locale: Locale): {
  emergingFrags: EmergingFrag[];
  emergeQueue: EmergingFrag[];
  voidX: number;
  voidY: number;
} {
  const nodes: Array<{
    id: string;
    fragmentId: string;
    starId: string;
    x: number;
    y: number;
    groupArea: string;
    color: { r: number; g: number; b: number };
    connections: string[];
    fragment: Fragment | null;
    shortText: string;
  }> = [];

  const fragGroups: Array<{ area: string; ids: string[] }> = [
    { area: "origin", ids: ["frag-1", "frag-2"] },
    { area: "seelefelix", ids: ["frag-3", "frag-4"] },
    { area: "chain", ids: ["frag-5", "frag-6", "frag-7"] },
    { area: "silhouette", ids: ["frag-8", "frag-9"] },
    { area: "axiom", ids: ["frag-10", "frag-11", "frag-12"] },
    { area: "standard", ids: ["frag-13", "frag-14", "frag-15"] },
    { area: "closing", ids: ["frag-16"] },
  ];
  for (const group of fragGroups) {
    const gColor = groupColors[group.area] ?? groupColors.void;
    for (const fragId of group.ids) {
      const frag = getFragmentById(fragId, locale) ?? null;
      const existingStar = getStarById(fragId);
      nodes.push({
        id: fragId,
        fragmentId: fragId,
        starId: fragId,
        x: (Math.random() - 0.5) * 1200,
        y: (Math.random() - 0.5) * 800,
        groupArea: group.area,
        color: gColor,
        connections: existingStar?.connections ?? [],
        fragment: frag,
        shortText: frag?.short ?? "",
      });
    }
  }
  nodes.push({
    id: "void-entry",
    fragmentId: "void-entry",
    starId: "void-entry",
    x: (Math.random() - 0.5) * 1200,
    y: (Math.random() - 0.5) * 800,
    groupArea: "void-gate",
    color: groupColors.void,
    connections: [],
    fragment: null,
    shortText: "",
  });

  // Force simulation
  const ITER = cForce.iterations,
    REPULSION = cForce.repulsion,
    SPRING_LEN = cForce.springLen,
    SPRING_K = cForce.springK,
    CENTER_K = cForce.centerK;
  for (let iter = 0; iter < ITER; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x,
          dy = nodes[i].y - nodes[j].y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const force = REPULSION / (dist * dist);
        const fx = (dx / dist) * force,
          fy = (dy / dist) * force;
        nodes[i].x += fx;
        nodes[i].y += fy;
        nodes[j].x -= fx;
        nodes[j].y -= fy;
      }
    }
    for (const n of nodes) {
      for (const tId of n.connections) {
        const t = nodes.find((o) => o.id === tId);
        if (!t) continue;
        const dx = t.x - n.x,
          dy = t.y - n.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const force = (dist - SPRING_LEN) * SPRING_K;
        const fx = (dx / dist) * force,
          fy = (dy / dist) * force;
        n.x += fx;
        n.y += fy;
        t.x -= fx;
        t.y -= fy;
      }
    }
    for (const n of nodes) {
      n.x -= n.x * CENTER_K;
      n.y -= n.y * CENTER_K;
    }
  }

  const emergingFrags: EmergingFrag[] = nodes.map((n) => ({
    id: `emerge-${n.id}`,
    fragmentId: n.fragmentId,
    starId: n.starId,
    x: n.x,
    y: n.y,
    size: cStars.size[0] + Math.random() * (cStars.size[1] - cStars.size[0]),
    brightness:
      cStars.brightness[0] +
      Math.random() * (cStars.brightness[1] - cStars.brightness[0]),
    phase: "hidden",
    phaseStart: 0,
    read: false,
    groupArea: n.groupArea,
    color: n.color,
    shortText: n.shortText,
    fragment: n.fragment,
    connections: n.connections,
    proximity: 0,
    screenX: 0,
    screenY: 0,
    textAlpha: 0,
  }));
  const emergeQueue = emergingFrags.filter((f) => f.starId !== "void-entry");
  const voidNode = emergingFrags.find((f) => f.starId === "void-entry");
  return {
    emergingFrags,
    emergeQueue,
    voidX: voidNode?.x ?? 0,
    voidY: voidNode?.y ?? 0,
  };
}

// ══════════════════════════════════════
//  Connections + energy dots
// ══════════════════════════════════════

export function buildConnData(
  emergingFrags: EmergingFrag[],
  connections: Array<{ star1Id: string; star2Id: string }>,
): ConnData[] {
  const result: ConnData[] = [];
  for (const conn of connections) {
    const s1 = emergingFrags.find((f) => f.starId === conn.star1Id);
    const s2 = emergingFrags.find((f) => f.starId === conn.star2Id);
    if (!s1 || !s2) continue;
    result.push({
      s1,
      s2,
      c1: s1.color,
      c2: s2.color,
      isInterGroup: s1.groupArea !== s2.groupArea,
    });
  }
  return result;
}

export function createEDots(connData: ConnData[]): EDot[] {
  const result: EDot[] = [];
  connData.forEach((cd, i) => {
    const count = cd.isInterGroup
      ? cDots.interGroupCount
      : cDots.intraGroupCount;
    for (let j = 0; j < count; j++) {
      const baseSpeed =
        cDots.baseSpeed[0] +
        Math.random() * (cDots.baseSpeed[1] - cDots.baseSpeed[0]);
      const direction = cDots.bidirectional && j % 2 === 0 ? 1 : -1;
      result.push({
        connIdx: i,
        progress: Math.random(),
        speed: baseSpeed * direction,
        size: cDots.size[0] + Math.random() * (cDots.size[1] - cDots.size[0]),
        alpha:
          cDots.alpha[0] + Math.random() * (cDots.alpha[1] - cDots.alpha[0]),
        color: j % 2 === 0 ? cd.c1 : cd.c2,
      });
    }
  });
  return result;
}

// ══════════════════════════════════════
//  Emergence phase transitions
// ══════════════════════════════════════

export function updateEmergence(
  time: number,
  emergingFrags: EmergingFrag[],
  emergeQueue: EmergingFrag[],
): void {
  const voidEf = emergingFrags.find((f) => f.starId === "void-entry");
  if (voidEf && voidEf.phase === "hidden") voidEf.phase = "star";

  for (const ef of emergingFrags) {
    if (ef.phase === "hidden" || ef.phase === "star") continue;
    const elapsed = time - ef.phaseStart;
    if (ef.phase === "emerging" && elapsed >= cEmergence.emerge) {
      ef.phase = "lingering";
      ef.phaseStart = time;
    } else if (ef.phase === "lingering" && elapsed >= cEmergence.linger) {
      ef.phase = "crystallizing";
      ef.phaseStart = time;
    } else if (
      ef.phase === "crystallizing" &&
      elapsed >= cEmergence.crystallize
    ) {
      ef.phase = "star";
    }
  }
}

// ══════════════════════════════════════
//  Drawing functions
// ══════════════════════════════════════

export function drawConnectionLines(
  ctx: CanvasRenderingContext2D,
  connData: ConnData[],
  time: number,
) {
  for (const cd of connData) {
    const { s1, s2, c1, c2 } = cd;
    if (s1.phase === "hidden" || s2.phase === "hidden") continue;
    const midC = {
      r: (c1.r + c2.r) / 2,
      g: (c1.g + c2.g) / 2,
      b: (c1.b + c2.b) / 2,
    };
    const bothRead = s1.read && s2.read;
    const baseAlpha = bothRead ? cConn.baseAlpha.read : cConn.baseAlpha.unread;
    const pulse =
      0.7 + cConn.pulseAmp * Math.sin(time * cConn.pulseFreq + s1.x * 0.003);
    const alpha = baseAlpha * pulse;

    // Outer glow
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.strokeStyle = `rgba(${c1.r},${c1.g},${c1.b},${alpha * cConn.outerGlow.alphaMul})`;
    ctx.lineWidth = cConn.outerGlow.lineWidth;
    ctx.stroke();

    // Dashed line
    const g = ctx.createLinearGradient(s1.x, s1.y, s2.x, s2.y);
    g.addColorStop(0, `rgba(${c1.r},${c1.g},${c1.b},${alpha})`);
    g.addColorStop(0.5, `rgba(${midC.r},${midC.g},${midC.b},${alpha})`);
    g.addColorStop(1, `rgba(${c2.r},${c2.g},${c2.b},${alpha})`);
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.strokeStyle = g;
    ctx.lineWidth = bothRead
      ? cConn.mainLine.lineWidth.read
      : cConn.mainLine.lineWidth.unread;
    ctx.setLineDash(cConn.mainLine.dash);
    ctx.lineDashOffset =
      -time *
      (bothRead
        ? cConn.mainLine.dashSpeed.read
        : cConn.mainLine.dashSpeed.unread);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function drawEDots(
  ctx: CanvasRenderingContext2D,
  eDots: EDot[],
  connData: ConnData[],
  time: number,
) {
  for (const dot of eDots) {
    dot.progress += dot.speed;
    if (dot.progress > 1) dot.progress -= 1;
    if (dot.progress < 0) dot.progress += 1;
    const cd = connData[dot.connIdx];
    if (!cd || cd.s1.phase === "hidden" || cd.s2.phase === "hidden") continue;
    const bothRead = cd.s1.read && cd.s2.read;
    const t = dot.progress;
    const ease = 1 - Math.pow(2 * t - 1, 2); // ease near center, slow near ends
    const pulse =
      0.5 + 0.5 * Math.sin(time * cDots.pulseFreq + dot.progress * Math.PI * 3);
    const a =
      dot.alpha *
      pulse *
      (bothRead ? 1 : cDots.unreadAlphaMul) *
      (0.6 + 0.4 * ease);
    const x = cd.s1.x + (cd.s2.x - cd.s1.x) * t;
    const y = cd.s1.y + (cd.s2.y - cd.s1.y) * t;
    const g = ctx.createRadialGradient(
      x,
      y,
      0,
      x,
      y,
      dot.size * cDots.glowRadiusMul,
    );
    g.addColorStop(
      0,
      `rgba(${dot.color.r},${dot.color.g},${dot.color.b},${a})`,
    );
    g.addColorStop(
      0.4,
      `rgba(${dot.color.r},${dot.color.g},${dot.color.b},${a * 0.3})`,
    );
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(x, y, dot.size * 5, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, dot.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fill();
  }
}

export function drawFragmentStars(
  ctx: CanvasRenderingContext2D,
  emergingFrags: EmergingFrag[],
  resonances: Resonance[],
  time: number,
) {
  for (const ef of emergingFrags) {
    if (ef.phase === "hidden") continue;
    if (ef.starId === "void-entry") continue;

    const isCrystallizing = ef.phase === "crystallizing";
    const isEmerging = ef.phase === "emerging" || ef.phase === "lingering";
    const elapsed = time - ef.phaseStart;

    let crystalScale = 1;
    if (isCrystallizing) {
      crystalScale = Math.min(1, elapsed / cEmergence.crystallize);
      crystalScale = 1 - Math.pow(1 - crystalScale, 3);
    } else if (isEmerging) {
      crystalScale = 0;
    }

    const breath =
      1 +
      Math.sin(time * cStars.breathFreq + ef.id.charCodeAt(3)) *
        cStars.breathAmp;
    const unreadPulse =
      !ef.read && ef.phase === "star"
        ? 1 + Math.sin(time * cStars.unreadPulseFreq) * cStars.unreadPulseAmp
        : 1;
    const bright =
      ef.brightness *
      (ef.read ? 1.0 : cStars.unreadBrightnessBoost) *
      unreadPulse;
    const twinkle =
      ef.phase === "star"
        ? Math.sin(time * cStars.twinkleFreq + ef.id.charCodeAt(5)) *
          cStars.twinkleAmp
        : 0;
    const eff = bright + twinkle;
    const proxBoost = 1 + ef.proximity * cStars.proximityBoostMul;
    let resBoost = 1;
    for (const r of resonances) {
      if (r.starId !== ef.starId) continue;
      const resElapsed = time - (r.startTime + r.delay);
      if (resElapsed < 0 || resElapsed > r.duration) continue;
      const resT = resElapsed / r.duration;
      resBoost =
        1 + (1 - resT) * Math.sin(resT * Math.PI) * cStars.resonanceBoost;
    }
    const cs = ef.size * breath * crystalScale * (1 + (resBoost - 1) * 0.3);
    if (crystalScale < 0.01) continue;

    const halo = cStars.halo;

    // Super-outer bloom
    const soR = cs * halo.superOuterBloom;
    const sog = ctx.createRadialGradient(ef.x, ef.y, cs * 5, ef.x, ef.y, soR);
    sog.addColorStop(
      0,
      `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.02 * proxBoost})`,
    );
    sog.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, soR, 0, Math.PI * 2);
    ctx.fillStyle = sog;
    ctx.fill();

    // Outer halo
    const oR = cs * halo.outerHalo;
    const og = ctx.createRadialGradient(ef.x, ef.y, cs * 2, ef.x, ef.y, oR);
    og.addColorStop(
      0,
      `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.08 * proxBoost})`,
    );
    og.addColorStop(
      0.5,
      `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.03 * proxBoost})`,
    );
    og.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, oR, 0, Math.PI * 2);
    ctx.fillStyle = og;
    ctx.fill();

    // Mid halo
    const mR = cs * halo.midHalo;
    const mg = ctx.createRadialGradient(ef.x, ef.y, cs, ef.x, ef.y, mR);
    mg.addColorStop(
      0,
      `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.5 * proxBoost})`,
    );
    mg.addColorStop(
      0.5,
      `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.12 * proxBoost})`,
    );
    mg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, mR, 0, Math.PI * 2);
    ctx.fillStyle = mg;
    ctx.fill();

    // Inner glow
    const igR = cs * halo.innerGlow;
    const igg = ctx.createRadialGradient(ef.x, ef.y, cs * 0.3, ef.x, ef.y, igR);
    igg.addColorStop(
      0,
      `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.65 * proxBoost})`,
    );
    igg.addColorStop(
      0.4,
      `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${eff * 0.3 * proxBoost})`,
    );
    igg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, igR, 0, Math.PI * 2);
    ctx.fillStyle = igg;
    ctx.fill();

    // Unread ring
    if (!ef.read && ef.phase === "star") {
      const ring = cStars.unreadRing;
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, mR + ring.radiusOffset, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${ef.color.r},${ef.color.g},${ef.color.b},${ring.alpha + unreadPulse * 0.25})`;
      ctx.lineWidth = ring.lineWidth;
      ctx.stroke();
    }

    // Core + inner point
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, cs, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${eff})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, cs * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.fill();
  }
}
