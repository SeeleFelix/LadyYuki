import { theme, easeInOutQuad } from "$lib/canvas/theme";

export { easeInOutQuad };

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

export function drawClickRipple(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  age: number,
  duration: number,
) {
  const t = age / duration;
  const { startRadius, endRadius, maxAlpha } = theme.interaction.clickRipple;
  const radius = startRadius + t * (endRadius - startRadius);
  const alpha = (1 - t) * maxAlpha;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 2 * (1 - t);
  ctx.stroke();
}
