<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import { visualStore } from "$lib/stores";
  import type { Star, Fragment } from "$lib/types/agent";
  import { getStarGroupColor } from "$lib/data/constellation";

  interface Props {
    onstarclick?: (fragment: Fragment, star: Star) => void;
  }

  let { onstarclick }: Props = $props();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrameId: number;
  let mouseX = $state(0),
    mouseY = $state(0);

  let currentVisualState = $state($visualStore);
  let selectedStarId = $state<string | null>(null);

  $effect(() => {
    const unsub = visualStore.subscribe((v) => (currentVisualState = v));
    return () => unsub();
  });

  onMount(() => {
    ctx = canvas.getContext("2d");
    if (!ctx) return;

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("mousemove", handleMouseMove);

    animate();
  });

  onDestroy(() => {
    if (!browser) return;
    window.removeEventListener("resize", resizeCanvas);
    canvas.removeEventListener("click", handleClick);
    canvas.removeEventListener("mousemove", handleMouseMove);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  });

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function handleMouseMove(e: MouseEvent) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }

  function handleClick(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    for (const star of currentVisualState.stars) {
      const dist = Math.hypot(cx - star.x, cy - star.y);
      if (dist <= Math.max(star.size * 8, 25) && star.fragment) {
        selectedStarId = star.id;
        onstarclick?.(star.fragment, star);
        return;
      }
    }
  }

  function animate() {
    if (!ctx) return;
    const time = Date.now() * 0.001;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const state = currentVisualState;

    // Draw lines
    for (const line of state.lines) {
      const s1 = state.stars.find((s) => s.id === line.star1Id);
      const s2 = state.stars.find((s) => s.id === line.star2Id);
      if (!s1 || !s2) continue;

      const alpha = line.opacity;
      const g = ctx.createLinearGradient(s1.x, s1.y, s2.x, s2.y);
      g.addColorStop(0, `rgba(139,92,246,${alpha * 0.5})`);
      g.addColorStop(0.5, `rgba(236,72,153,${alpha * 0.6})`);
      g.addColorStop(1, `rgba(59,130,246,${alpha * 0.5})`);

      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.strokeStyle = `rgba(139,92,246,${alpha * 0.12})`;
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 12]);
      ctx.lineDashOffset = -time * 35;
      ctx.stroke();
      ctx.setLineDash([]);

      // Energy dots along line
      for (let d = 0; d < 2; d++) {
        const prog = (((time * 0.015 + d * 0.5) % 1) + 1) % 1;
        const dx = s1.x + (s2.x - s1.x) * prog;
        const dy = s1.y + (s2.y - s1.y) * prog;
        const eg = ctx.createRadialGradient(dx, dy, 0, dx, dy, 6);
        eg.addColorStop(0, `rgba(236,72,153,${alpha * 0.7})`);
        eg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(dx, dy, 6, 0, Math.PI * 2);
        ctx.fillStyle = eg;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dx, dy, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      }
    }

    // Draw stars
    for (const star of state.stars) {
      const age = (Date.now() - star.createdAt) / 1000;
      const entrance = Math.min(1, age * 2);
      const twinkle = Math.sin(
        time * star.twinkleSpeed + star.id.charCodeAt(5),
      );
      const bright = star.brightness + twinkle * 0.12;
      const cs = star.size * entrance;
      const isSelected = star.id === selectedStarId;

      // Outer halo
      const oR = cs * (isSelected ? 10 : 7);
      const og = ctx.createRadialGradient(
        star.x,
        star.y,
        cs * 2,
        star.x,
        star.y,
        oR,
      );
      og.addColorStop(0, `rgba(139,92,246,${bright * 0.08})`);
      og.addColorStop(0.5, `rgba(236,72,153,${bright * 0.03})`);
      og.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(star.x, star.y, oR, 0, Math.PI * 2);
      ctx.fillStyle = og;
      ctx.fill();

      // Mid halo
      const mR = cs * 3.5;
      const mg = ctx.createRadialGradient(
        star.x,
        star.y,
        cs,
        star.x,
        star.y,
        mR,
      );
      mg.addColorStop(0, `rgba(139,92,246,${bright * 0.35})`);
      mg.addColorStop(0.6, `rgba(236,72,153,${bright * 0.1})`);
      mg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(star.x, star.y, mR, 0, Math.PI * 2);
      ctx.fillStyle = mg;
      ctx.fill();

      // Selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, mR + 2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,220,150,${0.4 + twinkle * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Core
      ctx.beginPath();
      ctx.arc(star.x, star.y, cs, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${bright})`;
      ctx.fill();

      // Inner
      ctx.beginPath();
      ctx.arc(star.x, star.y, cs * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.fill();
    }

    animationFrameId = requestAnimationFrame(animate);
  }
</script>

<canvas
  bind:this={canvas}
  class="fixed inset-0 w-full h-full constellation-canvas"
/>

<style>
  .constellation-canvas {
    z-index: 1;
    cursor: pointer;
  }
</style>
