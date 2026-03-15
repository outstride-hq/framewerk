import { getGraph } from "@/lib/graph/graph";
import type { ReasoningEdge, ReasoningEdgeType } from "@/lib/graph/types";

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

export function getEdgesBetween(fromId: string, toId: string): ReasoningEdge[] {
  const { edges } = getGraph();
  return edges.filter((e) => e.from === fromId && e.to === toId);
}

export function getEdgesByType(edgeType: ReasoningEdgeType): ReasoningEdge[] {
  const { edges } = getGraph();
  return edges.filter((e) => e.type === edgeType);
}

/** All edges touching this node (in or out). */
export function getEdgesForNode(nodeId: string, edgeType?: ReasoningEdgeType): ReasoningEdge[] {
  const { edges } = getGraph();
  let list = edges.filter((e) => e.from === nodeId || e.to === nodeId);
  if (edgeType) list = list.filter((e) => e.type === edgeType);
  return list;
}
