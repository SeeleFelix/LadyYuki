// Effect Registry - Cold Tech Light Style
// Minimal effects with code highlighting aesthetic

import type { EffectDefinition, EffectRegistry } from "./types";

export const effectRegistry: EffectRegistry = {
  // ============ Core Effects (Tech Cold Light Style) ============

  // em - Cyan for keywords (like syntax keyword)
  em: {
    name: "emphasis",
    style: "font-medium",
    animation: { type: "shimmer", duration: 4000 },
  },

  // pulse - Cyan-indigo gradient for core concepts (like function name)
  pulse: {
    name: "pulse",
    style: "",
    animation: undefined, // Gradient handled by CSS
  },

  // glow - Bright white with glow for sacred moments (like string literal)
  glow: {
    name: "glow",
    style: "",
    animation: undefined, // Glow handled by CSS
  },

  // void - Gray-blue for depth content (like comment)
  void: {
    name: "void",
    style: "",
    animation: undefined,
  },

  // whisper - Dim gray for hints (like meta)
  whisper: {
    name: "whisper",
    style: "text-sm",
    animation: undefined,
  },

  // ============ Structural Effects ============

  // pause - Timing control
  pause: {
    name: "pause",
    timing: 300, // Default pause duration
  },

  // break - Visual paragraph break
  break: {
    name: "break",
    style: "block w-full mt-4",
  },
};

// Helper to get effect by name
export function getEffect(name: string): EffectDefinition | undefined {
  return effectRegistry[name];
}

// Check if an effect is a timing/pause effect
export function isTimingEffect(name: string): boolean {
  return name === "pause";
}

// Check if an effect is a structural effect (breaks layout)
export function isStructuralEffect(name: string): boolean {
  return name === "break";
}
