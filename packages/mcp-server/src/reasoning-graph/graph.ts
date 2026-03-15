import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ReasoningNode, ReasoningEdge, NodeType, ReasoningEdgeType } from "./types.js";

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
    throw new Error(`Invalid node at index ${i}: missing id, name, description, or tags`);
  }
  if (typeof n.type !== "string" || !NODE_TYPE_SET.has(n.type as NodeType)) {
    throw new Error(`Invalid node at index ${i}: type must be one of ${NODE_TYPES.join(", ")}`);
  }
  return n as unknown as ReasoningNode;
}

function validateEdge(raw: unknown, nodeIds: Set<string>, i: number): ReasoningEdge {
  const e = raw as Record<string, unknown>;
  if (typeof e.from !== "string" || typeof e.to !== "string" || typeof e.type !== "string") {
    throw new Error(`Invalid edge at index ${i}: missing from, to, or type`);
  }
  if (!nodeIds.has(e.from)) throw new Error(`Edge ${i}: unknown source "${e.from}"`);
  if (!nodeIds.has(e.to)) throw new Error(`Edge ${i}: unknown target "${e.to}"`);
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
    if (!nodeIds.has(e.from)) throw new Error(`Edge ${i}: unknown source "${e.from}"`);
    if (!nodeIds.has(e.to)) throw new Error(`Edge ${i}: unknown target "${e.to}"`);
  }
  cachedNodes = nodes;
  cachedEdges = edges;
}

export function getGraph(): ReasoningGraphData {
  return { nodes: cachedNodes, edges: cachedEdges };
}

export function setGraphFromRaw(rawNodes: unknown[], rawEdges: unknown[]): void {
  const nodes = rawNodes.map((item, i) => validateNode(item, i));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = rawEdges.map((item, i) => validateEdge(item, nodeIds, i));
  setGraph(nodes, edges);
}

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load reasoning graph from packages/mcp-server/data/graph/ (nodes.json, edges.json).
 */
export function loadReasoningGraphFromDisk(): void {
  const dataDir = join(__dirname, "..", "..", "data", "graph");
  const rawNodes = JSON.parse(readFileSync(join(dataDir, "nodes.json"), "utf-8"));
  const rawEdges = JSON.parse(readFileSync(join(dataDir, "edges.json"), "utf-8"));
  if (!Array.isArray(rawNodes)) throw new Error("nodes.json is not an array");
  if (!Array.isArray(rawEdges)) throw new Error("edges.json is not an array");
  setGraphFromRaw(rawNodes, rawEdges);
}
