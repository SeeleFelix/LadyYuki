import { theme } from "../theme";

export function applyAtmosphericPerspective(
  color: { r: number; g: number; b: number },
  distance: number,
  maxDistance: number,
): { r: number; g: number; b: number } {
  const t = Math.min(1, distance / Math.max(1, maxDistance));
  if (t <= 0) return { ...color };
  const blueShift = theme.atmosphere.depthShift.blueShiftStrength * t;
  // Lerp toward blue-dark as distance increases
  const r = Math.floor(color.r * (1 - blueShift * 0.6));
  const g = Math.floor(color.g * (1 - blueShift * 0.35));
  const b = Math.max(color.b, Math.floor(180 + 75 * blueShift));
  return { r, g, b };
}

export function drawVignette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const maxDim = Math.max(w, h);
  const g = ctx.createRadialGradient(
    w / 2,
    h / 2,
    0,
    w / 2,
    h / 2,
    maxDim * theme.atmosphere.vignette.cutoffRatio,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(theme.atmosphere.vignette.startRatio, "rgba(0,0,0,0)");
  g.addColorStop(
    0.75,
    `rgba(0,0,0,${theme.atmosphere.vignette.edgeAlpha * 0.5})`,
  );
  g.addColorStop(1, `rgba(0,0,0,${theme.atmosphere.vignette.edgeAlpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
