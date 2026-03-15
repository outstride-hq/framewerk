import type { ReasoningNode, ReasoningEdge, NodeType, ReasoningEdgeType } from "@/lib/graph/types";

const NODE_TYPES: NodeType[] = [
  "framework",
  "persona",
  "debate_type",
  "problem_type",
  "principle",
  "argument_pattern",
  "decision_tool",
];
const EDGE_TYPES: ReasoningEdgeType[] = [
  "useful_for",
  "balances",
  "challenges",
  "supports",
  "similar_to",
  "works_with",
  "recommended_for",
  "avoid_for",
  "requires",
];

const NODE_TYPE_SET = new Set(NODE_TYPES);
const EDGE_TYPE_SET = new Set(EDGE_TYPES);

let cachedNodes: ReasoningNode[] = [];
let cachedEdges: ReasoningEdge[] = [];

function validateNode(raw: unknown, i: number): ReasoningNode {
  const n = raw as Record<string, unknown>;
  if (
    typeof n.id !== "string" ||
    typeof n.name !== "string" ||
    typeof n.description !== "string" ||
    !Array.isArray(n.tags)
  ) {
    throw new Error(`Invalid node at index ${i}: missing or malformed id, name, description, or tags`);
  }
  if (typeof n.type !== "string" || !NODE_TYPE_SET.has(n.type as NodeType)) {
    throw new Error(`Invalid node at index ${i}: type must be one of ${NODE_TYPES.join(", ")}`);
  }
  return n as unknown as ReasoningNode;
}

function validateEdge(raw: unknown, nodeIds: Set<string>, i: number): ReasoningEdge {
  const e = raw as Record<string, unknown>;
  if (typeof e.from !== "string" || typeof e.to !== "string" || typeof e.type !== "string") {
    throw new Error(`Invalid edge at index ${i}: missing or malformed from, to, or type`);
  }
  if (!nodeIds.has(e.from)) throw new Error(`Edge ${i}: unknown source node "${e.from}"`);
  if (!nodeIds.has(e.to)) throw new Error(`Edge ${i}: unknown target node "${e.to}"`);
  if (!EDGE_TYPE_SET.has(e.type as ReasoningEdgeType)) {
    throw new Error(`Edge ${i}: type must be one of ${EDGE_TYPES.join(", ")}`);
  }
  return e as unknown as ReasoningEdge;
}

export interface ReasoningGraphData {
  nodes: ReasoningNode[];
  edges: ReasoningEdge[];
}

export function setGraph(nodes: ReasoningNode[], edges: ReasoningEdge[]): void {
  const nodeIds = new Set(nodes.map((n) => n.id));
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (!nodeIds.has(e.from)) throw new Error(`Edge ${i}: unknown source node "${e.from}"`);
    if (!nodeIds.has(e.to)) throw new Error(`Edge ${i}: unknown target node "${e.to}"`);
  }
  cachedNodes = nodes;
  cachedEdges = edges;
}

export function getGraph(): ReasoningGraphData {
  return { nodes: cachedNodes, edges: cachedEdges };
}

/**
 * Load reasoning graph from JSON (e.g. fetched from /data/graph).
 * Validates and then sets the graph for all lookups.
 */
export function setGraphFromRaw(rawNodes: unknown[], rawEdges: unknown[]): void {
  const nodes = rawNodes.map((item, i) => validateNode(item, i));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = rawEdges.map((item, i) => validateEdge(item, nodeIds, i));
  setGraph(nodes, edges);
}

/**
 * Load reasoning graph from a base URL (e.g. "/data/graph" in browser).
 * Fetches nodes.json and edges.json, validates, and sets the graph.
 */
export async function loadReasoningGraph(baseUrl = "/data/graph"): Promise<void> {
  const [nodesRes, edgesRes] = await Promise.all([
    fetch(`${baseUrl}/nodes.json`),
    fetch(`${baseUrl}/edges.json`),
  ]);
  if (!nodesRes.ok) throw new Error(`Failed to fetch nodes: ${nodesRes.status}`);
  if (!edgesRes.ok) throw new Error(`Failed to fetch edges: ${edgesRes.status}`);
  const rawNodes = await nodesRes.json();
  const rawEdges = await edgesRes.json();
  if (!Array.isArray(rawNodes)) throw new Error("nodes.json is not an array");
  if (!Array.isArray(rawEdges)) throw new Error("edges.json is not an array");
  setGraphFromRaw(rawNodes, rawEdges);
}
