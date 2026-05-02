<script lang="ts">
  import { onMount } from "svelte";
  import FormattedText from "./FormattedText.svelte";
  import type { SpaceStar } from "$lib/types/space";
  import type { Locale } from "$lib/i18n/detector";
  import { getAreaById } from "$lib/data/constellation";
  import { resolveStarContent } from "$lib/data/stars";

  interface Props {
    star: SpaceStar;
    screenX: number;
    screenY: number;
    locale: Locale;
    onclose: () => void;
    onentervoid?: () => void;
  }

  let { star, screenX, screenY, locale, onclose, onentervoid }: Props =
    $props();

  type Phase = "entering" | "open" | "closing" | "closed";
  let phase = $state<Phase>("entering");

  const offsetX =
    screenX - (typeof window !== "undefined" ? window.innerWidth / 2 : 0);
  const offsetY =
    screenY - (typeof window !== "undefined" ? window.innerHeight / 2 : 0);

  onMount(() => {
    requestAnimationFrame(() => {
      setTimeout(() => (phase = "open"), 500);
    });
  });

  const colorRgb = $derived.by(() => {
    const a = getAreaById(star.areaId);
    return a ? extractRgb(a.color) : "255, 255, 255";
  });

  const content = $derived(resolveStarContent(star, locale));

  function handleClose() {
    if (phase === "closing") return;
    phase = "closing";
    setTimeout(onclose, 400);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") handleClose();
  }

  function handleVoidEnter() {
    if (phase === "closing") return;
    phase = "closing";
    setTimeout(() => onentervoid?.(), 400);
  }

  function handleAmbientClick() {
    handleClose();
  }

  function extractRgb(rgba: string): string {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return match ? `${match[1]}, ${match[2]}, ${match[3]}` : "255, 255, 255";
  }

  function resolveLabel(): string {
    return (
      star.label[locale] || star.label.en || Object.values(star.label)[0] || ""
    );
  }

  function getTitle(): string {
    if (!content) return resolveLabel();
    const c = content as unknown as Record<string, unknown>;
    if ("title" in content) return c.title as string;
    if ("name" in content) return c.name as string;
    if ("short" in content) return c.short as string;
    return resolveLabel();
  }

  function getBody(): string {
    if (!content || typeof content !== "object") return "";
    const c = content as unknown as Record<string, unknown>;
    if ("body" in c && typeof c.body === "string") return c.body;
    if ("description" in c && typeof c.description === "string")
      return c.description;
    if ("full" in c && typeof c.full === "string") return c.full;
    if ("bio" in c && typeof c.bio === "string") return c.bio;
    return "";
  }

  function getSubtitle(): string {
    if (!content || typeof content !== "object") return "";
    const c = content as Record<string, unknown>;
    if ("role" in c && typeof c.role === "string") return c.role;
    if ("author" in c && typeof c.author === "string") return c.author;
    if ("status" in c && typeof c.status === "string")
      return c.status as string;
    if ("theme" in c && typeof c.theme === "string") return c.theme as string;
    return "";
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if phase !== "closed"}
  <div
    class="ambient"
    class:ambient-entering={phase === "entering"}
    class:ambient-open={phase === "open"}
    class:ambient-closing={phase === "closing"}
    onclick={handleAmbientClick}
    style="--origin-x: {screenX}px; --origin-y: {screenY}px;"
  ></div>

  <div
    class="star-reveal"
    class:entering={phase === "entering"}
    class:open={phase === "open"}
    class:closing={phase === "closing"}
    style="
			--star-color: {colorRgb};
			--offset-x: {offsetX}px;
			--offset-y: {offsetY}px;
		"
  >
    {#if star.contentType === "void-entry"}
      <div class="void-content">
        <h2 class="void-title">Enter the Void</h2>
        <p class="void-desc">
          Step into an immersive dialogue with the space's consciousness.
        </p>
        <p class="void-desc">
          What emerges between you and the AI will prove the thesis.
        </p>
        <button class="void-btn" onclick={handleVoidEnter}> Enter </button>
      </div>
    {:else}
      <div class="content-header">
        {#if getSubtitle()}
          <span class="content-subtitle">{getSubtitle()}</span>
        {/if}
        <h2 class="content-title">{getTitle()}</h2>
      </div>

      <div class="content-body">
        {#if getBody()}
          <FormattedText text={getBody()} />
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  /* ── Ambient overlay ── */
  .ambient {
    position: fixed;
    inset: 0;
    z-index: 50;
    cursor: pointer;
    background: radial-gradient(
      ellipse at var(--origin-x, 50%) var(--origin-y, 50%),
      rgba(0, 0, 0, 0.55) 0%,
      rgba(0, 0, 0, 0.25) 40%,
      rgba(0, 0, 0, 0.06) 100%
    );
    backdrop-filter: blur(0px);
    opacity: 0;
    transition:
      opacity 0.4s ease-out,
      backdrop-filter 0.6s ease-out;
  }

  .ambient-entering {
    opacity: 1;
    backdrop-filter: blur(4px);
  }

  .ambient-open {
    opacity: 1;
    backdrop-filter: blur(4px);
  }

  .ambient-closing {
    opacity: 0;
    backdrop-filter: blur(0px);
  }

  /* ── Content panel ── */
  @keyframes emergeFromStar {
    0% {
      transform: translate(
          calc(-50% + var(--offset-x, 0px)),
          calc(-50% + var(--offset-y, 0px))
        )
        scale(0.2);
      filter: blur(12px) brightness(1.6);
      opacity: 0;
    }
    40% {
      opacity: 1;
      filter: blur(6px) brightness(1.3);
    }
    100% {
      transform: translate(-50%, -50%) scale(1);
      filter: blur(0px) brightness(1);
      opacity: 1;
    }
  }

  @keyframes foldToStar {
    0% {
      transform: translate(-50%, -50%) scale(1);
      filter: blur(0px) brightness(1);
      opacity: 1;
    }
    60% {
      opacity: 0.8;
      filter: blur(6px) brightness(1.2);
    }
    100% {
      transform: translate(
          calc(-50% + var(--offset-x, 0px)),
          calc(-50% + var(--offset-y, 0px))
        )
        scale(0.15);
      filter: blur(10px) brightness(1.5);
      opacity: 0;
    }
  }

  .star-reveal {
    position: fixed;
    top: 50%;
    left: 50%;
    z-index: 51;
    max-width: 620px;
    width: 88vw;
    max-height: 80vh;
    overflow-y: auto;
    padding: 3rem 2.5rem;
    will-change: transform, filter, opacity;
  }

  .star-reveal.entering {
    animation: emergeFromStar 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
  }

  /* ── Glow border pulse on open ── */
  @keyframes borderPulse {
    0% {
      box-shadow: 0 0 0px rgba(var(--star-color), 0.4);
    }
    50% {
      box-shadow: 0 0 40px rgba(var(--star-color), 0.15);
    }
    100% {
      box-shadow: 0 0 0px rgba(var(--star-color), 0);
    }
  }

  .star-reveal.open {
    transform: translate(-50%, -50%) scale(1);
    filter: blur(0px) brightness(1);
    opacity: 1;
    animation: borderPulse 1.2s ease-out 0.4s 1;
  }

  .star-reveal.closing {
    animation: foldToStar 0.4s ease-in forwards;
  }

  /* ── Content typography ── */
  .content-header {
    margin-bottom: 2rem;
  }

  .content-subtitle {
    display: inline-block;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: rgba(var(--star-color), 0.6);
    margin-bottom: 0.6rem;
  }

  .content-title {
    font-size: 1.6rem;
    font-weight: 300;
    color: rgba(255, 255, 255, 0.95);
    margin: 0;
    text-shadow: 0 0 30px rgba(var(--star-color), 0.2);
  }

  .content-body {
    color: rgba(224, 242, 254, 0.9);
    line-height: 1.8;
  }

  /* ── Void entry ── */
  .void-content {
    text-align: center;
    padding: 2rem 0;
  }

  .void-title {
    font-size: 1.8rem;
    font-weight: 300;
    color: rgba(139, 92, 246, 0.9);
    text-shadow: 0 0 30px rgba(139, 92, 246, 0.3);
    margin-bottom: 1.5rem;
  }

  .void-desc {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.95rem;
    margin-bottom: 0.75rem;
  }

  .void-btn {
    margin-top: 2rem;
    padding: 0.75rem 2.5rem;
    background: rgba(139, 92, 246, 0.15);
    border: 1px solid rgba(139, 92, 246, 0.3);
    color: rgba(255, 255, 255, 0.85);
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s;
  }

  .void-btn:hover {
    background: rgba(139, 92, 246, 0.3);
    border-color: rgba(139, 92, 246, 0.5);
    box-shadow: 0 0 25px rgba(139, 92, 246, 0.15);
  }

  .star-reveal::-webkit-scrollbar {
    width: 3px;
  }
  .star-reveal::-webkit-scrollbar-track {
    background: transparent;
  }
  .star-reveal::-webkit-scrollbar-thumb {
    background: rgba(var(--star-color), 0.2);
    border-radius: 2px;
  }
</style>
