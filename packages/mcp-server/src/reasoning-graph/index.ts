import { loadReasoningGraphFromDisk } from "./graph.js";

export { getNode, getNodesByType, getNodesByTag, searchNodes } from "./nodeLookup.js";
export { getOutEdges, getInEdges, getEdgesByType } from "./edgeLookup.js";
export { getNeighbors, traverse } from "./traversal.js";
export type { GetNeighborsOptions, TraverseOptions, TraverseDirection } from "./traversal.js";
export { designCouncil } from "./recommendation.js";
export type { DesignCouncilResult } from "./recommendation.js";
export type { ReasoningNode, ReasoningEdge, NodeType, ReasoningEdgeType } from "./types.js";

/**
 * Call once at MCP server startup to load the reasoning graph from data/graph/.
 */
export function initReasoningGraph(): void {
  loadReasoningGraphFromDisk();
}
