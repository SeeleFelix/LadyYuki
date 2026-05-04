import type { EmergingFrag, Whisper } from "./types";
import type { SpaceViewport } from "$lib/types/space";

export function launchPendingWhisper(
  pendingWhisper: {
    sx: number;
    sy: number;
    tx: number;
    ty: number;
    text: string;
    color: { r: number; g: number; b: number };
  } | null,
  whispers: Whisper[],
  activeWhisperIdx: { v: number },
  isFirstOpening: { v: boolean },
  openingInitialDist: { v: number },
  openingTextAlpha: { v: number },
  autoPanPhase: { v: string },
  whisperDuration: number,
): void {
  if (!pendingWhisper) return;
  whispers.push({ ...pendingWhisper, progress: 0, life: whisperDuration });
  activeWhisperIdx.v = whispers.length - 1;
  (pendingWhisper as unknown as null) = null;
  isFirstOpening.v = false;
  openingInitialDist.v = 1;
  openingTextAlpha.v = 0;
  autoPanPhase.v = "followWhisper";
}

export const CINEMATIC_EASE = (t: number) =>
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
