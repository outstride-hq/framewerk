import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const NODE_TYPES = [
    "framework",
    "persona",
    "debate_type",
    "problem_type",
    "principle",
    "argument_pattern",
    "decision_tool",
];
const EDGE_TYPES = [
    "useful_for",
    "balances",
    "challenges",
    "supports",
    "similar_to",
    "works_with",
    "recommended_for",
    "avoid_for",
    "requires",
];
const NODE_TYPE_SET = new Set(NODE_TYPES);
const EDGE_TYPE_SET = new Set(EDGE_TYPES);
let cachedNodes = [];
let cachedEdges = [];
function validateNode(raw, i) {
    const n = raw;
    if (typeof n.id !== "string" ||
        typeof n.name !== "string" ||
        typeof n.description !== "string" ||
        !Array.isArray(n.tags)) {
        throw new Error(`Invalid node at index ${i}: missing id, name, description, or tags`);
    }
    if (typeof n.type !== "string" || !NODE_TYPE_SET.has(n.type)) {
        throw new Error(`Invalid node at index ${i}: type must be one of ${NODE_TYPES.join(", ")}`);
    }
    return n;
}
function validateEdge(raw, nodeIds, i) {
    const e = raw;
    if (typeof e.from !== "string" || typeof e.to !== "string" || typeof e.type !== "string") {
        throw new Error(`Invalid edge at index ${i}: missing from, to, or type`);
    }
    if (!nodeIds.has(e.from))
        throw new Error(`Edge ${i}: unknown source "${e.from}"`);
    if (!nodeIds.has(e.to))
        throw new Error(`Edge ${i}: unknown target "${e.to}"`);
    if (!EDGE_TYPE_SET.has(e.type)) {
        throw new Error(`Edge ${i}: type must be one of ${EDGE_TYPES.join(", ")}`);
    }
    return e;
}
export function setGraph(nodes, edges) {
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        if (!nodeIds.has(e.from))
            throw new Error(`Edge ${i}: unknown source "${e.from}"`);
        if (!nodeIds.has(e.to))
            throw new Error(`Edge ${i}: unknown target "${e.to}"`);
    }
    cachedNodes = nodes;
    cachedEdges = edges;
}
export function getGraph() {
    return { nodes: cachedNodes, edges: cachedEdges };
}
export function setGraphFromRaw(rawNodes, rawEdges) {
    const nodes = rawNodes.map((item, i) => validateNode(item, i));
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = rawEdges.map((item, i) => validateEdge(item, nodeIds, i));
    setGraph(nodes, edges);
}
const __dirname = dirname(fileURLToPath(import.meta.url));
/**
 * Load reasoning graph from packages/mcp-server/data/graph/ (nodes.json, edges.json).
 */
export function loadReasoningGraphFromDisk() {
    const dataDir = join(__dirname, "..", "..", "data", "graph");
    const rawNodes = JSON.parse(readFileSync(join(dataDir, "nodes.json"), "utf-8"));
    const rawEdges = JSON.parse(readFileSync(join(dataDir, "edges.json"), "utf-8"));
    if (!Array.isArray(rawNodes))
        throw new Error("nodes.json is not an array");
    if (!Array.isArray(rawEdges))
        throw new Error("edges.json is not an array");
    setGraphFromRaw(rawNodes, rawEdges);
}
//# sourceMappingURL=graph.js.map