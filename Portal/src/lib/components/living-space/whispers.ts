import type { Whisper } from "./types";

export const WHISPER_DURATION = 3.5;

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function drawWhispers(
  ctx: CanvasRenderingContext2D,
  whispers: Whisper[],
  time: number,
) {
  for (const w of whispers) {
    const t = easeInOutQuad(w.progress);
    const wx = w.sx + (w.tx - w.sx) * t;
    const wy = w.sy + (w.ty - w.sy) * t;

    const alpha =
      w.progress < 0.08
        ? w.progress / 0.08
        : w.progress > 0.85
          ? (1 - w.progress) / 0.15
          : 1;
    const a = alpha * 0.85;

    const angle = Math.atan2(w.ty - w.sy, w.tx - w.sx);

    // Long sweeping trail
    const trailLen = 160;
    const tx1 = wx - Math.cos(angle) * trailLen;
    const ty1 = wy - Math.sin(angle) * trailLen;
    const trailGrad = ctx.createLinearGradient(wx, wy, tx1, ty1);
    trailGrad.addColorStop(0, `rgba(255,255,255,${a})`);
    trailGrad.addColorStop(
      0.15,
      `rgba(${w.color.r},${w.color.g},${w.color.b},${a * 0.7})`,
    );
    trailGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(tx1, ty1);
    ctx.strokeStyle = trailGrad;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Bright core at head
    const coreR = 30;
    const pg = ctx.createRadialGradient(wx, wy, 0, wx, wy, coreR);
    pg.addColorStop(0, `rgba(255,255,255,${a})`);
    pg.addColorStop(
      0.2,
      `rgba(${w.color.r},${w.color.g},${w.color.b},${a * 0.6})`,
    );
    pg.addColorStop(
      0.6,
      `rgba(${w.color.r},${w.color.g},${w.color.b},${a * 0.1})`,
    );
    pg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(wx, wy, coreR, 0, Math.PI * 2);
    ctx.fillStyle = pg;
    ctx.fill();

    // Spark particles along trail
    for (let i = 0; i < 4; i++) {
      const sparkDist = (i + 1) * 0.2 * trailLen;
      const sx = wx - Math.cos(angle) * sparkDist;
      const sy = wy - Math.sin(angle) * sparkDist;
      const sparkR = 1.5 + Math.random();
      const sparkA = a * (0.3 + Math.random() * 0.3);
      ctx.beginPath();
      ctx.arc(sx, sy, sparkR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${sparkA})`;
      ctx.fill();
    }
  }
}
