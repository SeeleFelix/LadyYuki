import type { Locale } from "../detector";
import { en } from "./en";
import { zh } from "./zh";
import { ja } from "./ja";
import { de } from "./de";

export type Translation = typeof en;

const translations: Record<Locale, Translation> = {
  en,
  zh,
  ja,
  de,
};

export function getTranslation(locale: Locale): Translation {
  return translations[locale] || translations.en;
}

export { en, zh, ja, de };
