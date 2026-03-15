import type { ReasoningNode, ReasoningEdge } from "./types.js";
export interface ReasoningGraphData {
    nodes: ReasoningNode[];
    edges: ReasoningEdge[];
}
export declare function setGraph(nodes: ReasoningNode[], edges: ReasoningEdge[]): void;
export declare function getGraph(): ReasoningGraphData;
export declare function setGraphFromRaw(rawNodes: unknown[], rawEdges: unknown[]): void;
/**
 * Load reasoning graph from packages/mcp-server/data/graph/ (nodes.json, edges.json).
 */
export declare function loadReasoningGraphFromDisk(): void;
//# sourceMappingURL=graph.d.ts.map