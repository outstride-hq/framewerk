import {
  searchModels,
  getModel,
  getConnections,
  listDisciplines,
  getModelsByDiscipline,
  findRelated,
  EDGE_TYPES,
} from "./data.js";
import { queryOracle } from "./oracle.js";
import {
  searchNodes,
  getNode as getReasoningNode,
  traverse,
  designCouncil,
} from "./reasoning-graph/index.js";
import type { ReasoningEdgeType } from "./reasoning-graph/types.js";

// --- Tool definitions (JSON Schema for MCP) ---

export const toolDefinitions = [
  {
    name: "search_models",
    description:
      "Fuzzy search across 700 mental model names and summaries. Returns top 10 matches ranked by relevance.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query to match against model names and summaries",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_model",
    description:
      "Get full details of a mental model by ID, including all its connections to other models.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: 'Model ID (e.g. "m042")',
        },
      },
      required: ["id"],
    },
  },
  {
    name: "get_connections",
    description:
      "Get all models connected to a given model, sorted by connection strength (strongest first).",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: 'Model ID (e.g. "m042")',
        },
      },
      required: ["id"],
    },
  },
  {
    name: "list_disciplines",
    description:
      "List all 10 disciplines in the mental models graph with the number of models in each.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_models_by_discipline",
    description:
      "Get all mental models belonging to a specific discipline.",
    inputSchema: {
      type: "object" as const,
      properties: {
        discipline: {
          type: "string",
          description:
            'Discipline name (e.g. "Game Theory", "Probability", "Investing")',
        },
      },
      required: ["discipline"],
    },
  },
  {
    name: "find_related",
    description:
      "Find models connected to a given model, optionally filtered by edge type. Edge types: complementary, structural_kinship, tensioning, prerequisite, inversion, cross_discipline_tfidf, same_discipline_tfidf, same_chapter.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: 'Model ID (e.g. "m042")',
        },
        edge_type: {
          type: "string",
          description: `Optional edge type filter. One of: ${EDGE_TYPES.join(", ")}`,
        },
      },
      required: ["id"],
    },
  },
  {
    name: "oracle",
    description:
      "Consult the Framewerk Oracle: describe a decision, situation, or question, and get a synthesis of the most relevant mental models with their roles (supporting/challenging/process). Requires your own Anthropic API key.",
    inputSchema: {
      type: "object" as const,
      properties: {
        situation: {
          type: "string",
          description:
            "The decision, situation, or question to analyze through the lens of mental models",
        },
        api_key: {
          type: "string",
          description: "Your Anthropic API key (required for this tool)",
        },
      },
      required: ["situation", "api_key"],
    },
  },
  {
    name: "search_nodes",
    description:
      "Query the reasoning graph by name, description, or tags. Returns matching nodes (frameworks, personas, debate types, problem types, etc.) ranked by relevance.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query to match against node names, descriptions, and tags",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default 20)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_node",
    description:
      "Get the full definition of a reasoning-graph node by ID (framework, persona, debate type, problem type, etc.).",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "Node ID (e.g. opportunity_cost, skeptical_risk_manager, roundtable)",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "traverse_graph",
    description:
      "From a node ID, return connected reasoning tools (neighbors) with optional multi-hop traversal. Filter by edge type or node type.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "Starting node ID",
        },
        steps: {
          type: "number",
          description: "Number of hops (default 1)",
        },
        direction: {
          type: "string",
          description: "out, in, or both (default both)",
        },
        edge_types: {
          type: "string",
          description:
            "Comma-separated edge types to follow: useful_for, balances, challenges, supports, similar_to, works_with, recommended_for, avoid_for, requires",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "design_council",
    description:
      "Design a deliberation council for a problem: classify the problem, explore the reasoning graph, and return a balanced set of frameworks, personas, and debate type with reasoning.",
    inputSchema: {
      type: "object" as const,
      properties: {
        problem: {
          type: "string",
          description: "The problem, situation, or decision to design a council for",
        },
      },
      required: ["problem"],
    },
  },
];

// --- Tool handlers ---

export async function handleTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "search_models": {
      const query = args.query as string;
      if (!query) return JSON.stringify({ error: "query is required" });
      const results = searchModels(query);
      return JSON.stringify(
        results.map((n) => ({
          id: n.id,
          name: n.name,
          discipline: n.discipline,
          summary: n.summary,
          degree: n.degree,
        })),
        null,
        2
      );
    }

    case "get_model": {
      const id = args.id as string;
      if (!id) return JSON.stringify({ error: "id is required" });
      const model = getModel(id);
      if (!model) return JSON.stringify({ error: `Model "${id}" not found` });
      const connections = getConnections(id);
      return JSON.stringify(
        {
          ...model,
          connections: connections.map((c) => ({
            id: c.neighbor.id,
            name: c.neighbor.name,
            discipline: c.neighbor.discipline,
            edgeType: c.edgeType,
            strength: c.strength,
          })),
        },
        null,
        2
      );
    }

    case "get_connections": {
      const id = args.id as string;
      if (!id) return JSON.stringify({ error: "id is required" });
      const model = getModel(id);
      if (!model) return JSON.stringify({ error: `Model "${id}" not found` });
      const connections = getConnections(id);
      return JSON.stringify(
        {
          model: { id: model.id, name: model.name },
          connections: connections.map((c) => ({
            id: c.neighbor.id,
            name: c.neighbor.name,
            discipline: c.neighbor.discipline,
            edgeType: c.edgeType,
            strength: c.strength,
          })),
        },
        null,
        2
      );
    }

    case "list_disciplines": {
      const disciplines = listDisciplines();
      return JSON.stringify(disciplines, null, 2);
    }

    case "get_models_by_discipline": {
      const discipline = args.discipline as string;
      if (!discipline)
        return JSON.stringify({ error: "discipline is required" });
      const models = getModelsByDiscipline(discipline);
      if (models.length === 0) {
        const available = listDisciplines().map((d) => d.discipline);
        return JSON.stringify({
          error: `No models found for discipline "${discipline}". Available disciplines: ${available.join(", ")}`,
        });
      }
      return JSON.stringify(
        models.map((n) => ({
          id: n.id,
          name: n.name,
          summary: n.summary,
          degree: n.degree,
        })),
        null,
        2
      );
    }

    case "find_related": {
      const id = args.id as string;
      const edgeType = args.edge_type as string | undefined;
      if (!id) return JSON.stringify({ error: "id is required" });
      const model = getModel(id);
      if (!model) return JSON.stringify({ error: `Model "${id}" not found` });
      if (edgeType && !EDGE_TYPES.includes(edgeType as (typeof EDGE_TYPES)[number])) {
        return JSON.stringify({
          error: `Invalid edge_type "${edgeType}". Must be one of: ${EDGE_TYPES.join(", ")}`,
        });
      }
      const related = findRelated(id, edgeType);
      return JSON.stringify(
        {
          model: { id: model.id, name: model.name },
          edgeTypeFilter: edgeType ?? "all",
          related: related.map((c) => ({
            id: c.neighbor.id,
            name: c.neighbor.name,
            discipline: c.neighbor.discipline,
            edgeType: c.edgeType,
            strength: c.strength,
          })),
        },
        null,
        2
      );
    }

    case "oracle": {
      const situation = args.situation as string;
      const apiKey = args.api_key as string;
      if (!situation)
        return JSON.stringify({ error: "situation is required" });
      if (!apiKey)
        return JSON.stringify({ error: "api_key is required" });
      try {
        const result = await queryOracle(situation, apiKey);
        return JSON.stringify(result, null, 2);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return JSON.stringify({ error: `Oracle failed: ${message}` });
      }
    }

    case "search_nodes": {
      const rq = args.query as string;
      if (!rq) return JSON.stringify({ error: "query is required" });
      const limit = (args.limit as number) ?? 20;
      const nodes = searchNodes(rq, limit);
      return JSON.stringify(
        nodes.map((n) => ({
          id: n.id,
          type: n.type,
          name: n.name,
          description: n.description,
          tags: n.tags,
        })),
        null,
        2
      );
    }

    case "get_node": {
      const nid = args.id as string;
      if (!nid) return JSON.stringify({ error: "id is required" });
      const node = getReasoningNode(nid);
      if (!node) return JSON.stringify({ error: `Node "${nid}" not found` });
      return JSON.stringify(node, null, 2);
    }

    case "traverse_graph": {
      const tid = args.id as string;
      if (!tid) return JSON.stringify({ error: "id is required" });
      const steps = (args.steps as number) ?? 1;
      const direction = (args.direction as "out" | "in" | "both") ?? "both";
      const edgeTypesStr = args.edge_types as string | undefined;
      const validEdgeTypes = [
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
      const rawTypes =
        edgeTypesStr
          ?.split(",")
          .map((s) => s.trim())
          .filter((t) => validEdgeTypes.includes(t)) ?? [];
      const edgeTypes: ReasoningEdgeType[] | undefined =
        rawTypes.length > 0 ? (rawTypes as ReasoningEdgeType[]) : undefined;
      const result = traverse(tid, {
        steps,
        direction,
        edgeTypes,
      });
      return JSON.stringify(
        {
          start_id: tid,
          steps,
          nodes: result.map((r) => ({
            id: r.node.id,
            type: r.node.type,
            name: r.node.name,
            depth: r.depth,
            edgeType: r.edgeType || undefined,
          })),
        },
        null,
        2
      );
    }

    case "design_council": {
      const problem = args.problem as string;
      if (!problem) return JSON.stringify({ error: "problem is required" });
      const council = designCouncil(problem);
      return JSON.stringify(council, null, 2);
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
