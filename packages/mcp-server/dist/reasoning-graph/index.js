import { loadReasoningGraphFromDisk } from "./graph.js";
export { getNode, getNodesByType, getNodesByTag, searchNodes } from "./nodeLookup.js";
export { getOutEdges, getInEdges, getEdgesByType } from "./edgeLookup.js";
export { getNeighbors, traverse } from "./traversal.js";
export { designCouncil } from "./recommendation.js";
/**
 * Call once at MCP server startup to load the reasoning graph from data/graph/.
 */
export function initReasoningGraph() {
    loadReasoningGraphFromDisk();
}
//# sourceMappingURL=index.js.map