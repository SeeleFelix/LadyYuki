import { writable, derived } from 'svelte/store';
import type { Star, ConstellationLine, VisualState, VisualStoreState } from '$lib/types/agent';

function createVisualStore() {
	const initialState: VisualStoreState = {
		state: 'initial',
		stars: [],
		lines: [],
		backgroundHue: 0,
		isBreathing: false
	};

	const { subscribe, set, update } = writable<VisualStoreState>(initialState);

	return {
		subscribe,
		setState: (newState: VisualState) => {
			update((state) => ({ ...state, state: newState }));
		},
		addStar: (star: Omit<Star, 'id' | 'createdAt'>) => {
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
		setBackgroundHue: (hue: number) => {
			update((state) => ({ ...state, backgroundHue: hue }));
		},
		setBreathing: (isBreathing: boolean) => {
			update((state) => ({ ...state, isBreathing }));
		},
		reset: () => set(initialState)
	};
}

export const visualStore = createVisualStore();

// Derived store for checking if we should show stars
export const shouldShowStars = derived(visualStore, ($visual) =>
	['stars', 'constellation', 'revelation', 'invitation'].includes($visual.state)
);

// Derived store for checking if we should show constellation lines
export const shouldShowConstellation = derived(visualStore, ($visual) =>
	['constellation', 'revelation', 'invitation'].includes($visual.state)
);

// Derived store for revelation state
export const isRevelation = derived(
	visualStore,
	($visual) => $visual.state === 'revelation'
);

// Derived store for invitation state
export const isInvitation = derived(
	visualStore,
	($visual) => $visual.state === 'invitation'
);
