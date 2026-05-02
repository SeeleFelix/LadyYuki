// Text Parser - Parses formatted text with effect markers
// Format: {effectName:content} or {effectName:param=value:content}

import type { TextSegment } from "./types";

// Pattern to match effect markers: {name:content} or {name:param=value:content}
const EFFECT_PATTERN = /\{([a-zA-Z]+)(?::([^:}]*))?:(.*?)\}/g;

// Pattern for simple effects without content (like {pause} or {break})
const SIMPLE_EFFECT_PATTERN = /\{([a-zA-Z]+)\}/g;

/**
 * Parse formatted text into segments
 *
 * Examples:
 * - "Hello {em:world}" -> [{ type: 'text', content: 'Hello ' }, { type: 'effect', effect: 'em', content: 'world' }]
 * - "{pause:500}" -> [{ type: 'pause', content: '500' }]
 * - "{break}" -> [{ type: 'break', content: '' }]
 */
export function parseFormattedText(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  // First, handle simple effects (no content)
  // Replace {pause}, {break} with placeholders
  const simpleEffectMap: Map<string, TextSegment> = new Map();
  let processedText = text;
  let simpleIndex = 0;

  processedText = processedText.replace(
    SIMPLE_EFFECT_PATTERN,
    (match, effectName) => {
      const placeholder = `\x00SIMPLE_${simpleIndex}\x00`;
      simpleEffectMap.set(placeholder, {
        type:
          effectName === "pause"
            ? "pause"
            : effectName === "break"
              ? "break"
              : "effect",
        content: "",
        effect: effectName,
      });
      simpleIndex++;
      return placeholder;
    },
  );

  // Now parse the text with effect markers
  let match: RegExpExecArray | null;
  const effectRegex = new RegExp(EFFECT_PATTERN.source, "g");

  while ((match = effectRegex.exec(processedText)) !== null) {
    // Add any text before this match
    if (match.index > lastIndex) {
      const plainText = processedText.slice(lastIndex, match.index);
      // Process placeholders in plain text
      addTextWithPlaceholders(segments, plainText, simpleEffectMap);
    }

    const [fullMatch, effectName, params, content] = match;

    // Parse parameters if present
    const paramsObj: Record<string, string | number> = {};
    if (params) {
      // Handle param=value format
      if (params.includes("=")) {
        const [key, value] = params.split("=");
        paramsObj[key] = isNaN(Number(value)) ? value : Number(value);
      } else {
        // Simple param - treat as value for 'duration' or similar
        paramsObj.value = isNaN(Number(params)) ? params : Number(params);
      }
    }

    // Determine segment type
    let segmentType: TextSegment["type"] = "effect";
    if (effectName === "pause") {
      segmentType = "pause";
    } else if (effectName === "break") {
      segmentType = "break";
    }

    segments.push({
      type: segmentType,
      content: content || "",
      effect: effectName,
      params: Object.keys(paramsObj).length > 0 ? paramsObj : undefined,
    });

    lastIndex = match.index + fullMatch.length;
  }

  // Add any remaining text
  if (lastIndex < processedText.length) {
    const remainingText = processedText.slice(lastIndex);
    addTextWithPlaceholders(segments, remainingText, simpleEffectMap);
  }

  // If no segments were created, return the original text as a single segment
  if (segments.length === 0) {
    segments.push({ type: "text", content: text });
  }

  return segments;
}

/**
 * Add text while processing any simple effect placeholders
 */
function addTextWithPlaceholders(
  segments: TextSegment[],
  text: string,
  placeholderMap: Map<string, TextSegment>,
): void {
  const keys = [...placeholderMap.keys()];
  if (keys.length === 0) {
    segments.push({ type: "text", content: text });
    return;
  }

  // Build regex matching any placeholder
  const pattern = new RegExp(
    "(" +
      keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") +
      ")",
    "g",
  );
  const parts = text.split(pattern);

  for (const part of parts) {
    if (placeholderMap.has(part)) {
      segments.push({ ...placeholderMap.get(part)! });
    } else if (part) {
      segments.push({ type: "text", content: part });
    }
  }
}

/**
 * Calculate total timing for a segment array
 */
export function calculateTotalTiming(segments: TextSegment[]): number {
  return segments.reduce((total, segment) => {
    if (segment.type === "pause") {
      const duration = segment.params?.value ?? 500;
      return total + (typeof duration === "number" ? duration : 500);
    }
    return total;
  }, 0);
}

/**
 * Check if text contains any effect markers
 */
export function hasEffects(text: string): boolean {
  return EFFECT_PATTERN.test(text) || SIMPLE_EFFECT_PATTERN.test(text);
}
