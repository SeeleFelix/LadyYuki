import { theme } from "../theme";
import type {
  EmergingFrag,
  ConnData,
  EDot,
} from "../../components/living-space/types";
import type { Star } from "$lib/types/agent";

const cConn = theme.constellation.connection;
const cDots = theme.constellation.energyDots;

export function drawConnectionLine(
  ctx: CanvasRenderingContext2D,
  s1: EmergingFrag,
  s2: EmergingFrag,
  time: number,
) {
  if (s1.phase === "hidden" || s2.phase === "hidden") return;

  const { c1, c2 } = { c1: s1.color, c2: s2.color };
  const midC = {
    r: (c1.r + c2.r) / 2,
    g: (c1.g + c2.g) / 2,
    b: (c1.b + c2.b) / 2,
  };
  const bothRead = s1.read && s2.read;
  const baseAlpha = bothRead ? cConn.baseAlpha.read : cConn.baseAlpha.unread;
  const pulse =
    0.7 + cConn.pulseAmp * Math.sin(time * cConn.pulseFreq + s1.x * 0.003);
  const alpha = baseAlpha * pulse;

  // Outer glow
  ctx.beginPath();
  ctx.moveTo(s1.x, s1.y);
  ctx.lineTo(s2.x, s2.y);
  ctx.strokeStyle = `rgba(${c1.r},${c1.g},${c1.b},${alpha * cConn.outerGlow.alphaMul})`;
  ctx.lineWidth = cConn.outerGlow.lineWidth;
  ctx.stroke();

  // Dashed line
  const g = ctx.createLinearGradient(s1.x, s1.y, s2.x, s2.y);
  g.addColorStop(0, `rgba(${c1.r},${c1.g},${c1.b},${alpha})`);
  g.addColorStop(0.5, `rgba(${midC.r},${midC.g},${midC.b},${alpha})`);
  g.addColorStop(1, `rgba(${c2.r},${c2.g},${c2.b},${alpha})`);
  ctx.beginPath();
  ctx.moveTo(s1.x, s1.y);
  ctx.lineTo(s2.x, s2.y);
  ctx.strokeStyle = g;
  ctx.lineWidth = bothRead
    ? cConn.mainLine.lineWidth.read
    : cConn.mainLine.lineWidth.unread;
  ctx.setLineDash(cConn.mainLine.dash);
  ctx.lineDashOffset =
    -time *
    (bothRead
      ? cConn.mainLine.dashSpeed.read
      : cConn.mainLine.dashSpeed.unread);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawEnergyDots(
  ctx: CanvasRenderingContext2D,
  eDots: EDot[],
  connData: ConnData[],
  time: number,
) {
  for (const dot of eDots) {
    dot.progress += dot.speed;
    if (dot.progress > 1) dot.progress -= 1;
    if (dot.progress < 0) dot.progress += 1;

    const cd = connData[dot.connIdx];
    if (!cd || cd.s1.phase === "hidden" || cd.s2.phase === "hidden") continue;

    const bothRead = cd.s1.read && cd.s2.read;
    const t = dot.progress;
    const ease = 1 - Math.pow(2 * t - 1, 2);
    const pulse =
      0.5 + 0.5 * Math.sin(time * cDots.pulseFreq + dot.progress * Math.PI * 3);
    const a =
      dot.alpha *
      pulse *
      (bothRead ? 1 : cDots.unreadAlphaMul) *
      (0.6 + 0.4 * ease);
    const x = cd.s1.x + (cd.s2.x - cd.s1.x) * t;
    const y = cd.s1.y + (cd.s2.y - cd.s1.y) * t;

    const g = ctx.createRadialGradient(
      x,
      y,
      0,
      x,
      y,
      dot.size * cDots.glowRadiusMul,
    );
    g.addColorStop(
      0,
      `rgba(${dot.color.r},${dot.color.g},${dot.color.b},${a})`,
    );
    g.addColorStop(
      0.4,
      `rgba(${dot.color.r},${dot.color.g},${dot.color.b},${a * 0.3})`,
    );
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(x, y, dot.size * cDots.glowRadiusMul, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, dot.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fill();
  }
}

export function drawAgentConnection(
  ctx: CanvasRenderingContext2D,
  s1: Star,
  s2: Star,
  opacity: number,
  time: number,
) {
  const alpha = opacity;
  const pulse = 0.7 + 0.15 * Math.sin(time * 0.8);

  // Outer glow
  ctx.beginPath();
  ctx.moveTo(s1.x, s1.y);
  ctx.lineTo(s2.x, s2.y);
  ctx.strokeStyle = `rgba(139,92,246,${alpha * 0.25 * pulse})`;
  ctx.lineWidth = 8;
  ctx.stroke();

  // Dashed line with pink-purple gradient
  const g = ctx.createLinearGradient(s1.x, s1.y, s2.x, s2.y);
  g.addColorStop(0, `rgba(139,92,246,${alpha * pulse})`);
  g.addColorStop(0.5, `rgba(236,72,153,${alpha * 0.6 * pulse})`);
  g.addColorStop(1, `rgba(59,130,246,${alpha * pulse})`);
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
