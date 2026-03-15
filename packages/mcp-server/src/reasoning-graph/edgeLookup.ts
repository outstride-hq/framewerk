import { getGraph } from "./graph.js";
import type { ReasoningEdge, ReasoningEdgeType } from "./types.js";

export function getOutEdges(nodeId: string, edgeType?: ReasoningEdgeType): ReasoningEdge[] {
  const { edges } = getGraph();
  let out = edges.filter((e) => e.from === nodeId);
  if (edgeType) out = out.filter((e) => e.type === edgeType);
  return out;
}

export function getInEdges(nodeId: string, edgeType?: ReasoningEdgeType): ReasoningEdge[] {
  const { edges } = getGraph();
  let in_ = edges.filter((e) => e.to === nodeId);
  if (edgeType) in_ = in_.filter((e) => e.type === edgeType);
  return in_;
}

export function getEdgesByType(edgeType: ReasoningEdgeType): ReasoningEdge[] {
  const { edges } = getGraph();
  return edges.filter((e) => e.type === edgeType);
}
