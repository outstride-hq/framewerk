import { DISCIPLINE_COLORS, EDGE_PARTICLE_COLORS } from "@/lib/constants";

// Discipline names — derived from the constants source of truth
export type Discipline = keyof typeof DISCIPLINE_COLORS;

// Edge relationship types — derived from the constants source of truth
export type EdgeType = keyof typeof EDGE_PARTICLE_COLORS;

// Raw node from nodes.json
export interface NodeData {
  id: string;
  name: string;
  discipline: Discipline;
  chapter: string;
  degree: number;
  summary: string;
}

// Raw edge from edges.json
export interface EdgeData {
  source: string;
  target: string;
  type: EdgeType;
  strength: number;
  label: string;
}

// 3D position after force layout
export interface NodePosition {
  x: number;
  y: number;
  z: number;
}

// Node with computed layout position
export interface LayoutNode extends NodeData {
  position: NodePosition;
  radius: number; // computed from degree
}

// Oracle model roles — how a model relates to the user's decision
export type OracleRole = "supporting" | "challenging" | "process";

// Oracle API response — a ranked model with actionable insights
export interface OracleResult {
  nodeId: string;
  name: string;
  discipline: Discipline;
  relevance: number; // 0–1, used for activation intensity
  role: OracleRole; // supporting, challenging, or process
  question: string; // one concrete question this model prompts you to ask
  stance: string; // what this model argues for/against — direct and specific
  application?: string; // deprecated, kept for backward compat
}

// Oracle API response envelope
export interface OracleResponse {
  query: string;
  synthesis: string; // 3-5 sentence framework weaving the top models together
  results: OracleResult[];
}

// Conversation message for follow-up queries
export interface OracleMessage {
  role: "user" | "assistant";
  content: string;
}

// --- Reasoning Graph (unified node/edge schema for deliberation) ---

export type NodeType =
  | "framework"
  | "persona"
  | "debate_type"
  | "problem_type"
  | "principle"
  | "argument_pattern"
  | "decision_tool";

export type ReasoningEdgeType =
  | "useful_for"
  | "balances"
  | "challenges"
  | "supports"
  | "similar_to"
  | "works_with"
  | "recommended_for"
  | "avoid_for"
  | "requires";

export interface ReasoningNode {
  id: string;
  type: NodeType;
  name: string;
  description: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  // Persona-specific (when type === "persona")
  worldview?: string;
  biases?: string[];
  preferred_frameworks?: string[];
  challenges?: string[];
  // Debate-type-specific (when type === "debate_type")
  participants?: number;
  structure?: string[];
}

export interface ReasoningEdge {
  from: string;
  to: string;
  type: ReasoningEdgeType;
  weight?: number;
  metadata?: Record<string, unknown>;
}

/** Rich persona shape (subset of ReasoningNode when type === "persona") */
export interface Persona {
  id: string;
  name: string;
  description: string;
  worldview: string;
  biases: string[];
  preferred_frameworks?: string[];
  challenges?: string[];
}

/** Debate type shape (subset of ReasoningNode when type === "debate_type") */
export interface DebateType {
  id: string;
  name: string;
  description: string;
  participants: number;
  structure: string[];
}

// ─── Council (Structured Debate) ───

export interface CouncilPersonaResult {
  persona: string;
  personaId: string;
  stance: string;
  argument: string;
  models: Array<{ id: string; name: string; relevance: string }>;
}

export interface CouncilResponse {
  question: string;
  debateType: string;
  debate: CouncilPersonaResult[];
  synthesis: string;
}
