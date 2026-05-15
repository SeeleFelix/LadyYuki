import type { Whisper, EmergingFrag } from "../types";
import { easeInOutQuad } from "../theme";
import { theme } from "$lib/canvas/theme";

export const WHISPER_DURATION = theme.whispers.duration;

export function updateWhispers(
  whispers: Whisper[],
  emergingFrags: EmergingFrag[],
  emergeQueue: EmergingFrag[],
  time: number,
): { whispers: Whisper[]; emergeQueue: EmergingFrag[] } {
  for (const w of whispers) {
    w.progress += 1 / 60 / WHISPER_DURATION;
    w.life -= 1 / 60;
    if (w.progress >= 0.9 && w.progress - 1 / 60 / WHISPER_DURATION < 0.9) {
      let best: EmergingFrag | null = null;
      let bestDist = Infinity;
      for (const ef of emergingFrags) {
        if (ef.phase !== "hidden" || ef.starId === "void-entry") continue;
        const d = Math.hypot(ef.x - w.tx, ef.y - w.ty);
        if (d < bestDist) {
          bestDist = d;
          best = ef;
        }
      }
      if (best) {
        best.phase = "emerging";
        best.phaseStart = time;
        emergeQueue = emergeQueue.filter((f) => f.starId !== best.starId);
      }
    }
  }
  whispers = whispers.filter((w) => w.life > 0 && w.progress < 1);
  return { whispers, emergeQueue };
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

    const ws = theme.whispers;
    const alpha =
      w.progress < ws.fadeInThreshold
        ? w.progress / ws.fadeInThreshold
        : w.progress > ws.fadeOutThreshold
          ? (1 - w.progress) / (1 - ws.fadeOutThreshold)
          : 1;
    const a = alpha * ws.alpha;

    const angle = Math.atan2(w.ty - w.sy, w.tx - w.sx);

    // Long sweeping trail
    const trailLen = ws.trailLength;
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
    ctx.lineWidth = ws.lineWidth;
    ctx.stroke();

    // Bright core at head
    const coreR = ws.coreRadius;
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
    for (let i = 0; i < ws.sparkCount; i++) {
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
