import type { Fragment } from '$lib/types/agent';
import type { Locale } from '$lib/i18n/detector';
import { fragmentsEn } from './en';
import { fragmentsZh } from './zh';
import { fragmentsJa } from './ja';
import { fragmentsDe } from './de';

const fragmentsByLocale: Record<Locale, Fragment[]> = {
	en: fragmentsEn,
	zh: fragmentsZh,
	ja: fragmentsJa,
	de: fragmentsDe
};

/**
 * Get all fragments for a specific locale
 */
export function getFragments(locale: Locale): Fragment[] {
	return fragmentsByLocale[locale] || fragmentsByLocale.en;
}

/**
 * Get a fragment by ID for a specific locale
 */
export function getFragmentById(id: string, locale: Locale = 'en'): Fragment | undefined {
	const fragments = getFragments(locale);
	return fragments.find((f) => f.id === id);
}

/**
 * Get fragments by theme for a specific locale
 */
export function getFragmentsByTheme(theme: Fragment['theme'], locale: Locale = 'en'): Fragment[] {
	const fragments = getFragments(locale);
	return fragments.filter((f) => f.theme === theme);
}

// Re-export for backward compatibility
export { fragmentsEn as fragments } from './en';
