// Effect types for the immersive dialogue experience
// Simplified to 6 core effects for a cohesive, deep mysterious atmosphere

export type AnimationType =
	| 'shimmer'     // Subtle brightness variation - 4s cycle (cold tech)
	| 'breathe'     // Subtle breathing - 3s cycle
	| 'float'       // Vertical floating - 4s cycle
	| 'luminous'    // Golden glow - 2.5s cycle
	| 'heartbeat';  // Heartbeat rhythm - 1.5s cycle

export interface AnimationConfig {
	type: AnimationType;
	duration: number;
}

export interface EffectDefinition {
	name: string;
	style?: string;
	animation?: AnimationConfig;
	timing?: number; // Extra delay for pauses
}

export interface TextSegment {
	type: 'text' | 'effect' | 'pause' | 'break';
	content: string;
	effect?: string;
	params?: Record<string, string | number>;
}

export type EffectRegistry = Record<string, EffectDefinition>;

// Animation configuration for the display system
export const ANIMATION_CONFIG = {
	segmentDelay: 150,      // Normal segment interval (ms)
	pauseDelay: 300,        // {pause} default value (ms)
	afterComplete: 500,     // Wait after all complete (ms)
	breatheCycle: 4000,     // Overall breathing cycle (ms)
};
