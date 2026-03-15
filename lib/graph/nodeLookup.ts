import { getGraph } from "@/lib/graph/graph";
import type { ReasoningNode, NodeType } from "@/lib/graph/types";

export function getNode(id: string): ReasoningNode | undefined {
  const { nodes } = getGraph();
  return nodes.find((n) => n.id === id);
}

export function getNodesByType(type: NodeType): ReasoningNode[] {
  const { nodes } = getGraph();
  return nodes.filter((n) => n.type === type);
}

export function getNodesByTag(tag: string): ReasoningNode[] {
  const { nodes } = getGraph();
  const lower = tag.toLowerCase();
  return nodes.filter((n) => n.tags.some((t) => t.toLowerCase() === lower));
}

/**
 * Text search over name, description, and tags. Returns nodes matching any term, ranked by match count.
 */
export function searchNodes(query: string, limit = 20): ReasoningNode[] {
  const { nodes } = getGraph();
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (terms.length === 0) return [];

  const scored: Array<{ node: ReasoningNode; score: number }> = [];
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
      if (nameLower.includes(term)) score += 10;
      else if (descLower.includes(term)) score += 3;
      else if (tagsLower.includes(term)) score += 5;
    }
    if (!allMatch) continue;
    scored.push({ node, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.node);
}

export function getAllNodes(): ReasoningNode[] {
  return getGraph().nodes;
}
