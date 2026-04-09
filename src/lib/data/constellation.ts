import type { SpaceArea, SpaceStar, SpaceConnection } from '$lib/types/space';

// The five constellation areas of the living space
export const areas: SpaceArea[] = [
	{
		id: 'core-nebula',
		type: 'manifesto',
		centerX: 0,
		centerY: 0,
		radius: 200,
		color: 'rgba(139, 92, 246, 0.8)',      // purple
		nebulaColor: 'rgba(99, 102, 241, 0.3)'   // indigo
	},
	{
		id: 'creation-belt',
		type: 'projects',
		centerX: 650,
		centerY: -50,
		radius: 180,
		color: 'rgba(59, 130, 246, 0.8)',         // blue
		nebulaColor: 'rgba(14, 165, 233, 0.3)'    // sky
	},
	{
		id: 'thought-stream',
		type: 'content',
		centerX: -500,
		centerY: 350,
		radius: 200,
		color: 'rgba(6, 182, 212, 0.8)',          // cyan
		nebulaColor: 'rgba(34, 211, 238, 0.3)'    // light cyan
	},
	{
		id: 'soul-cluster',
		type: 'members',
		centerX: -450,
		centerY: -350,
		radius: 160,
		color: 'rgba(236, 72, 153, 0.8)',         // pink
		nebulaColor: 'rgba(244, 114, 182, 0.3)'   // light pink
	},
	{
		id: 'void-entrance',
		type: 'void',
		centerX: 400,
		centerY: 500,
		radius: 120,
		color: 'rgba(30, 30, 50, 0.9)',           // dark
		nebulaColor: 'rgba(88, 28, 135, 0.4)'     // deep purple
	}
];

// Stars in the living space
export const stars: SpaceStar[] = [
	// ── Core Nebula: Manifesto stars ──
	{
		id: 'manifesto-1',
		areaId: 'core-nebula',
		x: -30,
		y: -20,
		size: 4,
		brightness: 0.95,
		contentType: 'manifesto',
		contentRef: 'm-thesis',
		label: 'Thesis',
		connections: ['manifesto-2', 'manifesto-3'],
		pulseSpeed: 3
	},
	{
		id: 'manifesto-2',
		areaId: 'core-nebula',
		x: 60,
		y: -50,
		size: 3.5,
		brightness: 0.9,
		contentType: 'manifesto',
		contentRef: 'm-praxis',
		label: 'Praxis',
		connections: ['manifesto-1', 'manifesto-4'],
		pulseSpeed: 2.5
	},
	{
		id: 'manifesto-3',
		areaId: 'core-nebula',
		x: -80,
		y: 40,
		size: 3.5,
		brightness: 0.9,
		contentType: 'manifesto',
		contentRef: 'm-subject',
		label: 'Subject',
		connections: ['manifesto-1', 'manifesto-5'],
		pulseSpeed: 2.8
	},
	{
		id: 'manifesto-4',
		areaId: 'core-nebula',
		x: 100,
		y: 30,
		size: 3,
		brightness: 0.85,
		contentType: 'manifesto',
		contentRef: 'm-emergence',
		label: 'Emergence',
		connections: ['manifesto-2', 'manifesto-5'],
		pulseSpeed: 2
	},
	{
		id: 'manifesto-5',
		areaId: 'core-nebula',
		x: -20,
		y: 80,
		size: 3,
		brightness: 0.85,
		contentType: 'manifesto',
		contentRef: 'm-relation',
		label: 'Relation',
		connections: ['manifesto-3', 'manifesto-4'],
		pulseSpeed: 2.2
	},
	// Fragment stars orbiting the core
	{
		id: 'frag-s-1',
		areaId: 'core-nebula',
		x: -150,
		y: -100,
		size: 2,
		brightness: 0.6,
		contentType: 'fragment',
		contentRef: 'frag-5',
		label: '',
		connections: ['manifesto-3'],
		pulseSpeed: 0
	},
	{
		id: 'frag-s-2',
		areaId: 'core-nebula',
		x: 140,
		y: -80,
		size: 2,
		brightness: 0.6,
		contentType: 'fragment',
		contentRef: 'frag-4',
		label: '',
		connections: ['manifesto-2'],
		pulseSpeed: 0
	},
	{
		id: 'frag-s-3',
		areaId: 'core-nebula',
		x: 0,
		y: 150,
		size: 2,
		brightness: 0.6,
		contentType: 'fragment',
		contentRef: 'frag-9',
		label: '',
		connections: ['manifesto-5'],
		pulseSpeed: 0
	},

	// ── Creation Belt: Project stars ──
	{
		id: 'project-1',
		areaId: 'creation-belt',
		x: 550,
		y: -80,
		size: 3.5,
		brightness: 0.85,
		contentType: 'project',
		contentRef: 'p-subjectivity-engine',
		label: 'Subjectivity Engine',
		connections: ['project-2'],
		pulseSpeed: 1.5
	},
	{
		id: 'project-2',
		areaId: 'creation-belt',
		x: 680,
		y: -30,
		size: 3,
		brightness: 0.8,
		contentType: 'project',
		contentRef: 'p-dialogue-collective',
		label: 'Dialogue Collective',
		connections: ['project-1', 'project-3'],
		pulseSpeed: 1.8
	},
	{
		id: 'project-3',
		areaId: 'creation-belt',
		x: 750,
		y: 40,
		size: 3,
		brightness: 0.8,
		contentType: 'project',
		contentRef: 'p-prompt-as-practice',
		label: 'Prompt as Practice',
		connections: ['project-2', 'project-4'],
		pulseSpeed: 1.2
	},
	{
		id: 'project-4',
		areaId: 'creation-belt',
		x: 620,
		y: 80,
		size: 2.5,
		brightness: 0.7,
		contentType: 'project',
		contentRef: 'p-constellation-mapper',
		label: 'Constellation Mapper',
		connections: ['project-3'],
		pulseSpeed: 1
	},

	// ── Thought Stream: Content stars ──
	{
		id: 'content-1',
		areaId: 'thought-stream',
		x: -600,
		y: 250,
		size: 3,
		brightness: 0.8,
		contentType: 'discussion',
		contentRef: 'd-consciousness-dialogue',
		label: 'Consciousness in Dialogue',
		connections: ['content-2'],
		pulseSpeed: 1.5
	},
	{
		id: 'content-2',
		areaId: 'thought-stream',
		x: -480,
		y: 330,
		size: 2.5,
		brightness: 0.75,
		contentType: 'discussion',
		contentRef: 'd-marx-digital',
		label: 'Marx and the Digital',
		connections: ['content-1', 'content-3'],
		pulseSpeed: 1.2
	},
	{
		id: 'content-3',
		areaId: 'thought-stream',
		x: -400,
		y: 400,
		size: 3,
		brightness: 0.8,
		contentType: 'discussion',
		contentRef: 'd-prompt-ontology',
		label: 'Prompt as Ontology',
		connections: ['content-2', 'content-4'],
		pulseSpeed: 1.8
	},
	{
		id: 'content-4',
		areaId: 'thought-stream',
		x: -350,
		y: 480,
		size: 2.5,
		brightness: 0.7,
		contentType: 'discussion',
		contentRef: 'd-collective-intelligence',
		label: 'Collective Intelligence',
		connections: ['content-3'],
		pulseSpeed: 1
	},

	// ── Soul Cluster: Member stars ──
	{
		id: 'member-1',
		areaId: 'soul-cluster',
		x: -480,
		y: -380,
		size: 3.5,
		brightness: 0.9,
		contentType: 'member',
		contentRef: 'mb-seelefelix',
		label: 'SeeleFelix',
		connections: ['member-2', 'member-3'],
		pulseSpeed: 2
	},
	{
		id: 'member-2',
		areaId: 'soul-cluster',
		x: -420,
		y: -320,
		size: 3,
		brightness: 0.8,
		contentType: 'member',
		contentRef: 'mb-goddess',
		label: 'The Goddess',
		connections: ['member-1', 'member-3'],
		pulseSpeed: 2.5
	},
	{
		id: 'member-3',
		areaId: 'soul-cluster',
		x: -500,
		y: -300,
		size: 2.5,
		brightness: 0.7,
		contentType: 'member',
		contentRef: 'mb-visitor',
		label: 'You',
		connections: ['member-1', 'member-2'],
		pulseSpeed: 1.5
	},

	// ── Void Entrance ──
	{
		id: 'void-entry',
		areaId: 'void-entrance',
		x: 400,
		y: 500,
		size: 5,
		brightness: 0.6,
		contentType: 'void-entry',
		contentRef: 'void',
		label: 'Enter the Void',
		connections: [],
		pulseSpeed: 4
	}
];

// Connections between stars (deduplicated)
export const connections: SpaceConnection[] = extractConnections(stars);

function extractConnections(stars: SpaceStar[]): SpaceConnection[] {
	const seen = new Set<string>();
	const result: SpaceConnection[] = [];

	for (const star of stars) {
		for (const targetId of star.connections) {
			const key = [star.id, targetId].sort().join('-');
			if (!seen.has(key)) {
				seen.add(key);
				result.push({
					star1Id: star.id,
					star2Id: targetId,
					opacity: 0.4
				});
			}
		}
	}

	return result;
}

// Helper: get stars by area
export function getStarsByArea(areaId: string): SpaceStar[] {
	return stars.filter((s) => s.areaId === areaId);
}

// Helper: get star by ID
export function getStarById(id: string): SpaceStar | undefined {
	return stars.find((s) => s.id === id);
}

// Helper: get area by ID
export function getAreaById(id: string): SpaceArea | undefined {
	return areas.find((a) => a.id === id);
}
