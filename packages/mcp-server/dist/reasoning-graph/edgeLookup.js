import { getGraph } from "./graph.js";
export function getOutEdges(nodeId, edgeType) {
    const { edges } = getGraph();
    let out = edges.filter((e) => e.from === nodeId);
    if (edgeType)
        out = out.filter((e) => e.type === edgeType);
    return out;
}
export function getInEdges(nodeId, edgeType) {
    const { edges } = getGraph();
    let in_ = edges.filter((e) => e.to === nodeId);
    if (edgeType)
        in_ = in_.filter((e) => e.type === edgeType);
    return in_;
}
export function getEdgesByType(edgeType) {
    const { edges } = getGraph();
    return edges.filter((e) => e.type === edgeType);
}
//# sourceMappingURL=edgeLookup.js.map