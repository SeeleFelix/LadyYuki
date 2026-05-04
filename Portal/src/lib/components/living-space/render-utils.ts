export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
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
    maxDim * 0.65,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.4, "rgba(0,0,0,0)");
  g.addColorStop(0.75, "rgba(0,0,0,0.35)");
  g.addColorStop(1, "rgba(0,0,0,0.7)");
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
  if (age >= duration) return;
  const t = age / duration;
  const radius = 20 + t * 120;
  const alpha = (1 - t) * 0.7;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 2 * (1 - t);
  ctx.stroke();
}

export function drawCrossFlare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number,
  color: { r: number; g: number; b: number },
) {
  const len = size * 12;
  const fa = alpha * 0.3;
  ctx.save();
  ctx.translate(x, y);
  for (const ang of [0, Math.PI / 2]) {
    ctx.beginPath();
    ctx.moveTo(-len * Math.cos(ang), -len * Math.sin(ang));
    ctx.lineTo(len * Math.cos(ang), len * Math.sin(ang));
    ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${fa})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-len * 0.6 * Math.cos(ang), -len * 0.6 * Math.sin(ang));
    ctx.lineTo(len * 0.6 * Math.cos(ang), len * 0.6 * Math.sin(ang));
    ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${fa * 0.4})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();
}
