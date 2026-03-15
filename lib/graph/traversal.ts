import { getGraph } from "@/lib/graph/graph";
import { getNode } from "@/lib/graph/nodeLookup";
import type { ReasoningNode, ReasoningEdgeType, NodeType } from "@/lib/graph/types";

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

/** Get immediate neighbors of a node, optionally filtered by edge type and node type. */
export function getNeighbors(
  nodeId: string,
  options: GetNeighborsOptions = {}
): Array<{ node: ReasoningNode; edgeType: string }> {
  const { nodes, edges } = getGraph();
  const nodeIds = new Set(nodes.map((n) => n.id));
  if (!nodeIds.has(nodeId)) return [];

  const { direction = "both", edgeTypes, nodeTypes } = options;
  const result: Array<{ node: ReasoningNode; edgeType: string }> = [];
  const seen = new Set<string>();

  for (const e of edges) {
    if (edgeTypes && !edgeTypes.includes(e.type)) continue;
    let neighborId: string | null = null;
    if (e.from === nodeId && (direction === "out" || direction === "both")) neighborId = e.to;
    if (e.to === nodeId && (direction === "in" || direction === "both")) neighborId = e.from;
    if (!neighborId || seen.has(neighborId)) continue;
    const node = getNode(neighborId);
    if (!node) continue;
    if (nodeTypes && !nodeTypes.includes(node.type)) continue;
    seen.add(neighborId);
    result.push({ node, edgeType: e.type });
  }
  return result;
}

/** Multi-hop traversal from a node. Returns all nodes within `steps` hops (and their edge types). */
export function traverse(
  nodeId: string,
  options: TraverseOptions
): Array<{ node: ReasoningNode; depth: number; edgeType: string }> {
  const { steps, direction = "both", edgeTypes, nodeTypes } = options;
  const start = getNode(nodeId);
  if (!start) return [];

  const result: Array<{ node: ReasoningNode; depth: number; edgeType: string }> = [
    { node: start, depth: 0, edgeType: "" },
  ];
  const visited = new Set<string>([nodeId]);
  let frontier = new Set<string>([nodeId]);

  for (let d = 0; d < steps; d++) {
    const nextFrontier = new Set<string>();
    for (const id of frontier) {
      const neighbors = getNeighbors(id, { direction, edgeTypes, nodeTypes });
      for (const { node, edgeType } of neighbors) {
        if (visited.has(node.id)) continue;
        visited.add(node.id);
        result.push({ node, depth: d + 1, edgeType });
        nextFrontier.add(node.id);
      }
    }
    frontier = nextFrontier;
  }
  return result;
}
