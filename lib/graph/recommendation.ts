import { getNodesByType } from "@/lib/graph/nodeLookup";
import { getOutEdges, getInEdges } from "@/lib/graph/edgeLookup";
import { getNode } from "@/lib/graph/nodeLookup";
import type { ReasoningNode } from "@/lib/graph/types";

const RECOMMENDED_EDGES = ["useful_for", "recommended_for", "works_with"] as const;
const MAX_FRAMEWORKS = 3;
const MAX_PERSONAS = 3;

export interface DesignCouncilResult {
  frameworks: string[];
  personas: string[];
  debate_type: string;
  reasoning: string[];
}

/**
 * Classify problem text into problem_type node ids by keyword/tag similarity.
 */
function classifyProblem(problem: string): string[] {
  const terms = problem
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (terms.length === 0) return [];

  const problemTypes = getNodesByType("problem_type");
  const scored: Array<{ id: string; score: number }> = [];

  for (const pt of problemTypes) {
    const nameLower = pt.name.toLowerCase();
    const descLower = pt.description.toLowerCase();
    const tagsLower = pt.tags.map((t) => t.toLowerCase()).join(" ");
    const text = `${nameLower} ${descLower} ${tagsLower}`;
    let score = 0;
    for (const term of terms) {
      if (nameLower.includes(term)) score += 5;
      if (descLower.includes(term)) score += 2;
      if (tagsLower.includes(term)) score += 3;
    }
    if (score > 0) scored.push({ id: pt.id, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.id);
}

/**
 * Collect framework and persona ids reachable from problem_type nodes via useful_for, recommended_for, works_with.
 */
function collectFromProblemTypes(problemTypeIds: string[]): {
  frameworkIds: Map<string, number>;
  personaIds: Map<string, number>;
} {
  const frameworkIds = new Map<string, number>();
  const personaIds = new Map<string, number>();

  for (const pid of problemTypeIds) {
    // Edges *from* problem_type are less common; edges *to* problem_type (e.g. framework --useful_for--> problem_type) mean "framework is useful for this problem"
    const inEdges = getInEdges(pid).filter((e) =>
      RECOMMENDED_EDGES.includes(e.type as (typeof RECOMMENDED_EDGES)[number])
    );
    for (const e of inEdges) {
      const node = getNode(e.from);
      if (!node) continue;
      const depth = 1;
      if (node.type === "framework") {
        frameworkIds.set(node.id, Math.min(frameworkIds.get(node.id) ?? 10, depth));
      }
    }
    // Out edges: problem_type --recommended_for--> framework (if we had such direction)
    const outEdges = getOutEdges(pid).filter((e) =>
      RECOMMENDED_EDGES.includes(e.type as (typeof RECOMMENDED_EDGES)[number])
    );
    for (const e of outEdges) {
      const node = getNode(e.to);
      if (!node) continue;
      const depth = 1;
      if (node.type === "framework") {
        frameworkIds.set(node.id, Math.min(frameworkIds.get(node.id) ?? 10, depth));
      }
    }
  }

  // Personas: those that work_with any of the collected frameworks (persona --works_with--> framework)
  const allFrameworks = Array.from(frameworkIds.keys());
  const personaCandidates = getNodesByType("persona");
  for (const fid of allFrameworks) {
    const inEdges = getInEdges(fid).filter((e) => e.type === "works_with");
    for (const e of inEdges) {
      const fromNode = getNode(e.from);
      if (fromNode?.type === "persona") {
        personaIds.set(fromNode.id, (personaIds.get(fromNode.id) ?? 0) + 1);
      }
    }
  }
  if (personaIds.size === 0) {
    personaCandidates.forEach((n) => personaIds.set(n.id, 1));
  }

  return { frameworkIds, personaIds };
}

/**
 * Ensure balanced personas: prefer at least one "challenging" and one "supporting" style (by tags or challenges).
 */
function balancePersonas(personaIds: string[]): string[] {
  const nodes = personaIds.map((id) => getNode(id)).filter(Boolean) as ReasoningNode[];
  const challenging = nodes.filter(
    (n) => n.tags.some((t) => /challenge|risk|skeptical/i.test(t)) || (n as ReasoningNode).biases?.includes("risk")
  );
  const supporting = nodes.filter(
    (n) => n.tags.some((t) => /support|optimistic|growth/i.test(t)) || (n as ReasoningNode).biases?.includes("optimism")
  );
  const rest = nodes.filter((n) => !challenging.includes(n) && !supporting.includes(n));
  const result: string[] = [];
  if (challenging.length) result.push(challenging[0].id);
  if (supporting.length) result.push(supporting[0].id);
  for (const n of rest) {
    if (result.length >= MAX_PERSONAS) break;
    if (!result.includes(n.id)) result.push(n.id);
  }
  return result.slice(0, MAX_PERSONAS);
}

/**
 * Pick one debate_type that works_with the selected personas (debate_type --works_with--> persona).
 */
function pickDebateType(_frameworkIds: string[], personaIds: string[]): string {
  const debateTypes = getNodesByType("debate_type");
  const personaSet = new Set(personaIds);
  for (const dt of debateTypes) {
    const outEdges = getOutEdges(dt.id).filter((e) => e.type === "works_with");
    const worksWithPersona = outEdges.some((e) => personaSet.has(e.to));
    if (worksWithPersona) return dt.id;
  }
  return debateTypes[0]?.id ?? "roundtable";
}

/**
 * Build reasoning strings from problem type labels and graph context.
 */
function buildReasoning(problemTypeIds: string[], frameworkIds: string[], personaIds: string[]): string[] {
  const reasons: string[] = [];
  const problemNodes = problemTypeIds.map((id) => getNode(id)).filter(Boolean) as ReasoningNode[];
  if (problemNodes.length) {
    reasons.push(`Problem relates to: ${problemNodes.map((n) => n.name).join(", ")}`);
  }
  if (frameworkIds.length) {
    reasons.push("Frameworks selected for relevance to problem type and graph proximity.");
  }
  if (personaIds.length) {
    reasons.push("Balanced perspectives recommended (supporting and challenging voices).");
  }
  reasons.push("Decision impact considered; multiple viewpoints assembled.");
  return reasons;
}

/**
 * Design a council: classify problem, traverse graph, assemble balanced frameworks, personas, and debate type.
 */
export function designCouncil(problem: string): DesignCouncilResult {
  const problemTypeIds = classifyProblem(problem);
  if (problemTypeIds.length === 0) {
    // Default: use all problem types to get a broad set
    problemTypeIds.push(...getNodesByType("problem_type").map((n) => n.id));
  }

  const { frameworkIds, personaIds } = collectFromProblemTypes(problemTypeIds);

  const frameworkList = Array.from(frameworkIds.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => id)
    .slice(0, MAX_FRAMEWORKS);
  if (frameworkList.length === 0) {
    frameworkList.push(...getNodesByType("framework").map((n) => n.id).slice(0, MAX_FRAMEWORKS));
  }

  const personaList = balancePersonas(Array.from(personaIds.keys()));
  if (personaList.length === 0) {
    personaList.push(...getNodesByType("persona").map((n) => n.id).slice(0, MAX_PERSONAS));
  }

  const debateType = pickDebateType(frameworkList, personaList);
  const reasoning = buildReasoning(problemTypeIds, frameworkList, personaList);

  return {
    frameworks: frameworkList,
    personas: personaList,
    debate_type: debateType,
    reasoning,
  };
}
