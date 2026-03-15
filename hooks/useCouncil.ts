import { useCallback, useRef } from "react";
import { useGraphStore } from "@/store/graphStore";
import { playFireSound } from "@/lib/audio";
import type { CouncilResponse } from "@/lib/graph/types";

// Build neighbor map once from edges for cascade effect
function getNeighborMap(): Map<string, string[]> {
  const edges = useGraphStore.getState().edges;
  const map = new Map<string, string[]>();
  for (const edge of edges) {
    if (!map.has(edge.source)) map.set(edge.source, []);
    if (!map.has(edge.target)) map.set(edge.target, []);
    map.get(edge.source)!.push(edge.target);
    map.get(edge.target)!.push(edge.source);
  }
  return map;
}

export function useCouncil() {
  const cascadeTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cascade animation for council results
  function runCascade(results: CouncilResponse["debate"]) {
    const store = useGraphStore.getState();
    const nodeMap = new Map(store.nodes.map((n) => [n.id, n]));

    // Fire each referenced model in sequence
    const allModels: Array<{
      id: string;
      name: string;
      index: number;
      personaIndex: number;
    }> = [];
    for (let pi = 0; pi < results.length; pi++) {
      const persona = results[pi];
      for (const model of persona.models) {
        allModels.push({
          id: model.id,
          name: model.name,
          index: allModels.length,
          personaIndex: pi,
        });
      }
    }

    // Fire models with staggered timing
    for (let i = 0; i < allModels.length; i++) {
      const timer = setTimeout(() => {
        const model = allModels[i];
        const s = useGraphStore.getState();
        const intensity = 0.6 + Math.random() * 0.4;
        s.addCouncilActivatedNode(model.id);
        s.fireNode(model.id, intensity);
        playFireSound(0.3 + Math.random() * 0.3);
      }, 400 + i * 150);
      cascadeTimers.current.push(timer);
    }

    // After all models fire, compute camera target
    const settleTimer = setTimeout(() => {
      const state = useGraphStore.getState();
      const councilNodeIds = Array.from(state.councilActivatedNodes);

      let cx = 0,
        cy = 0,
        cz = 0;
      let count = 0;
      for (const id of councilNodeIds) {
        const node = nodeMap.get(id);
        if (node) {
          cx += node.position.x;
          cy += node.position.y;
          cz += node.position.z;
          count++;
        }
      }
      if (count > 0) {
        cx /= count;
        cy /= count;
        cz /= count;
        let maxDist = 0;
        for (const id of councilNodeIds) {
          const node = nodeMap.get(id);
          if (node) {
            const dx = node.position.x - cx,
              dy = node.position.y - cy,
              dz = node.position.z - cz;
            const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (d > maxDist) maxDist = d;
          }
        }
        const framingDist = Math.max(maxDist * 2.5, 80);
        state.setOracleFlyTarget({ x: cx, y: cy, z: cz, distance: framingDist });
      }
    }, 400 + allModels.length * 150 + 500);
    cascadeTimers.current.push(settleTimer);
  }

  const submitCouncil = useCallback(
    async (
      question: string,
      personaIds: string[],
      debateType: string,
      apiKey?: string,
    ) => {
      const store = useGraphStore.getState();

      // Clear previous timers
      for (const timer of cascadeTimers.current) clearTimeout(timer);
      cascadeTimers.current = [];

      if (store.synapseMode) store.exitSynapseMode();

      store.setCouncilLoading(true);
      store.setCouncilMode(true);
      store.setSelectedNode(null);

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (apiKey) {
          headers["X-OpenAI-Api-Key"] = apiKey;
        }

        const response = await fetch("/api/council", {
          method: "POST",
          headers,
          body: JSON.stringify({
            question,
            personaIds,
            debateType,
          }),
        });

        if (!response.ok) {
          let msg = "Council request failed";
          try {
            const err = await response.json();
            msg = err.error ?? msg;
          } catch {
            /* non-JSON response */
          }
          throw new Error(msg);
        }

        const data: CouncilResponse = await response.json();
        store.setCouncilResults(data);
        runCascade(data.debate);
      } catch (error) {
        console.error("Council error:", error);
        store.setCouncilLoading(false);
        throw error;
      } finally {
        store.setCouncilLoading(false);
      }
    },
    [],
  );

  const clearCouncil = useCallback(() => {
    for (const timer of cascadeTimers.current) clearTimeout(timer);
    cascadeTimers.current = [];

    const store = useGraphStore.getState();

    // Fade out over 1s, then reset
    const timer = setTimeout(() => {
      useGraphStore.getState().clearCouncil();
    }, 1000);
    cascadeTimers.current.push(timer);
  }, []);

  return { submitCouncil, clearCouncil };
}
