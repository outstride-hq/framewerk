import type { ReasoningNode, NodeType } from "./types.js";
export declare function getNode(id: string): ReasoningNode | undefined;
export declare function getNodesByType(type: NodeType): ReasoningNode[];
export declare function getNodesByTag(tag: string): ReasoningNode[];
export declare function searchNodes(query: string, limit?: number): ReasoningNode[];
//# sourceMappingURL=nodeLookup.d.ts.map