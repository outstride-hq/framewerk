import { getGraph } from "./graph.js";
import { getNode } from "./nodeLookup.js";
import { getOutEdges, getInEdges } from "./edgeLookup.js";
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

export function getNeighbors(
  nodeId: string,
  options: GetNeighborsOptions = {}
): Array<{ node: ReasoningNode; edgeType: string }> {
  const { edges } = getGraph();
  const { direction = "both", edgeTypes, nodeTypes } = options;
  const result: Array<{ node: ReasoningNode; edgeType: string }> = [];
  const seen = new Set<string>();

  const add = (e: { from: string; to: string; type: string }, neighborId: string) => {
    if (edgeTypes && !edgeTypes.includes(e.type as ReasoningEdgeType)) return;
    if (seen.has(neighborId)) return;
    const node = getNode(neighborId);
    if (!node) return;
    if (nodeTypes && !nodeTypes.includes(node.type)) return;
    seen.add(neighborId);
    result.push({ node, edgeType: e.type });
  };

  if (direction === "out" || direction === "both") {
    for (const e of getOutEdges(nodeId)) {
      add(e, e.to);
    }
  }
  if (direction === "in" || direction === "both") {
    for (const e of getInEdges(nodeId)) {
      add(e, e.from);
    }
  }
  return result;
}

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
