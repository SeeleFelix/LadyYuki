import type { Star } from "$lib/types/agent";

export function drawAgentConnection(
  ctx: CanvasRenderingContext2D,
  s1: Star,
  s2: Star,
  opacity: number,
  time: number,
) {
  const pulse = 0.7 + 0.15 * Math.sin(time * 0.8);

  // Outer glow
  ctx.beginPath();
  ctx.moveTo(s1.x, s1.y);
  ctx.lineTo(s2.x, s2.y);
  ctx.strokeStyle = `rgba(139,92,246,${opacity * 0.25 * pulse})`;
  ctx.lineWidth = 8;
  ctx.stroke();

  // Dashed line with pink-purple gradient
  const g = ctx.createLinearGradient(s1.x, s1.y, s2.x, s2.y);
  g.addColorStop(0, `rgba(139,92,246,${opacity * pulse})`);
  g.addColorStop(0.5, `rgba(236,72,153,${opacity * 0.6 * pulse})`);
  g.addColorStop(1, `rgba(59,130,246,${opacity * pulse})`);
  ctx.beginPath();
  ctx.moveTo(s1.x, s1.y);
  ctx.lineTo(s2.x, s2.y);
  ctx.strokeStyle = g;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 12]);
  ctx.lineDashOffset = -time * 20;
  ctx.stroke();
  ctx.setLineDash([]);
}
