import { theme } from "../theme";

export function drawCrossFlare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number,
  color: { r: number; g: number; b: number },
  time: number = 0,
) {
  const len = size * 12;
  const fa = alpha * 0.35 * (0.7 + 0.3 * Math.sin(time * 1.5));

  ctx.save();
  ctx.translate(x, y);

  for (const angle of [0, Math.PI / 2]) {
    ctx.beginPath();
    ctx.moveTo(-len * Math.cos(angle), -len * Math.sin(angle));
    ctx.lineTo(len * Math.cos(angle), len * Math.sin(angle));
    ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${fa})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-len * 0.6 * Math.cos(angle), -len * 0.6 * Math.sin(angle));
    ctx.lineTo(len * 0.6 * Math.cos(angle), len * 0.6 * Math.sin(angle));
    ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${fa * 0.4})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  ctx.restore();
}

export function drawClickRipple(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  age: number,
  duration: number,
) {
  if (age >= duration) return;
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
