import { browser } from "$app/environment";

export type Locale = "en" | "zh" | "ja" | "de";

const SUPPORTED_LOCALES: Locale[] = ["en", "zh", "ja", "de"];

/**
 * Detect locale from browser settings
 */
export function getBrowserLocale(): Locale {
  if (!browser) return "en";

  const browserLang =
    navigator.language ||
    (navigator as Navigator & { userLanguage?: string }).userLanguage;

  if (!browserLang) return "en";

  const langCode = browserLang.toLowerCase().split("-")[0];

  if (SUPPORTED_LOCALES.includes(langCode as Locale)) {
    return langCode as Locale;
  }

  return "en";
}

/**
 * Detect language from user input text
 * Priority: Chinese > Japanese > German > English
 */
export function detectLanguage(text: string): Locale | null {
  if (!text || text.trim().length === 0) return null;

  const trimmedText = text.trim();

  // Check for Chinese characters (CJK Unified Ideographs)
  const chineseRegex = /[\u4e00-\u9fff]/;
  const chineseMatches = (
    trimmedText.match(new RegExp(chineseRegex, "g")) || []
  ).length;

  // Check for Japanese-specific characters
  // Hiragana: \u3040-\u309f
  // Katakana: \u30a0-\u30ff
  const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/;
  const japaneseMatches = (
    trimmedText.match(new RegExp(japaneseRegex, "g")) || []
  ).length;

  // Check for German-specific words (case-insensitive)
  const germanWords = [
    "und",
    "oder",
    "aber",
    "wenn",
    "dann",
    "ich",
    "du",
    "er",
    "sie",
    "es",
    "wir",
    "ihr",
    "sind",
    "bin",
    "bist",
    "ist",
    "haben",
    "habe",
    "hat",
    "werden",
    "wird",
    "kann",
    "können",
    "müssen",
    "sollen",
    "wollen",
    "der",
    "die",
    "das",
    "den",
    "dem",
    "des",
    "ein",
    "eine",
    "einer",
    "nicht",
    "auch",
    "nur",
    "noch",
    "schon",
    "immer",
    "viel",
    "sehr",
    "guten",
    "gute",
    "guter",
    "danke",
    "bitte",
    "ja",
    "nein",
  ];
  const germanPattern = new RegExp(`\\b(${germanWords.join("|")})\\b`, "gi");
  const germanMatches = (trimmedText.match(germanPattern) || []).length;

  // Calculate scores
  const scores = {
    zh: chineseMatches * 2, // Weight Chinese characters more
    ja: japaneseMatches * 3 + chineseMatches, // Japanese has hiragana/katakana + kanji
    de: germanMatches * 1.5,
    en: 0, // Default fallback
  };

  // Find the highest score
  let maxScore = 0;
  let detectedLocale: Locale | null = null;

  for (const [locale, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedLocale = locale as Locale;
    }
  }

  // Require a minimum threshold to detect
  const threshold = 2;
  if (maxScore < threshold) {
    return null;
  }

  return detectedLocale;
}
