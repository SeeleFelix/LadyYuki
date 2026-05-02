import { writable } from 'svelte/store';
import type { Star, ConstellationLine, VisualStoreState, Fragment } from '$lib/types/agent';

function createVisualStore() {
	const initialState: VisualStoreState = {
		stars: [],
		lines: []
	};

	const { subscribe, set, update } = writable<VisualStoreState>(initialState);

	return {
		subscribe,
		addStar: (star: Omit<Star, 'id' | 'createdAt'> & { fragment?: Fragment }) => {
			const newStar: Star = {
				...star,
				id: `star-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				createdAt: Date.now()
			};
			update((state) => ({
				...state,
				stars: [...state.stars, newStar]
			}));
			return newStar.id;
		},
		addLine: (star1Id: string, star2Id: string) => {
			const newLine: ConstellationLine = {
				id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				star1Id,
				star2Id,
				opacity: 0
			};
			update((state) => ({
				...state,
				lines: [...state.lines, newLine]
			}));

			// Fade in the line
			setTimeout(() => {
				update((state) => ({
					...state,
					lines: state.lines.map((l) =>
						l.id === newLine.id ? { ...l, opacity: 0.6 } : l
					)
				}));
			}, 100);

			return newLine.id;
		},
		reset: () => set(initialState)
	};
}

export const visualStore = createVisualStore();
