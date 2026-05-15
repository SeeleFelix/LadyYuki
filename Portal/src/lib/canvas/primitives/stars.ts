import type { Star } from "$lib/types/agent";

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
