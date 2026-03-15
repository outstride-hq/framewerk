import { getGraph } from "./graph.js";
import { getNode } from "./nodeLookup.js";
import { getOutEdges, getInEdges } from "./edgeLookup.js";
export function getNeighbors(nodeId, options = {}) {
    const { edges } = getGraph();
    const { direction = "both", edgeTypes, nodeTypes } = options;
    const result = [];
    const seen = new Set();
    const add = (e, neighborId) => {
        if (edgeTypes && !edgeTypes.includes(e.type))
            return;
        if (seen.has(neighborId))
            return;
        const node = getNode(neighborId);
        if (!node)
            return;
        if (nodeTypes && !nodeTypes.includes(node.type))
            return;
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
export function traverse(nodeId, options) {
    const { steps, direction = "both", edgeTypes, nodeTypes } = options;
    const start = getNode(nodeId);
    if (!start)
        return [];
    const result = [
        { node: start, depth: 0, edgeType: "" },
    ];
    const visited = new Set([nodeId]);
    let frontier = new Set([nodeId]);
    for (let d = 0; d < steps; d++) {
        const nextFrontier = new Set();
        for (const id of frontier) {
            const neighbors = getNeighbors(id, { direction, edgeTypes, nodeTypes });
            for (const { node, edgeType } of neighbors) {
                if (visited.has(node.id))
                    continue;
                visited.add(node.id);
                result.push({ node, depth: d + 1, edgeType });
                nextFrontier.add(node.id);
            }
        }
        frontier = nextFrontier;
    }
    return result;
}
//# sourceMappingURL=traversal.js.map