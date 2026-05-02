import type { SpaceStar } from '$lib/types/space';
import type { Locale } from '$lib/i18n/detector';
import { getFragmentById } from '$lib/data/fragments';

export type StarContentData =
	| { id: string; short: string; full: string; theme: string }
	| null;

export function resolveStarContent(star: SpaceStar, locale: Locale): StarContentData {
	switch (star.contentType) {
		case 'fragment': {
			const frag = getFragmentById(star.contentRef, locale);
			if (!frag) return null;
			return { id: frag.id, short: frag.short, full: frag.full, theme: frag.theme };
		}
		case 'void-entry':
			return null;
		default:
			return null;
	}
}
