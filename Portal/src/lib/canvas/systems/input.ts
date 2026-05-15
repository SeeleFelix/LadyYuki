import type { CameraState } from "./camera";
import { screenToSpace } from "./camera";

export interface InputState {
  mouseScreenX: number;
  mouseScreenY: number;
  mouseSpaceX: number;
  mouseSpaceY: number;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  dragStartViewX: number;
  dragStartViewY: number;
  dragThresholdMet: boolean;
}

export interface InputCallbacks {
  onClick: (
    spaceX: number,
    spaceY: number,
    screenX: number,
    screenY: number,
  ) => void;
}

export function createInput(
  canvas: HTMLCanvasElement,
  getCamera: () => CameraState,
  getIsAutoPanning: () => boolean,
  callbacks: InputCallbacks,
): { state: InputState; destroy: () => void } {
  const state: InputState = {
    mouseScreenX: 0,
    mouseScreenY: 0,
    mouseSpaceX: 0,
    mouseSpaceY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragStartViewX: 0,
    dragStartViewY: 0,
    dragThresholdMet: false,
  };

  function updateMouseWorld(sx: number, sy: number) {
    state.mouseScreenX = sx;
    state.mouseScreenY = sy;
    const sp = screenToSpace(getCamera(), canvas, sx, sy);
    state.mouseSpaceX = sp.x;
    state.mouseSpaceY = sp.y;
  }

  // ── Mouse ──
  function onMouseDown(e: MouseEvent) {
    if (getIsAutoPanning()) return;
    state.isDragging = true;
    state.dragThresholdMet = false;
    state.dragStartX = e.clientX;
    state.dragStartY = e.clientY;
    const cam = getCamera();
    state.dragStartViewX = cam.viewport.x;
    state.dragStartViewY = cam.viewport.y;
  }

  function onMouseMove(e: MouseEvent) {
    updateMouseWorld(e.clientX, e.clientY);

    if (state.isDragging) {
      const dx = e.clientX - state.dragStartX;
      const dy = e.clientY - state.dragStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) state.dragThresholdMet = true;
      const cam = getCamera();
      cam.viewport.x = state.dragStartViewX - dx / cam.viewport.zoom;
      cam.viewport.y = state.dragStartViewY - dy / cam.viewport.zoom;
      cam.viewport.targetX = cam.viewport.x;
      cam.viewport.targetY = cam.viewport.y;
      cam.driftTarget.x = cam.viewport.x;
      cam.driftTarget.y = cam.viewport.y;
    }
  }

  function onMouseUp(e: MouseEvent) {
    state.isDragging = false;
    if (!state.dragThresholdMet) {
      const sp = screenToSpace(getCamera(), canvas, e.clientX, e.clientY);
      callbacks.onClick(sp.x, sp.y, e.clientX, e.clientY);
    }
  }

  function onWheel(e: WheelEvent) {
    if (getIsAutoPanning()) return;
    e.preventDefault();
    const cam = getCamera();
    cam.viewport.targetZoom = Math.max(
      0.3,
      Math.min(1.2, cam.viewport.targetZoom * (1 - e.deltaY * 0.001)),
    );
  }

  // ── Touch ──
  let touchDist0 = 0;
  let lastTouchX = 0;
  let lastTouchY = 0;

  function onTouchStart(e: TouchEvent) {
    if (getIsAutoPanning()) return;
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      lastTouchX = t.clientX;
      lastTouchY = t.clientY;
      state.isDragging = true;
      state.dragThresholdMet = false;
      state.dragStartX = t.clientX;
      state.dragStartY = t.clientY;
      const cam = getCamera();
      state.dragStartViewX = cam.viewport.x;
      state.dragStartViewY = cam.viewport.y;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDist0 = Math.sqrt(dx * dx + dy * dy);
      state.isDragging = false;
    }
  }

  function onTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 1 && state.isDragging) {
      const t = e.touches[0];
      lastTouchX = t.clientX;
      lastTouchY = t.clientY;
      updateMouseWorld(t.clientX, t.clientY);
      const dx = t.clientX - state.dragStartX;
      const dy = t.clientY - state.dragStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) state.dragThresholdMet = true;
      const cam = getCamera();
      cam.viewport.x = state.dragStartViewX - dx / cam.viewport.zoom;
      cam.viewport.y = state.dragStartViewY - dy / cam.viewport.zoom;
      cam.viewport.targetX = cam.viewport.x;
      cam.viewport.targetY = cam.viewport.y;
      cam.driftTarget.x = cam.viewport.x;
      cam.driftTarget.y = cam.viewport.y;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (touchDist0 > 0) {
        const cam = getCamera();
        cam.viewport.targetZoom = Math.max(
          0.3,
          Math.min(1.2, cam.viewport.targetZoom * (dist / touchDist0)),
        );
      }
      touchDist0 = dist;
    }
  }

  function onTouchEnd(_e: TouchEvent) {
    if (!state.isDragging) return;
    if (!state.dragThresholdMet) {
      const sp = screenToSpace(getCamera(), canvas, lastTouchX, lastTouchY);
      callbacks.onClick(sp.x, sp.y, lastTouchX, lastTouchY);
    }
    state.isDragging = false;
  }

  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseup", onMouseUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd);

  function destroy() {
    canvas.removeEventListener("mousedown", onMouseDown);
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("mouseup", onMouseUp);
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("touchstart", onTouchStart);
    canvas.removeEventListener("touchmove", onTouchMove);
    canvas.removeEventListener("touchend", onTouchEnd);
  }

  return { state, destroy };
}
