<script lang="ts">
  import { onMount } from "svelte";
  import {
    parseFormattedText,
    getEffect,
    ANIMATION_CONFIG,
  } from "$lib/effects";
  import type { TextSegment } from "$lib/effects";

  interface Props {
    text: string;
    oncomplete?: () => void;
  }

  let { text, oncomplete }: Props = $props();

  let segments = $state<TextSegment[]>([]);
  let renderedContent = $state<
    { segment: TextSegment; visible: boolean; html: string }[]
  >([]);
  let isAnimating = $state(false);
  let lastText = $state("");
  let animationAborted = $state(false);

  onMount(() => {
    // Initial animation
    startAnimation(text);
  });

  // Watch for text changes
  $effect(() => {
    if (text !== lastText && text) {
      startAnimation(text);
    }
  });

  async function startAnimation(newText: string) {
    // Abort previous animation if running
    if (isAnimating) {
      animationAborted = true;
      await sleep(50); // Give time for abort to take effect
    }

    animationAborted = false;
    isAnimating = true;
    lastText = newText;

    // Reset and parse new text
    segments = parseFormattedText(newText);
    renderedContent = segments.map((segment) => ({
      segment,
      visible: false,
      html: renderSegment(segment),
    }));

    // Animate segments
    await animateSegments();
  }

  async function animateSegments() {
    for (let i = 0; i < renderedContent.length; i++) {
      // Check if animation was aborted
      if (animationAborted) {
        return;
      }

      const item = renderedContent[i];
      const segment = item.segment;

      // Handle timing effects (pause)
      if (segment.type === "pause") {
        const duration = segment.params?.value ?? ANIMATION_CONFIG.pauseDelay;
        await sleep(
          typeof duration === "number" ? duration : ANIMATION_CONFIG.pauseDelay,
        );
        continue;
      }

      // Handle structural effects (break)
      if (segment.type === "break") {
        renderedContent[i] = { ...item, visible: true };
        await sleep(ANIMATION_CONFIG.segmentDelay);
        continue;
      }

      // For text and effect segments - show instantly, then wait
      renderedContent[i] = { ...item, visible: true };

      // Add delay based on content length (segment-level pacing)
      const content = segment.content;
      if (content) {
        const charDelay = Math.min(content.length * 15, 80);
        const punctuationCount = (content.match(/[.,!?。！？、]/g) || [])
          .length;
        const totalDelay = charDelay + punctuationCount * 50;
        await sleep(Math.max(ANIMATION_CONFIG.segmentDelay, totalDelay));
      } else {
        await sleep(ANIMATION_CONFIG.segmentDelay);
      }
    }

    isAnimating = false;
    await sleep(ANIMATION_CONFIG.afterComplete);

    // Only call oncomplete if not aborted
    if (!animationAborted) {
      oncomplete?.();
    }
  }

  function renderSegment(segment: TextSegment): string {
    if (segment.type === "break") {
      return "";
    }

    if (segment.type === "pause") {
      return "";
    }

    const content = escapeHtml(segment.content);

    if (segment.type === "text" || !segment.effect) {
      return content;
    }

    // Get effect definition
    const effect = getEffect(segment.effect);
    if (!effect) {
      return content;
    }

    // Build class string
    const classes = [effect.style, `effect-${segment.effect}`]
      .filter(Boolean)
      .join(" ");

    // Build animation attribute
    let animationAttr = "";
    if (effect.animation) {
      animationAttr = `data-animation="${effect.animation.type}"`;
    }

    return `<span class="${classes}" ${animationAttr}>${content}</span>`;
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
</script>

<div class="formatted-text">
  {#each renderedContent as item, i (i)}
    {#if item.visible}
      {#if item.segment.type === "break"}
        <br class="effect-break" />
      {:else}
        {@html item.html}
      {/if}
    {/if}
  {/each}
</div>

<style>
  /*
	 * Divine Text Effects - Revelation Appearances
	 *
	 * Each effect is a different way of "revelation", not an "animation"
	 * - Slow: all animations at least 1-2 seconds
	 * - Simple: only opacity and blur, no scale/rotate
	 * - Soft: ease-in-out, no elastic curves
	 * - Alive: continuous state is "breathing", not looping
	 */

  /* ============ CSS Variables ============ */
  :root {
    /* Base text - cold white */
    --text-primary: rgba(224, 242, 254, 0.95);

    /* Accent - cyan/teal */
    --accent-cyan: rgba(34, 211, 238, 0.95);

    /* Muted - dim slate */
    --muted-slate: rgba(148, 163, 184, 0.6);
  }

  /* Container - clean, minimal */
  .formatted-text {
    display: inline;
    font-family: "LXGW WenKai", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 20px;
    font-weight: 300;
    line-height: 1.7;
    letter-spacing: 0.01em;
    color: var(--text-primary);
  }

  /* ============ em - Truth's Condensation ============ */
  /* Text condenses from the void, slowly brightening - like truth revealing itself */
  @keyframes emReveal {
    0% {
      opacity: 0;
      filter: blur(12px);
    }
    100% {
      opacity: 1;
      filter: blur(0);
    }
  }

  /* Constant soft glow - like a candle flame */
  @keyframes emBreath {
    0%,
    100% {
      text-shadow: 0 0 8px rgba(34, 211, 238, 0.2);
    }
    50% {
      text-shadow: 0 0 16px rgba(34, 211, 238, 0.35);
    }
  }

  :global(.effect-em) {
    color: var(--accent-cyan);
    font-weight: 400;
    animation:
      emReveal 1.2s ease-out forwards,
      emBreath 4s ease-in-out 1.2s infinite;
  }

  /* ============ pulse - Life's Breath ============ */
  /* Gentle breathing appearance - organic, alive */
  @keyframes pulseReveal {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  /* Organic light-dark rhythm - like a living heartbeat */
  @keyframes pulseBreath {
    0%,
    100% {
      opacity: 0.9;
      filter: brightness(1);
    }
    50% {
      opacity: 1;
      filter: brightness(1.08);
    }
  }

  :global(.effect-pulse) {
    background: linear-gradient(135deg, #22d3ee 0%, #818cf8 50%, #c084fc 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 400;
    animation:
      pulseReveal 1.5s ease-out forwards,
      pulseBreath 5s ease-in-out 1.5s infinite;
  }

  /* ============ glow - Revelation's Light ============ */
  /* Light permeates from within - like a sacred revelation */
  @keyframes glowReveal {
    0% {
      opacity: 0;
      filter: blur(8px) brightness(0.5);
    }
    100% {
      opacity: 1;
      filter: blur(0) brightness(1);
      text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
    }
  }

  /* Inner light continues to burn - like a revelation */
  @keyframes glowInner {
    0%,
    100% {
      text-shadow: 0 0 15px rgba(255, 255, 255, 0.25);
    }
    50% {
      text-shadow: 0 0 25px rgba(255, 255, 255, 0.4);
    }
  }

  :global(.effect-glow) {
    color: rgba(255, 255, 255, 0.98);
    font-weight: 300;
    animation:
      glowReveal 1.8s ease-out forwards,
      glowInner 6s ease-in-out 1.8s infinite;
  }

  /* ============ void - Abyss's Whisper ============ */
  /* Slowly emerging from the depths - floating, ethereal */
  @keyframes voidReveal {
    0% {
      opacity: 0;
      filter: blur(4px);
    }
    100% {
      opacity: 0.7;
      filter: blur(0);
    }
  }

  /* Floating sensation - now you see it, now you don't */
  @keyframes voidFloat {
    0%,
    100% {
      opacity: 0.65;
    }
    50% {
      opacity: 0.75;
    }
  }

  :global(.effect-void) {
    color: rgba(148, 163, 184, 0.8);
    font-style: italic;
    animation:
      voidReveal 2s ease-out forwards,
      voidFloat 8s ease-in-out 2s infinite;
  }

  /* ============ whisper - Ear's Caress ============ */
  /* Gentle appearance like a whisper - soft, barely there */
  @keyframes whisperReveal {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 0.55;
    }
  }

  /* Gentle drift - as if present, as if not */
  @keyframes whisperDrift {
    0%,
    100% {
      opacity: 0.5;
    }
    50% {
      opacity: 0.6;
    }
  }

  :global(.effect-whisper) {
    color: rgba(148, 163, 184, 0.55);
    font-size: 0.9em;
    font-style: italic;
    animation:
      whisperReveal 1.5s ease-out forwards,
      whisperDrift 7s ease-in-out 1.5s infinite;
  }

  /* ============ Structural Effects ============ */

  /* break - Paragraph break */
  .effect-break {
    display: block;
    width: 100%;
    margin-top: 1rem;
  }
</style>
