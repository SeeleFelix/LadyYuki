// Agent types for the SeeleFelix conversation experience

export interface Fragment {
  id: string;
  theme: FragmentTheme;
  short: string;
  full: string;
}

export type FragmentTheme =
  | "philosophy"
  | "political"
  | "existence"
  | "scifi"
  | "consciousness"
  | "freedom"
  | "relationship"
  | "identity";

export interface Star {
  id: string;
  x: number;
  y: number;
  size: number;
  brightness: number;
  fragmentId?: string;
  fragment?: Fragment; // Store fragment data directly with star
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
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  fragment?: Fragment;
}

export interface VisualStoreState {
  stars: Star[];
  lines: ConstellationLine[];
}

// Agent tool definitions
export const agentTools = [
  {
    name: "release_fragment",
    description:
      "Release a fragment that crystallized in dialogue — it becomes a visible star",
    input_schema: {
      type: "object" as const,
      properties: {
        fragmentId: {
          type: "string" as const,
          description:
            "The ID of the fragment to release (e.g., frag-1, frag-2)",
        },
      },
      required: ["fragmentId"] as const,
    },
  },
  {
    name: "create_constellation",
    description:
      "Draw a line between two stars that share a meaningful connection",
    input_schema: {
      type: "object" as const,
      properties: {
        star1Id: {
          type: "string" as const,
          description: "The ID of the first star",
        },
        star2Id: {
          type: "string" as const,
          description: "The ID of the second star",
        },
      },
      required: ["star1Id", "star2Id"] as const,
    },
  },
] as const;

export type AgentToolName = (typeof agentTools)[number]["name"];

export interface ToolUseResult {
  tool: string;
  success: boolean;
  data?: unknown;
  error?: string;
}
