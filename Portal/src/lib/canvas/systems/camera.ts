import type { SpaceViewport } from "$lib/types/space";
import type { AutoPanPhase, PendingWhisper, Whisper } from "../types";
import { easeInOutQuad } from "../theme";

export interface CameraState {
  viewport: SpaceViewport;
  driftTarget: { x: number; y: number };
  autoPanPhase: AutoPanPhase;
  settleTimer: number;
  activeWhisperIdx: number;
  isFirstOpening: boolean;
  openingInitialDist: number;
  voidScreenX: number;
  voidScreenY: number;
}

export interface CameraActions {
  /** Set openingTextAlpha to this value (only when non-null) */
  openingTextAlpha: number | null;
  /** Set openingTextScreen to this value (only when non-null) */
  openingTextScreen: { x: number; y: number } | null;
  /** Component should trigger ignition */
  triggerIgnition: boolean;
  /** Component should launch the pending whisper */
  launchWhisper: boolean;
}

export function createCamera(x: number, y: number): CameraState {
  return {
    viewport: { x, y, zoom: 0.35, targetX: x, targetY: y, targetZoom: 0.35 },
    driftTarget: { x, y },
    autoPanPhase: "none",
    settleTimer: 0,
    activeWhisperIdx: -1,
    isFirstOpening: false,
    openingInitialDist: 1,
    voidScreenX: 0,
    voidScreenY: 0,
  };
}

export function updateCamera(
  cam: CameraState,
  time: number,
  bootTime: number,
  ignitionAge: number,
  pendingWhisper: PendingWhisper | null,
  whispers: Whisper[],
  canvas: HTMLCanvasElement,
): CameraActions {
  const actions: CameraActions = {
    openingTextAlpha: null,
    openingTextScreen: null,
    triggerIgnition: false,
    launchWhisper: false,
  };

  const elapsed = time - bootTime;
  const lerp = 0.08;

  // Cinematic zoom during first 15s when not auto-panning
  if (cam.autoPanPhase === "none" && elapsed < 15) {
    let cinematicZoom = 0.65;
    if (ignitionAge <= 0) {
      const t = Math.min(elapsed / 9, 1);
      cinematicZoom = 0.35 + easeInOutQuad(t) * 0.3;
    } else if (ignitionAge < 0.5) {
      cinematicZoom = 0.65 + Math.sin((ignitionAge * Math.PI) / 0.5) * 0.13;
    }
    if (elapsed < 13) {
      cam.viewport.targetZoom = cinematicZoom;
    } else {
      const fade = (elapsed - 13) / 2;
      cam.viewport.targetZoom =
        cinematicZoom + (cam.viewport.zoom - cinematicZoom) * fade;
    }
  }

  // Track void screen position
  const vp = cam.viewport;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  if (cam.autoPanPhase === "panToVoid" && pendingWhisper) {
    const targetX = pendingWhisper.sx;
    const targetY = pendingWhisper.sy;
    const dist = Math.hypot(vp.x - targetX, vp.y - targetY);
    const panLerp = cam.isFirstOpening ? 0.04 : 0.08;
    vp.x += (targetX - vp.x) * panLerp;
    vp.y += (targetY - vp.y) * panLerp;
    vp.zoom += (0.65 - vp.zoom) * panLerp;

    // Track void screen position for opening text
    if (cam.isFirstOpening && pendingWhisper) {
      actions.openingTextScreen = spaceToScreen(cam, canvas, targetX, targetY);
    }

    if (dist < 80 && Math.abs(vp.zoom - 0.65) < 0.05) {
      if (cam.isFirstOpening) {
        actions.openingTextAlpha = 1;
        cam.settleTimer = 0.8;
        cam.autoPanPhase = "settle";
      } else {
        actions.launchWhisper = true;
      }
    }
  } else if (cam.autoPanPhase === "followWhisper") {
    const w = whispers[cam.activeWhisperIdx];
    if (w && w.life > 0 && w.progress < 1) {
      const t = easeInOutQuad(w.progress);
      const wx = w.sx + (w.tx - w.sx) * t;
      const wy = w.sy + (w.ty - w.sy) * t;
      vp.x += (wx - vp.x) * 0.1;
      vp.y += (wy - vp.y) * 0.1;
      vp.zoom += (0.75 - vp.zoom) * 0.08;
    } else {
      cam.autoPanPhase = "settle";
      cam.settleTimer = 0.6;
    }
  } else if (cam.autoPanPhase === "settle") {
    vp.targetX = vp.x;
    vp.targetY = vp.y;
    vp.targetZoom = vp.zoom;
    cam.settleTimer -= 1 / 60;

    if (cam.isFirstOpening) {
      if (cam.settleTimer < 0.6) {
        actions.openingTextAlpha = Math.max(0, cam.settleTimer / 0.6);
      }
      if (cam.settleTimer < 0.5 && ignitionAge === 0) {
        actions.triggerIgnition = true;
      }
      if (ignitionAge >= 5) {
        actions.launchWhisper = true;
      }
    } else {
      if (cam.settleTimer <= 0) {
        cam.autoPanPhase = "none";
        cam.activeWhisperIdx = -1;
        cam.driftTarget.x = vp.x;
        cam.driftTarget.y = vp.y;
      }
    }
  } else {
    vp.x += (vp.targetX - vp.x) * lerp;
    vp.y += (vp.targetY - vp.y) * lerp;
    vp.zoom += (vp.targetZoom - vp.zoom) * lerp;
  }

  return actions;
}

export function onWhisperLaunched(cam: CameraState, whisperIdx: number): void {
  cam.activeWhisperIdx = whisperIdx;
  cam.isFirstOpening = false;
  cam.openingInitialDist = 1;
  cam.autoPanPhase = "followWhisper";
}

export function onIgnitionComplete(cam: CameraState): void {
  cam.autoPanPhase = "settle";
}

export function beginPanToVoid(cam: CameraState, isFirst: boolean): void {
  cam.autoPanPhase = "panToVoid";
  cam.isFirstOpening = isFirst;
}

export function screenToSpace(
  cam: CameraState,
  canvas: HTMLCanvasElement,
  sx: number,
  sy: number,
): { x: number; y: number } {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  return {
    x: (sx - cx) / cam.viewport.zoom + cam.viewport.x,
    y: (sy - cy) / cam.viewport.zoom + cam.viewport.y,
  };
}

export function spaceToScreen(
  cam: CameraState,
  canvas: HTMLCanvasElement,
  wx: number,
  wy: number,
): { x: number; y: number } {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  return {
    x: (wx - cam.viewport.x) * cam.viewport.zoom + cx,
    y: (wy - cam.viewport.y) * cam.viewport.zoom + cy,
  };
}

export function isAutoPanning(cam: CameraState): boolean {
  return cam.autoPanPhase !== "none";
}
