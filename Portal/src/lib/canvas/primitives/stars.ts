import { theme } from "../theme";
import type {
  EmergingFrag,
  Resonance,
  BgStar,
} from "../../components/living-space/types";
import type { Star } from "$lib/types/agent";

const cStars = theme.constellation.fragmentStars;
const halo = cStars.halo;

export type HierarchyTier = "l0" | "l1" | "l2" | "l3";

export interface HierarchyConfig {
  tier: HierarchyTier;
  glowRadiusMul: number;
  bloomAlpha: number;
  coreAlpha: number;
  showUnreadRing: boolean;
}

const HIERARCHY: Record<HierarchyTier, HierarchyConfig> = {
  l0: {
    tier: "l0",
    glowRadiusMul: 14,
    bloomAlpha: 0.04,
    coreAlpha: 1.0,
    showUnreadRing: false,
  },
  l1: {
    tier: "l1",
    glowRadiusMul: 8,
    bloomAlpha: 0.02,
    coreAlpha: 0.85,
    showUnreadRing: false,
  },
  l2: {
    tier: "l2",
    glowRadiusMul: 5,
    bloomAlpha: 0.01,
    coreAlpha: 0.6,
    showUnreadRing: true,
  },
  l3: {
    tier: "l3",
    glowRadiusMul: 2,
    bloomAlpha: 0.005,
    coreAlpha: 0.4,
    showUnreadRing: false,
  },
};

export function getHierarchyConfig(tier: HierarchyTier): HierarchyConfig {
  return HIERARCHY[tier];
}

export function drawFragmentStar(
  ctx: CanvasRenderingContext2D,
  ef: EmergingFrag,
  resonances: Resonance[],
  time: number,
  isVoidEntry: boolean,
) {
  if (ef.phase === "hidden") return;
  if (isVoidEntry) return;

  const isCrystallizing = ef.phase === "crystallizing";
  const isEmerging = ef.phase === "emerging" || ef.phase === "lingering";
  const elapsed = time - ef.phaseStart;

  let crystalScale = 1;
  if (isCrystallizing) {
    crystalScale = Math.min(
      1,
      elapsed / theme.constellation.emergence.crystallize,
    );
    crystalScale = 1 - Math.pow(1 - crystalScale, 3);
  } else if (isEmerging) {
    crystalScale = 0;
  }

  const breath =
    1 +
    Math.sin(time * cStars.breathFreq + ef.id.charCodeAt(3)) * cStars.breathAmp;
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
  if (crystalScale < 0.01) return;

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
  const og = ctx.createRadialGradient(
    star.x,
    star.y,
    cs * 2,
    star.x,
    star.y,
    oR,
  );
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

export function drawBgStar(
  ctx: CanvasRenderingContext2D,
  star: BgStar,
  time: number,
  fieldBrightness: number,
  _showFlare: boolean,
) {
  const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
  const baseRange =
    star.type === "dust" ? 0.15 : star.type === "beacon" ? 0.35 : 0.3;
  const a =
    star.opacity * (1 - baseRange + twinkle * baseRange) * fieldBrightness;
  const col = theme.starColorTemp(Math.max(0, Math.min(1, star.temp)));
  const sz = star.size;

  if (star.type === "dust") {
    ctx.beginPath();
    ctx.arc(star.wx, star.wy, sz, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${a})`;
    ctx.fill();
  } else if (star.type === "field") {
    ctx.beginPath();
    ctx.arc(star.wx, star.wy, sz * 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${a * 0.04})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(star.wx, star.wy, sz, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${a})`;
    ctx.fill();
  } else {
    // beacon
    ctx.beginPath();
    ctx.arc(star.wx, star.wy, sz * 6, 0, Math.PI * 2);
    const og = ctx.createRadialGradient(
      star.wx,
      star.wy,
      sz,
      star.wx,
      star.wy,
      sz * 6,
    );
    og.addColorStop(0, `rgba(${col.r},${col.g},${col.b},${a * 0.15})`);
    og.addColorStop(0.6, `rgba(${col.r},${col.g},${col.b},${a * 0.03})`);
    og.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = og;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(star.wx, star.wy, sz * 3, 0, Math.PI * 2);
    const mg = ctx.createRadialGradient(
      star.wx,
      star.wy,
      sz * 0.5,
      star.wx,
      star.wy,
      sz * 3,
    );
    mg.addColorStop(0, `rgba(${col.r},${col.g},${col.b},${a * 0.4})`);
    mg.addColorStop(0.5, `rgba(${col.r},${col.g},${col.b},${a * 0.1})`);
    mg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = mg;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(star.wx, star.wy, sz, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fill();
  }
}
