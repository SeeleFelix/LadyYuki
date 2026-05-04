import type { EmergingFrag, IgnitionParticle } from "./types";
import type { SpaceViewport } from "$lib/types/space";

// ══════════════════════════════════════════
//  Ignition system — particle burst + shake
// ══════════════════════════════════════════

export interface IgnitionSystem {
  particles: IgnitionParticle[];
  shake: number;
}

export function createIgnitionSystem(): IgnitionSystem {
  return { particles: [], shake: 0 };
}

export function updateIgnition(sys: IgnitionSystem, dt: number): void {
  for (const p of sys.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  sys.particles = sys.particles.filter((p) => p.life > 0);
  sys.shake = Math.max(0, sys.shake - dt * 40);
}

export function spawnIgnitionBurst(
  sys: IgnitionSystem,
  x: number,
  y: number,
): void {
  sys.shake = 18;
  const colors = [
    { r: 220, g: 210, b: 255 },
    { r: 180, g: 160, b: 240 },
    { r: 255, g: 255, b: 255 },
    { r: 160, g: 180, b: 255 },
    { r: 200, g: 180, b: 240 },
  ];
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 400 + Math.random() * 900;
    sys.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3 + Math.random() * 0.5,
      maxLife: 0.3 + Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

// ══════════════════════════════════════════
//  Void Gate — vortex → fissure → ring
// ══════════════════════════════════════════

export function drawVoidGate(
  ctx: CanvasRenderingContext2D,
  emergingFrags: EmergingFrag[],
  ignitionAge: number,
  time: number,
  mouseSpaceX: number,
  mouseSpaceY: number,
  viewport: SpaceViewport,
  canvas: HTMLCanvasElement,
  readCount: number,
) {
  const ef = emergingFrags.find((f) => f.starId === "void-entry");
  if (!ef || ef.phase === "hidden") return;

  const cx = ef.x,
    cy = ef.y;
  const cs = ef.size;
  const breathCycle = Math.sin(time * 0.25) * 0.5 + 0.5;

  // Proximity for glow
  const dist = Math.hypot(mouseSpaceX - cx, mouseSpaceY - cy);
  const prox = Math.max(0, 1 - dist / 350);

  if (ignitionAge <= 0) {
    const sx = (cx - viewport.x) * viewport.zoom + canvas.width / 2;
    const sy = (cy - viewport.y) * viewport.zoom + canvas.height / 2;
    drawVortex(ctx, sx, sy, time, canvas);
  } else if (ignitionAge < 0.3) {
    drawFissure(ctx, cx, cy, cs, ignitionAge, time, prox);
  } else {
    drawRing(ctx, cx, cy, cs, time, breathCycle, prox, readCount, ignitionAge);
  }
}

// ── Vortex — screen-filling abyssal chaos ──
function drawVortex(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number,
  canvas: HTMLCanvasElement,
) {
  // Use screen-space to fill entire view
  const w = canvas.width;
  const h = canvas.height;
  const maxDim = Math.max(w, h);

  // Vast, faint purple haze — screen filling
  const hazeGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim * 1.2);
  hazeGrad.addColorStop(0, `rgba(40,20,80,${0.06})`);
  hazeGrad.addColorStop(0.3, `rgba(30,15,60,${0.04})`);
  hazeGrad.addColorStop(0.6, `rgba(20,10,50,${0.02})`);
  hazeGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = hazeGrad;
  ctx.fillRect(0, 0, w, h);

  // Two slowly rotating asymmetrical blobs — barely visible
  for (let i = 0; i < 2; i++) {
    const angle = time * 0.05 * (i === 0 ? 1 : -1);
    const ox = cx + Math.cos(angle) * maxDim * 0.25;
    const oy = cy + Math.sin(angle) * maxDim * 0.25;
    const r = maxDim * (0.4 + i * 0.15);
    const a = 0.04 - i * 0.01;

    const blob = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
    blob.addColorStop(0, `rgba(60,30,120,${a})`);
    blob.addColorStop(0.5, `rgba(40,15,80,${a * 0.4})`);
    blob.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = blob;
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Core — dark point where the void entrance is
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim * 0.05);
  coreGrad.addColorStop(0, `rgba(60,30,110,${0.08})`);
  coreGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, maxDim * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

// ── Fissure — crack of light splitting open ──
function drawFissure(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cs: number,
  t: number,
  time: number,
  prox: number,
) {
  const progress = Math.min(1, t / 0.3);
  const fissureH = cs * 4 + progress * cs * 30;
  const fissureW = cs * 2 + progress * cs * 6;
  const alpha = progress * 0.85;

  ctx.save();
  ctx.translate(cx, cy);

  // Vertical beam — bright white-violet
  const beamGrad = ctx.createLinearGradient(0, -fissureH, 0, fissureH);
  beamGrad.addColorStop(0, "rgba(0,0,0,0)");
  beamGrad.addColorStop(0.3, `rgba(180,150,240,${alpha * 0.5})`);
  beamGrad.addColorStop(0.48, `rgba(255,250,255,${alpha})`);
  beamGrad.addColorStop(0.5, `rgba(255,255,255,${alpha * 1.1})`);
  beamGrad.addColorStop(0.52, `rgba(255,250,255,${alpha})`);
  beamGrad.addColorStop(0.7, `rgba(180,150,240,${alpha * 0.5})`);
  beamGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = beamGrad;
  ctx.fillRect(-fissureW / 2, -fissureH, fissureW, fissureH * 2);

  // Core flare — expanding bright point
  const flareR = cs * 2 + progress * cs * 8;
  const flareGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, flareR);
  flareGrad.addColorStop(0, `rgba(255,255,255,${alpha})`);
  flareGrad.addColorStop(0.3, `rgba(220,200,255,${alpha * 0.6})`);
  flareGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = flareGrad;
  ctx.beginPath();
  ctx.arc(0, 0, flareR, 0, Math.PI * 2);
  ctx.fill();

  // Stretching vortex arcs
  for (let i = 0; i < 3; i++) {
    const rot =
      time * (0.12 + i * 0.06) * (i % 2 === 0 ? 1 : -1) + progress * 2;
    const rx = cs * 6 * (1 + i * 0.5) * (1 + progress * 0.6);
    const ry = rx * 0.4 * (1 - progress * 0.6);
    const a = (0.15 - progress * 0.1) * (1 + prox * 0.3);

    ctx.save();
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(160,140,220,${a})`;
    ctx.lineWidth = 1.5 * (1 - progress * 0.5);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

// ── Ring — fragmented light orbiting dark core ──
function drawRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cs: number,
  time: number,
  breathCycle: number,
  prox: number,
  readCount: number,
  ignitionAge: number,
) {
  const ringR = cs * 10 + Math.sin(time * 0.3) * cs;
  const fragmentCount = 8 + Math.min(readCount, 16);
  const rotSpeed = 0.08;

  // Heartbeat pulse: 3 pulses after explosion, whisper on the 3rd
  const pulseAge = Math.max(0, ignitionAge - 0.3);
  const pulseCycle = (pulseAge % 1.0) / 1.0; // 0→1 over 1s
  const pulseIntensity = Math.sin(pulseCycle * Math.PI); // 0→1→0
  const pulseBoost = pulseAge < 3.0 ? 1 + pulseIntensity * 0.4 : 1;

  ctx.save();
  ctx.translate(cx, cy);

  // Dark core — absorbs light, pulses slightly
  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, cs * 2 * pulseBoost);
  coreGrad.addColorStop(0, "rgba(10,5,20,0.9)");
  coreGrad.addColorStop(0.5, `rgba(40,30,80,${0.4 * pulseBoost})`);
  coreGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, cs * 2 * pulseBoost, 0, Math.PI * 2);
  ctx.fill();

  // Fragmented ring
  const pulseR = ringR * pulseBoost;
  for (let i = 0; i < fragmentCount; i++) {
    const baseAngle = (i / fragmentCount) * Math.PI * 2;
    const wobble = Math.sin(time * 1.5 + i * 2.3) * 0.15;
    const angle = baseAngle + time * rotSpeed + wobble;
    const arcLen = ((Math.PI * 2) / fragmentCount) * 0.7;
    const startAngle = angle - arcLen / 2;
    const endAngle = angle + arcLen / 2;

    const fragBrightness =
      0.5 + breathCycle * 0.3 + Math.sin(time * 2 + i * 1.7) * 0.15;
    const a = fragBrightness * 0.7 * pulseBoost;

    // Fragment glow
    ctx.beginPath();
    ctx.arc(0, 0, pulseR, startAngle, endAngle);
    ctx.strokeStyle = `rgba(190,170,240,${a})`;
    ctx.lineWidth = 4;
    ctx.shadowColor = `rgba(170,150,230,${a * 0.5})`;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Fragment core
    ctx.beginPath();
    ctx.arc(0, 0, pulseR, startAngle, endAngle);
    ctx.strokeStyle = `rgba(240,230,255,${a * 1.2})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Orbital dots at fragment tips
  for (let i = 0; i < fragmentCount; i++) {
    const angle = (i / fragmentCount) * Math.PI * 2 + time * rotSpeed;
    const dotX = Math.cos(angle) * pulseR;
    const dotY = Math.sin(angle) * pulseR;
    const dotA = 0.5 + breathCycle * 0.2;
    const dg = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, cs * 0.8);
    dg.addColorStop(0, `rgba(255,255,255,${dotA})`);
    dg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(dotX, dotY, cs * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Proximity glow from dark core
  if (prox > 0) {
    const pg = ctx.createRadialGradient(cx, cy, cs, cx, cy, ringR * 1.5);
    pg.addColorStop(0, `rgba(140,120,200,${prox * 0.06})`);
    pg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ══════════════════════════════════════════
//  Cosmic Ignition — explosion + shockwave
// ══════════════════════════════════════════

export function drawIgnition(
  ctx: CanvasRenderingContext2D,
  emergingFrags: EmergingFrag[],
  ignitionAge: number,
  ignitionParticles: IgnitionParticle[],
  viewport: SpaceViewport,
  canvas: HTMLCanvasElement,
) {
  if (ignitionAge <= 0 || ignitionAge > 5) return;
  const ef = emergingFrags.find((f) => f.starId === "void-entry");
  if (!ef) return;
  const cx = ef.x,
    cy = ef.y;
  const t = ignitionAge;
  const maxDim = Math.max(canvas.width, canvas.height) / viewport.zoom;

  // Center flash
  if (t < 0.25) {
    const flashA = (1 - t / 0.25) * 0.9;
    const flashR = maxDim * 0.8;
    const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashR);
    fg.addColorStop(0, `rgba(255,255,255,${flashA})`);
    fg.addColorStop(0.04, `rgba(220,210,255,${flashA * 0.5})`);
    fg.addColorStop(0.15, `rgba(140,120,220,${flashA * 0.12})`);
    fg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = fg;
    ctx.fillRect(cx - flashR, cy - flashR, flashR * 2, flashR * 2);
  }

  // Shockwave rings
  const waveSpeed = maxDim / 5;
  const RING_COUNT = 5;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < RING_COUNT; i++) {
    const startT = 0.05 + i * 0.15;
    const ringLife = 4;
    if (t < startT || t > startT + ringLife) continue;
    const age = t - startT;
    const ringProgress = age / ringLife;
    const eased = 1 - (1 - ringProgress) * (1 - ringProgress);
    const ringR = eased * waveSpeed * ringLife;
    const intensity =
      age < 0.3 ? age / 0.3 : 1 - (age - 0.3) / (ringLife - 0.3);
    const a = intensity * 0.75;

    // Outer glow
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(140,120,210,${a * 0.45})`;
    ctx.lineWidth = 18;
    ctx.shadowColor = `rgba(150,130,220,${a * 0.5})`;
    ctx.shadowBlur = 45;
    ctx.stroke();

    // Mid ring
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(210,190,245,${a * 0.75})`;
    ctx.lineWidth = 4;
    ctx.shadowColor = `rgba(190,170,240,${a * 0.6})`;
    ctx.shadowBlur = 20;
    ctx.stroke();

    // Core wavefront
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;
    ctx.stroke();
  }
  ctx.restore();

  // Particles
  for (const p of ignitionParticles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8);
    pg.addColorStop(0, `rgba(255,255,255,${alpha})`);
    pg.addColorStop(
      0.5,
      `rgba(${p.color.r},${p.color.g},${p.color.b},${alpha * 0.5})`,
    );
    pg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = pg;
    ctx.fill();
  }
}
