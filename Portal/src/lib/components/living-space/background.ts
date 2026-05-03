import type { BgStar, Dust, Chunk, Nebula, ShootingStar } from "./types";
import type { SpaceViewport } from "$lib/types/space";
import type { EmergingFrag } from "./types";

// ══════════════════════════════════════
//  Chunk-based infinite background
// ══════════════════════════════════════

export const CHUNK_SIZE = 1200;

export function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

export function chunkSeed(cx: number, cy: number): number {
  return (cx * 374761393 + cy * 668265263) & 0x7fffffff || 1;
}

// Milky Way: diagonal band
export function milkyWayStrength(wx: number, wy: number): number {
  const dist = Math.abs(wy - 0.5 * wx) / Math.sqrt(1 + 0.25);
  const bandWidth = 800;
  return Math.exp(-(dist * dist) / (2 * bandWidth * bandWidth));
}

export function noise(x: number, y: number, s: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + s) * 43758.5453;
  return n - Math.floor(n);
}

export function starColor(temp: number): { r: number; g: number; b: number } {
  if (temp < 0.5) {
    const t = temp * 2;
    return { r: Math.floor(180 + 75 * t), g: Math.floor(200 + 55 * t), b: 255 };
  }
  const t = (temp - 0.5) * 2;
  return { r: 255, g: Math.floor(255 - 55 * t), b: Math.floor(255 - 155 * t) };
}

export function generateChunk(cx: number, cy: number): Chunk {
  const ox = cx * CHUNK_SIZE,
    oy = cy * CHUNK_SIZE;
  let s = chunkSeed(cx, cy);
  function rnd(): number {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  }

  const stars: BgStar[] = [];
  for (let i = 0; i < 800; i++) {
    let wx = ox + rnd() * CHUNK_SIZE;
    let wy = oy + rnd() * CHUNK_SIZE;
    const mw = milkyWayStrength(wx, wy);

    let type: BgStar["type"];
    let size: number;
    let opacity: number;
    let twinkleSpeed: number;
    let flare: boolean;
    let temp: number;

    if (i < 560) {
      type = "dust";
      size = 0.2 + rnd() * 0.4;
      opacity = 0.03 + rnd() * 0.13;
      twinkleSpeed = 0.1 + rnd() * 0.25;
      temp = rnd() * 0.3;
      flare = false;
    } else if (i < 760) {
      type = "field";
      size = 0.6 + rnd() * 1.0;
      opacity = 0.2 + rnd() * 0.35;
      twinkleSpeed = 0.3 + rnd() * 0.8;
      temp = rnd();
      flare = false;
    } else {
      type = "beacon";
      size = 1.5 + rnd() * 2.8;
      opacity = 0.5 + rnd() * 0.4;
      twinkleSpeed = 0.4 + rnd() * 1.2;
      temp = rnd();
      flare = rnd() < 0.15;
      if (rnd() > mw * 0.5 + 0.5) {
        wx = ox + rnd() * CHUNK_SIZE;
        wy = oy + rnd() * CHUNK_SIZE;
      }
    }

    stars.push({
      wx,
      wy,
      size,
      opacity,
      twinklePhase: rnd() * Math.PI * 2,
      twinkleSpeed,
      type,
      temp,
      flare,
    });
  }

  const dustColors = [
    { r: 139, g: 92, b: 246 },
    { r: 59, g: 130, b: 246 },
    { r: 236, g: 72, b: 153 },
    { r: 255, g: 220, b: 180 },
  ];
  const dusts: Dust[] = [];
  for (let i = 0; i < 35; i++) {
    dusts.push({
      x: ox + rnd() * CHUNK_SIZE,
      y: oy + rnd() * CHUNK_SIZE,
      size: 0.5 + rnd() * 1.5,
      alpha: 0.1 + rnd() * 0.3,
      vx: (rnd() - 0.5) * 0.3,
      vy: (rnd() - 0.5) * 0.3,
      color: dustColors[Math.floor(rnd() * dustColors.length)],
      life: Math.floor(rnd() * 300),
      maxLife: 200 + Math.floor(rnd() * 300),
    });
  }

  return { stars, dusts };
}

export function getOrCreateChunk(
  cx: number,
  cy: number,
  chunkCache: Map<string, Chunk>,
): Chunk {
  const key = chunkKey(cx, cy);
  let c = chunkCache.get(key);
  if (!c) {
    c = generateChunk(cx, cy);
    chunkCache.set(key, c);
  }
  return c;
}

export function createNebulas(
  areas: Array<{ centerX?: number; centerY?: number } | undefined>,
): Nebula[] {
  const colors = [
    { r: 139, g: 92, b: 246 },
    { r: 59, g: 130, b: 246 },
    { r: 236, g: 72, b: 153 },
    { r: 99, g: 102, b: 241 },
    { r: 6, g: 182, b: 212 },
    { r: 180, g: 130, b: 255 },
    { r: 255, g: 180, b: 100 },
  ];
  const result: Nebula[] = [];
  for (let i = 0; i < 8; i++) {
    const area = areas[i % areas.length];
    result.push({
      bx: (area?.centerX ?? -300) + (Math.random() - 0.5) * 200,
      by: (area?.centerY ?? -100) + (Math.random() - 0.5) * 150,
      radius: 500 + Math.random() * 400,
      opacity: 0.015 + Math.random() * 0.03,
      color: colors[i % colors.length],
      speed: 0.008 + Math.random() * 0.015,
      phase: Math.random() * Math.PI * 2,
      seed: Math.random() * 1000,
    });
  }
  return result;
}

// ══════════════════════════════════════
//  Drawing functions
// ══════════════════════════════════════

export function drawBgStars(
  ctx: CanvasRenderingContext2D,
  time: number,
  fieldBrightness: number,
  ignitionAge: number,
  awakenProgress: number,
  revelationPulse: number,
  emergingFrags: EmergingFrag[],
  activeChunks: string[],
  chunkCache: Map<string, Chunk>,
  viewport: SpaceViewport,
  canvas: HTMLCanvasElement,
) {
  const voidEf = emergingFrags.find((f) => f.starId === "void-entry");
  const vx = voidEf?.x ?? 0;
  const vy = voidEf?.y ?? 0;

  for (const key of activeChunks) {
    const c = chunkCache.get(key);
    if (!c) continue;
    for (const s of c.stars) {
      const sd = Math.hypot(s.wx - vx, s.wy - vy);

      // ── Star awakening: progressive reveal from void outward ──
      const maxDist = Math.max(canvas.width, canvas.height) / viewport.zoom;
      const hash = Math.abs(s.wx * 31 + s.wy * 17) % 100;
      const personalThreshold = (sd / maxDist) * 0.65 + (hash / 100) * 0.35;
      const justAwoke =
        awakenProgress - 1 / 60 < personalThreshold &&
        awakenProgress >= personalThreshold;
      const awakeAge =
        awakenProgress >= personalThreshold
          ? awakenProgress - personalThreshold
          : 0;

      let temp = s.temp - 0.15;
      let sizeMul = 0.7;
      let twitchAmp = 0.5;
      let twitchSpd = 0.6;
      let visible = awakenProgress >= personalThreshold;

      // Micro-flash at birth
      if (visible && awakeAge < 0.3) {
        const birthFade = 1 - awakeAge / 0.3;
        sizeMul += birthFade * 0.8;
        temp += birthFade * 0.3;
        twitchAmp += birthFade * 1.5;
      }

      // ── Fissure: warm wave wakes stars ──
      if (ignitionAge > 0 && ignitionAge < 0.3) {
        const waveR = (ignitionAge / 0.3) * 1200;
        if (sd < waveR) {
          const w = 1 - sd / waveR;
          sizeMul = 0.7 + w * 0.8;
          temp = s.temp - 0.15 + w * 0.35;
          twitchAmp = 0.5 + w * 1.5;
          visible = true;
        }
      }

      // ── Explosion: near-void surge ──
      if (ignitionAge >= 0.3 && ignitionAge < 2.5) {
        if (sd < 800) {
          const w = (1 - sd / 800) * Math.sin((ignitionAge * Math.PI) / 2.5);
          sizeMul = 0.7 + w * 1.1;
          temp = s.temp - 0.15 + w * 0.45;
          twitchAmp = 0.5 + w * 2.0;
          twitchSpd = 0.6 + w * 1.4;
        }
      }

      // ── Post-explosion settle ──
      if (ignitionAge >= 2.5 && ignitionAge < 5) {
        const settle = (ignitionAge - 2.5) / 2.5;
        sizeMul = 0.7 + settle * 0.3;
        temp = s.temp - 0.15 + settle * 0.15;
        twitchAmp = 0.5 + settle * 0.5;
        twitchSpd = 0.6 + settle * 0.4;
      }

      // ── Afterglow: permanent warmth near void ──
      if (ignitionAge >= 5) {
        const ag = Math.min(1, (ignitionAge - 5) / 5);
        if (sd < 400) {
          sizeMul += 0.1 * ag * (1 - sd / 400);
          temp += 0.05 * ag * (1 - sd / 400);
        }
        sizeMul = Math.max(sizeMul, 1);
      }

      // ── Revelation: global warmth, size, twinkle boost ──
      if (revelationPulse > 0) {
        temp += 0.1 * revelationPulse;
        sizeMul *= 1 + 0.15 * revelationPulse;
        twitchAmp *= 1 + 0.3 * revelationPulse;
      }

      if (!visible) continue;

      const twinkle = Math.sin(
        time * s.twinkleSpeed * twitchSpd + s.twinklePhase,
      );
      const baseRange =
        s.type === "dust" ? 0.15 : s.type === "beacon" ? 0.35 : 0.3;
      const twinkleRange = baseRange * twitchAmp;
      let a =
        s.opacity *
        (1 - twinkleRange + twinkle * twinkleRange) *
        fieldBrightness;

      // Shockwave surge: stars flash as ring passes
      if (ignitionAge > 0 && ignitionAge < 5) {
        const waveSpeed =
          Math.max(canvas.width, canvas.height) / viewport.zoom / 5;
        for (let ri = 0; ri < 5; ri++) {
          const ringR = (ignitionAge - 0.05 - ri * 0.15) * waveSpeed;
          if (ringR < 0) continue;
          if (Math.abs(sd - ringR) < 100) {
            a += 0.3 * s.opacity * (1 - Math.abs(sd - ringR) / 100);
          }
        }
      }

      const col = starColor(Math.max(0, Math.min(1, temp)));
      const sz = s.size * sizeMul;

      if (s.type === "dust") {
        ctx.beginPath();
        ctx.arc(s.wx, s.wy, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${a})`;
        ctx.fill();
      } else if (s.type === "field") {
        ctx.beginPath();
        ctx.arc(s.wx, s.wy, sz * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${a * 0.04})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s.wx, s.wy, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${a})`;
        ctx.fill();
      } else {
        const cs = sz;
        const oR = cs * 6;
        const og = ctx.createRadialGradient(s.wx, s.wy, cs, s.wx, s.wy, oR);
        og.addColorStop(0, `rgba(${col.r},${col.g},${col.b},${a * 0.15})`);
        og.addColorStop(0.6, `rgba(${col.r},${col.g},${col.b},${a * 0.03})`);
        og.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(s.wx, s.wy, oR, 0, Math.PI * 2);
        ctx.fillStyle = og;
        ctx.fill();
        const mR = cs * 3;
        const mg = ctx.createRadialGradient(
          s.wx,
          s.wy,
          cs * 0.5,
          s.wx,
          s.wy,
          mR,
        );
        mg.addColorStop(0, `rgba(${col.r},${col.g},${col.b},${a * 0.4})`);
        mg.addColorStop(0.5, `rgba(${col.r},${col.g},${col.b},${a * 0.1})`);
        mg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(s.wx, s.wy, mR, 0, Math.PI * 2);
        ctx.fillStyle = mg;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s.wx, s.wy, cs, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fill();
        if (s.flare) {
          ctx.beginPath();
          ctx.moveTo(s.wx - cs * 4, s.wy);
          ctx.lineTo(s.wx + cs * 4, s.wy);
          ctx.moveTo(s.wx, s.wy - cs * 4);
          ctx.lineTo(s.wx, s.wy + cs * 4);
          ctx.strokeStyle = `rgba(255,255,255,${a * 0.15})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  }
}

export function drawNebulas(
  ctx: CanvasRenderingContext2D,
  time: number,
  fieldBrightness: number,
  nebulas: Nebula[],
  viewport: SpaceViewport,
  canvas: HTMLCanvasElement,
) {
  for (const n of nebulas) {
    const dx = Math.sin(time * n.speed * 0.6 + n.phase) * 30;
    const dy = Math.cos(time * n.speed * 0.4 + n.phase) * 20;
    const nx = (noise(time * n.speed * 1.5, n.seed, 0) - 0.5) * 40;
    const ny = (noise(time * n.speed * 1.5, n.seed, 100) - 0.5) * 40;
    const pcx = n.bx + dx + nx,
      pcy = n.by + dy + ny;
    const pulse = 0.8 + 0.1 * Math.sin(time * n.speed * 0.8 + n.phase);
    const g = ctx.createRadialGradient(pcx, pcy, 0, pcx, pcy, n.radius);
    g.addColorStop(
      0,
      `rgba(${n.color.r},${n.color.g},${n.color.b},${n.opacity * pulse * fieldBrightness})`,
    );
    g.addColorStop(
      0.35,
      `rgba(${n.color.r},${n.color.g},${n.color.b},${n.opacity * pulse * 0.5 * fieldBrightness})`,
    );
    g.addColorStop(
      0.7,
      `rgba(${n.color.r},${n.color.g},${n.color.b},${n.opacity * pulse * 0.12 * fieldBrightness})`,
    );
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(
      viewport.x - canvas.width / viewport.zoom,
      viewport.y - canvas.height / viewport.zoom,
      (canvas.width / viewport.zoom) * 2,
      (canvas.height / viewport.zoom) * 2,
    );
  }
}

export function drawMilkyWay(
  ctx: CanvasRenderingContext2D,
  fieldBrightness: number,
  viewport: SpaceViewport,
  canvas: HTMLCanvasElement,
) {
  const hw = canvas.width / viewport.zoom / 2;
  const minX = viewport.x - hw,
    maxX = viewport.x + hw;
  for (let i = 0; i < 6; i++) {
    const cx = minX + (maxX - minX) * (i / 5);
    const cy = 0.5 * cx;
    const g = ctx.createRadialGradient(cx, cy, 100, cx, cy, 700);
    g.addColorStop(0, `rgba(139,92,246,${0.015 * fieldBrightness})`);
    g.addColorStop(0.3, `rgba(59,130,246,${0.008 * fieldBrightness})`);
    g.addColorStop(0.6, `rgba(180,130,255,${0.004 * fieldBrightness})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - 700, cy - 700, 1400, 1400);
  }
}
