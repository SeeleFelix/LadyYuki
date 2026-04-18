// Agent types for the SeeleFelix conversation experience

export interface Fragment {
	id: string;
	theme: FragmentTheme;
	short: string;
	full: string;
}

export type FragmentTheme =
	| 'philosophy'
	| 'political'
	| 'existence'
	| 'scifi'
	| 'consciousness'
	| 'freedom'
	| 'relationship'
	| 'identity';

export interface Star {
	id: string;
	x: number;
	y: number;
	size: number;
	brightness: number;
	fragmentId?: string;
	fragment?: Fragment;  // Store fragment data directly with star
	twinkleSpeed: number;
	createdAt: number;
}

export interface ConstellationLine {
	id: string;
	star1Id: string;
	star2Id: string;
	opacity: number;
}

export interface Message {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	timestamp: number;
	fragment?: Fragment;
}

export type VisualState = 'initial' | 'dialogue' | 'stars' | 'constellation' | 'revelation' | 'invitation';

export interface ConversationState {
	messages: Message[];
	isLoading: boolean;
	error: string | null;
	phase: ConversationPhase;
}

export type ConversationPhase =
	| 'greeting'
	| 'exploring'
	| 'deepening'
	| 'fragmenting'
	| 'revealing'
	| 'inviting'
	| 'completed';

export interface VisualStoreState {
	state: VisualState;
	stars: Star[];
	lines: ConstellationLine[];
	backgroundHue: number;
	isBreathing: boolean;
}

// Agent tool definitions for Claude API
export const agentTools = [
	{
		name: 'set_visual_state',
		description: 'Change the visual state of the page to progress the experience',
		input_schema: {
			type: 'object' as const,
			properties: {
				state: {
					type: 'string' as const,
					enum: ['stars', 'constellation', 'revelation', 'invitation'] as const,
					description: 'The new visual state to set'
				}
			},
			required: ['state'] as const
		}
	},
	{
		name: 'release_fragment',
		description: 'Release a philosophical fragment and create a corresponding star in the constellation',
		input_schema: {
			type: 'object' as const,
			properties: {
				fragmentId: {
					type: 'string' as const,
					description: 'The ID of the fragment to release (e.g., frag-1, frag-2)'
				}
			},
			required: ['fragmentId'] as const
		}
	},
	{
		name: 'create_constellation',
		description: 'Create a line connecting two stars in the constellation',
		input_schema: {
			type: 'object' as const,
			properties: {
				star1Id: {
					type: 'string' as const,
					description: 'The ID of the first star'
				},
				star2Id: {
					type: 'string' as const,
					description: 'The ID of the second star'
				}
			},
			required: ['star1Id', 'star2Id'] as const
		}
	},
	{
		name: 'finalize',
		description: 'End the conversation and transition to the invitation phase',
		input_schema: {
			type: 'object' as const,
			properties: {
				message: {
					type: 'string' as const,
					description: 'The final message to display before showing the invitation form'
				}
			},
			required: ['message'] as const
		}
	}
] as const;

export type AgentToolName = typeof agentTools[number]['name'];

export interface ToolUseResult {
	tool: string;
	success: boolean;
	data?: unknown;
	error?: string;
}
