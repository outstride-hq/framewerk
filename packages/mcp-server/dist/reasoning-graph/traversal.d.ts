import type { ReasoningNode, ReasoningEdgeType, NodeType } from "./types.js";
export type TraverseDirection = "out" | "in" | "both";
export interface GetNeighborsOptions {
    direction?: TraverseDirection;
    edgeTypes?: ReasoningEdgeType[];
    nodeTypes?: NodeType[];
}
export interface TraverseOptions {
    steps: number;
    direction?: TraverseDirection;
    edgeTypes?: ReasoningEdgeType[];
    nodeTypes?: NodeType[];
}
export declare function getNeighbors(nodeId: string, options?: GetNeighborsOptions): Array<{
    node: ReasoningNode;
    edgeType: string;
}>;
export declare function traverse(nodeId: string, options: TraverseOptions): Array<{
    node: ReasoningNode;
    depth: number;
    edgeType: string;
}>;
//# sourceMappingURL=traversal.d.ts.map