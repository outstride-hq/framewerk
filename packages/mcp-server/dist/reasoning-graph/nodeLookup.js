import { getGraph } from "./graph.js";
export function getNode(id) {
    const { nodes } = getGraph();
    return nodes.find((n) => n.id === id);
}
export function getNodesByType(type) {
    const { nodes } = getGraph();
    return nodes.filter((n) => n.type === type);
}
export function getNodesByTag(tag) {
    const { nodes } = getGraph();
    const lower = tag.toLowerCase();
    return nodes.filter((n) => n.tags.some((t) => t.toLowerCase() === lower));
}
export function searchNodes(query, limit = 20) {
    const { nodes } = getGraph();
    const terms = query
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
    if (terms.length === 0)
        return [];
    const scored = [];
    for (const node of nodes) {
        const nameLower = node.name.toLowerCase();
        const descLower = node.description.toLowerCase();
        const tagsLower = node.tags.map((t) => t.toLowerCase()).join(" ");
        const text = `${nameLower} ${descLower} ${tagsLower}`;
        let score = 0;
        let allMatch = true;
        for (const term of terms) {
            if (!text.includes(term)) {
                allMatch = false;
                break;
            }
            if (nameLower.includes(term))
                score += 10;
            else if (descLower.includes(term))
                score += 3;
            else if (tagsLower.includes(term))
                score += 5;
        }
        if (!allMatch)
            continue;
        scored.push({ node, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.node);
}
//# sourceMappingURL=nodeLookup.js.map