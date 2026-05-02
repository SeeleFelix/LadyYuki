import { writable } from 'svelte/store';
import type { Message } from '$lib/types/agent';

interface ConversationState {
	messages: Message[];
	isLoading: boolean;
	error: string | null;
}

function createConversationStore() {
	const initialState: ConversationState = {
		messages: [],
		isLoading: false,
		error: null
	};

	const { subscribe, set, update } = writable<ConversationState>(initialState);

	return {
		subscribe,
		addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => {
			update((state) => ({
				...state,
				messages: [
					...state.messages,
					{
						...message,
						id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
						timestamp: Date.now()
					}
				]
			}));
		},
		setLoading: (isLoading: boolean) => {
			update((state) => ({ ...state, isLoading }));
		},
		setError: (error: string | null) => {
			update((state) => ({ ...state, error }));
		},
		reset: () => set(initialState)
	};
}

export const conversationStore = createConversationStore();
