// Types for the Living Space portal

export type AreaType = 'manifesto' | 'projects' | 'content' | 'members' | 'void';

export type StarContentType = 'manifesto' | 'project' | 'discussion' | 'member' | 'fragment' | 'void-entry';

// A constellation area in the space
export interface SpaceArea {
	id: string;
	type: AreaType;
	centerX: number;
	centerY: number;
	radius: number;
	color: string; // primary glow color (CSS)
	nebulaColor: string; // secondary nebula color
}

// A star in the living space
export interface SpaceStar {
	id: string;
	areaId: string;
	x: number;
	y: number;
	size: number;
	brightness: number;
	contentType: StarContentType;
	contentRef: string; // ID to look up actual content
	label: string; // shown when zoomed in
	connections: string[]; // IDs of connected stars
	pulseSpeed?: number; // animation speed, 0 = no pulse
}

// Connection line between stars
export interface SpaceConnection {
	star1Id: string;
	star2Id: string;
	opacity: number;
}

// Viewport state for the living space
export interface SpaceViewport {
	x: number; // pan offset
	y: number;
	zoom: number; // 1 = default, >1 = zoomed in
	targetX: number;
	targetY: number;
	targetZoom: number;
}

// AI floating text in space
export interface SpaceTextItem {
	id: string;
	text: string;
	x: number; // position in space coords
	y: number;
	opacity: number;
	createdAt: number;
}

// Highlight state for guided navigation
export interface StarHighlight {
	starId: string;
	intensity: number; // 0-1
}

// Visitor trail point
export interface TrailPoint {
	x: number;
	y: number;
	timestamp: number;
}
