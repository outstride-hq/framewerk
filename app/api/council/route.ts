import { OpenAI } from "openai";
import { NextRequest } from "next/server";
import nodesJson from "@/public/data/nodes.json";
import graphNodesJson from "@/public/data/graph/nodes.json";
import type { CouncilResponse } from "@/lib/graph/types";

export const maxDuration = 60;

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// ─── Pre-computed data ───

type NodeRecord = { id: string; name: string; discipline: string; summary: string };
const mentalModels = nodesJson as NodeRecord[];
const mentalModelMap = new Map(mentalModels.map((n) => [n.id, n]));

type GraphNode = {
  id: string;
  type: string;
  name: string;
  description: string;
  tags: string[];
  worldview?: string;
  biases?: string[];
  preferred_frameworks?: string[];
  challenges?: string[];
  participants?: number;
  structure?: string[];
};
const graphNodes = graphNodesJson as GraphNode[];

// Extract personas and debate types from graph
const personas = graphNodes.filter((n) => n.type === "persona");
const debateTypes = graphNodes.filter((n) => n.type === "debate_type");
const personaMap = new Map(personas.map((p) => [p.id, p]));
const debateTypeMap = new Map(debateTypes.map((d) => [d.id, d]));

function buildCouncilPrompt(
  personaIds: string[],
  debateTypeId: string,
  question: string,
): string {
  const debateTypeNode = debateTypeMap.get(debateTypeId);
  const debateTypeName = debateTypeNode?.name ?? "Council";

  const personaProfiles = personaIds
    .map((id) => {
      const p = personaMap.get(id);
      if (!p) return null;
      return `- **${p.name}** (${id}): ${p.description}\n  Worldview: "${p.worldview || ""}"\n  Biases: ${(p.biases || []).join(", ")}\n  Preferred frameworks: ${(p.preferred_frameworks || []).join(", ")}`;
    })
    .filter(Boolean)
    .join("\n");

  return `You are facilitating a "${debateTypeName}" — a structured debate among personas with distinct worldviews.

PERSONAS IN THIS DEBATE:
${personaProfiles}

AVAILABLE MENTAL MODELS (700 total):
These are frameworks you can cite. When each persona argues, they MUST reference 2-4 specific mental models by ID (e.g., m042) that support their argument. Reference the name in parentheses.

QUESTION: "${question}"

Your task:

1. For each persona, generate:
   - **stance**: A 1-2 sentence position on the question, argued in character
   - **argument**: A 3-4 sentence detailed argument supporting their stance, including specific references to 2-4 mental models by ID (format: "m###")
   - **models**: Cite exactly 2-4 mental models (ID + name + why it's relevant) that the persona used

2. Generate a **synthesis**: 2-3 sentences summarizing key tensions, complementary insights, or a decision framework that emerges from the debate.

Format your response as valid JSON with this exact structure:
{
  "debate": [
    {
      "persona": "Persona Name",
      "personaId": "persona_id",
      "stance": "One sentence position",
      "argument": "3-4 sentence detailed argument with model citations (m###)",
      "models": [
        { "id": "m042", "name": "Model Name", "relevance": "Why this applies" }
      ]
    }
  ],
  "synthesis": "2-3 sentences on the key tensions and insights"
}

RULES:
- Each persona must argue in character, using their worldview and biases
- Every model ID you cite must exist in the 700-model database (valid format: m000 to m699)
- Return ONLY valid JSON, no markdown, no code blocks
- The "argument" field must reference 2-4 models by ID within the text`;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (isRateLimited(ip)) {
    return Response.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  try {
    const clientKey = request.headers.get("X-OpenAI-Api-Key");
    const envKey = process.env.OPENAI_API_KEY;
    const activeKey = clientKey || envKey;

    if (!activeKey) {
      return Response.json(
        {
          error:
            "No API key configured. Add your OpenAI API key in Settings.",
        },
        { status: 401 },
      );
    }

    const openai = new OpenAI({ apiKey: activeKey });
    const {
      question,
      personaIds,
      debateType,
    } = await request.json();

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return Response.json({ error: "Question is required" }, { status: 400 });
    }

    if (
      !personaIds ||
      !Array.isArray(personaIds) ||
      personaIds.length === 0
    ) {
      return Response.json(
        { error: "At least one persona must be selected" },
        { status: 400 },
      );
    }

    // Validate personas
    const validPersonaIds: string[] = personaIds.filter(
      (id: unknown) => typeof id === "string" && personaMap.has(id as string),
    );
    if (validPersonaIds.length === 0) {
      return Response.json(
        { error: "No valid personas selected" },
        { status: 400 },
      );
    }

    if (!debateType || !debateTypeMap.has(debateType)) {
      return Response.json(
        { error: "Invalid debate type" },
        { status: 400 },
      );
    }

    const trimmedQuestion = question.trim();
    const debateTypeNode = debateTypeMap.get(debateType)!;

    const systemPrompt = buildCouncilPrompt(validPersonaIds, debateType, trimmedQuestion);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 2000,
      temperature: 0.8,
      messages: [
        {
          role: "user",
          content: systemPrompt,
        },
      ],
    });

    const textBlock = response.choices[0];
    if (!textBlock || textBlock.message.role !== "assistant") {
      return Response.json({ error: "No response from Council" }, { status: 500 });
    }

    let jsonStr = textBlock.message.content?.trim() ?? "";
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr
        .replace(/^```(?:json)?\s*/, "")
        .replace(/```\s*$/, "");
    }

    const parsed = JSON.parse(jsonStr);

    // Validate and enrich the response
    const debate = (parsed.debate as Array<{
      persona: string;
      personaId: string;
      stance: string;
      argument: string;
      models: Array<{ id: string; name: string; relevance: string }>;
    }>) || [];

    // Ensure all models referenced exist and have names
    for (const persona of debate) {
      for (const model of persona.models) {
        const mentalModel = mentalModelMap.get(model.id);
        if (mentalModel) {
          model.name = mentalModel.name;
        }
      }
    }

    const result: CouncilResponse = {
      question: trimmedQuestion,
      debateType: debateTypeNode.name,
      debate,
      synthesis: (parsed.synthesis as string) || "",
    };

    return Response.json(result);
  } catch (error) {
    console.error("Council API error:", error);
    const isAuthError =
      error instanceof Error &&
      (error.message.toLowerCase().includes("auth") ||
        error.message.toLowerCase().includes("key") ||
        error.message.toLowerCase().includes("401") ||
        error.message.toLowerCase().includes("unauthorized"));
    return Response.json(
      { error: isAuthError ? "Invalid API key" : "Failed to process request" },
      { status: isAuthError ? 401 : 500 },
    );
  }
}
