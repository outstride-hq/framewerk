import { getNodesByType, getNode } from "./nodeLookup.js";
import { getOutEdges, getInEdges } from "./edgeLookup.js";
const RECOMMENDED_EDGES = ["useful_for", "recommended_for", "works_with"];
const MAX_FRAMEWORKS = 3;
const MAX_PERSONAS = 3;
function classifyProblem(problem) {
    const terms = problem
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2);
    if (terms.length === 0)
        return [];
    const problemTypes = getNodesByType("problem_type");
    const scored = [];
    for (const pt of problemTypes) {
        const nameLower = pt.name.toLowerCase();
        const descLower = pt.description.toLowerCase();
        const tagsLower = pt.tags.map((t) => t.toLowerCase()).join(" ");
        let score = 0;
        for (const term of terms) {
            if (nameLower.includes(term))
                score += 5;
            if (descLower.includes(term))
                score += 2;
            if (tagsLower.includes(term))
                score += 3;
        }
        if (score > 0)
            scored.push({ id: pt.id, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map((s) => s.id);
}
function collectFromProblemTypes(problemTypeIds) {
    const frameworkIds = new Map();
    const personaIds = new Map();
    for (const pid of problemTypeIds) {
        const inEdges = getInEdges(pid).filter((e) => RECOMMENDED_EDGES.includes(e.type));
        for (const e of inEdges) {
            const node = getNode(e.from);
            if (!node)
                continue;
            if (node.type === "framework") {
                frameworkIds.set(node.id, Math.min(frameworkIds.get(node.id) ?? 10, 1));
            }
        }
        const outEdges = getOutEdges(pid).filter((e) => RECOMMENDED_EDGES.includes(e.type));
        for (const e of outEdges) {
            const node = getNode(e.to);
            if (!node)
                continue;
            if (node.type === "framework") {
                frameworkIds.set(node.id, Math.min(frameworkIds.get(node.id) ?? 10, 1));
            }
        }
    }
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
function balancePersonas(personaIds) {
    const nodes = personaIds.map((id) => getNode(id)).filter(Boolean);
    const challenging = nodes.filter((n) => n.tags.some((t) => /challenge|risk|skeptical/i.test(t)) || n.biases?.includes("risk"));
    const supporting = nodes.filter((n) => n.tags.some((t) => /support|optimistic|growth/i.test(t)) || n.biases?.includes("optimism"));
    const rest = nodes.filter((n) => !challenging.includes(n) && !supporting.includes(n));
    const result = [];
    if (challenging.length)
        result.push(challenging[0].id);
    if (supporting.length)
        result.push(supporting[0].id);
    for (const n of rest) {
        if (result.length >= MAX_PERSONAS)
            break;
        if (!result.includes(n.id))
            result.push(n.id);
    }
    return result.slice(0, MAX_PERSONAS);
}
function pickDebateType(_frameworkIds, personaIds) {
    const debateTypes = getNodesByType("debate_type");
    const personaSet = new Set(personaIds);
    for (const dt of debateTypes) {
        const outEdges = getOutEdges(dt.id).filter((e) => e.type === "works_with");
        if (outEdges.some((e) => personaSet.has(e.to)))
            return dt.id;
    }
    return debateTypes[0]?.id ?? "roundtable";
}
function buildReasoning(problemTypeIds, frameworkIds, personaIds) {
    const reasons = [];
    const problemNodes = problemTypeIds.map((id) => getNode(id)).filter(Boolean);
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
export function designCouncil(problem) {
    const problemTypeIds = classifyProblem(problem);
    if (problemTypeIds.length === 0) {
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
//# sourceMappingURL=recommendation.js.map