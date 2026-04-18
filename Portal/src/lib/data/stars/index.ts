export { getManifestoContent, getManifestoById, type ManifestoContent } from './manifesto';
export { getProjects, getProjectById, type ProjectContent } from './projects';
export { getMembers, getMemberById, type MemberContent } from './members';
export { getDiscussions, getDiscussionById, type DiscussionContent } from './discussions';

import type { SpaceStar } from '$lib/types/space';
import type { Locale } from '$lib/i18n/detector';
import type { ManifestoContent, ProjectContent, MemberContent, DiscussionContent } from './index';
import { getFragmentById } from '$lib/data/fragments';
import { getManifestoById } from './manifesto';
import { getProjectById } from './projects';
import { getMemberById } from './members';
import { getDiscussionById } from './discussions';

export type StarContentData =
	| ManifestoContent
	| ProjectContent
	| MemberContent
	| DiscussionContent
	| { id: string; short: string; full: string; theme: string }
	| null;

export function resolveStarContent(star: SpaceStar, locale: Locale): StarContentData {
	switch (star.contentType) {
		case 'manifesto':
			return getManifestoById(star.contentRef, locale) ?? null;
		case 'project':
			return getProjectById(star.contentRef, locale) ?? null;
		case 'member':
			return getMemberById(star.contentRef, locale) ?? null;
		case 'discussion':
			return getDiscussionById(star.contentRef, locale) ?? null;
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
