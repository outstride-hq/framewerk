export type NodeType = "framework" | "persona" | "debate_type" | "problem_type" | "principle" | "argument_pattern" | "decision_tool";
export type ReasoningEdgeType = "useful_for" | "balances" | "challenges" | "supports" | "similar_to" | "works_with" | "recommended_for" | "avoid_for" | "requires";
export interface ReasoningNode {
    id: string;
    type: NodeType;
    name: string;
    description: string;
    tags: string[];
    metadata?: Record<string, unknown>;
    worldview?: string;
    biases?: string[];
    preferred_frameworks?: string[];
    challenges?: string[];
    participants?: number;
    structure?: string[];
}
export interface ReasoningEdge {
    from: string;
    to: string;
    type: ReasoningEdgeType;
    weight?: number;
    metadata?: Record<string, unknown>;
}
//# sourceMappingURL=types.d.ts.map