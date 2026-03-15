"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useGraphStore } from "@/store/graphStore";
import { useCouncil } from "@/hooks/useCouncil";
import { DISCIPLINE_COLORS } from "@/lib/constants";
import type { Discipline } from "@/lib/graph/types";
import { playFireSound } from "@/lib/audio";
import graphNodesJson from "@/public/data/graph/nodes.json";

interface GraphNode {
  id: string;
  type: string;
  name: string;
  description: string;
  tags?: string[];
  worldview?: string;
  biases?: string[];
  preferred_frameworks?: string[];
  challenges?: string[];
  participants?: number;
  structure?: string[];
}

const graphNodes = graphNodesJson as GraphNode[];
const personas = graphNodes.filter((n) => n.type === "persona");
const debateTypes = graphNodes.filter((n) => n.type === "debate_type");

export function CouncilTab() {
  const [question, setQuestion] = useState("");
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(
    personas.map((p) => p.id),
  );
  const [selectedDebateType, setSelectedDebateType] = useState(debateTypes[0]?.id || "");
  const [error, setError] = useState<string | null>(null);
  const [synthExpanded, setSynthExpanded] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { submitCouncil, clearCouncil } = useCouncil();

  const councilLoading = useGraphStore((s) => s.councilLoading);
  const councilResults = useGraphStore((s) => s.councilResults);
  const apiKey = useGraphStore((s) => s.apiKey);
  const fireNode = useGraphStore((s) => s.fireNode);
  const setFlyToNode = useGraphStore((s) => s.setFlyToNode);
  const hydrateApiKey = useGraphStore((s) => s.hydrateApiKey);

  useEffect(() => {
    hydrateApiKey();
  }, [hydrateApiKey]);

  const togglePersona = useCallback((personaId: string) => {
    setSelectedPersonas((prev) => {
      if (prev.includes(personaId)) {
        // Don't allow deselecting all
        if (prev.length > 1) {
          return prev.filter((p) => p !== personaId);
        }
      } else {
        // Max 3 personas
        if (prev.length < 3) {
          return [...prev, personaId];
        }
      }
      return prev;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = question.trim();
    if (!trimmed || councilLoading) return;
    setError(null);
    try {
      await submitCouncil(trimmed, selectedPersonas, selectedDebateType, apiKey || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Council request failed");
    }
  }, [
    question,
    councilLoading,
    submitCouncil,
    selectedPersonas,
    selectedDebateType,
    apiKey,
  ]);

  const handleExploreModel = (modelId: string) => {
    fireNode(modelId, 0.8);
    setFlyToNode(modelId);
    playFireSound(0.7);
  };

  // Main panel
  return (
    <div className="flex flex-col h-full">
      {/* Input section */}
      <div className="flex-shrink-0 px-10 pt-8 pb-6">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-2 h-2 rounded-full" style={{ background: "#8CB4CC" }} />
          <span className="font-mono text-[10px] text-[#8CB4CC] tracking-[0.15em] uppercase">
            Council
          </span>
        </div>

        {/* Persona picker */}
        <div className="mb-6">
          <label className="font-mono text-[10px] text-[#5A7A8A] tracking-[0.1em] uppercase block mb-3">
            Personas ({selectedPersonas.length}/3)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {personas.map((persona) => {
              const isSelected = selectedPersonas.includes(persona.id);
              const canDeselect = selectedPersonas.length > 1;
              const canSelect = selectedPersonas.length < 3;
              const isDisabled = !isSelected && !canSelect;

              return (
                <button
                  key={persona.id}
                  onClick={() => togglePersona(persona.id)}
                  disabled={isDisabled}
                  className="p-3 rounded-lg text-left transition-all duration-200"
                  style={{
                    background: isSelected
                      ? "rgba(60, 90, 110, 0.3)"
                      : "rgba(12, 18, 24, 0.5)",
                    border: isSelected
                      ? "1px solid rgba(140, 180, 204, 0.5)"
                      : "1px solid rgba(60, 90, 110, 0.15)",
                    opacity: isDisabled ? 0.5 : 1,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                  }}
                >
                  <p className="font-sans text-[12px] font-medium text-[#E4EDF3] mb-1">
                    {persona.name}
                  </p>
                  <p className="font-sans text-[11px] text-[#7A9AAA] leading-[1.4]">
                    {persona.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Debate type picker */}
        <div className="mb-6">
          <label className="font-mono text-[10px] text-[#5A7A8A] tracking-[0.1em] uppercase block mb-3">
            Debate Format
          </label>
          <select
            value={selectedDebateType}
            onChange={(e) => setSelectedDebateType(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg font-sans text-[12px]
              bg-[rgba(12,18,24,0.7)] border border-[rgba(60,90,110,0.15)]
              text-[#E4EDF3] outline-none"
          >
            {debateTypes.map((dt) => (
              <option key={dt.id} value={dt.id}>
                {dt.name}
              </option>
            ))}
          </select>
        </div>

        {/* Question input */}
        <div className="mb-4">
          <label className="font-mono text-[10px] text-[#5A7A8A] tracking-[0.1em] uppercase block mb-3">
            Question
          </label>
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) {
                handleSubmit();
              }
            }}
            placeholder="What should we decide about?"
            disabled={councilLoading}
            rows={3}
            className="w-full px-4 py-3 rounded-lg font-sans text-[13px]
              bg-[rgba(12,18,24,0.7)] border border-[rgba(60,90,110,0.15)]
              text-[#E4EDF3] placeholder-[#3A5060] outline-none
              resize-none disabled:opacity-50"
          />
        </div>

        {error && (
          <div className="mb-3">
            <span className="font-mono text-[10px] text-[#E8614A]">{error}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={councilLoading || !question.trim() || selectedPersonas.length === 0}
          className="w-full py-2.5 px-4 rounded-lg font-mono text-[11px] tracking-widest
            uppercase transition-all duration-200 disabled:opacity-30"
          style={{
            background: councilLoading
              ? "rgba(60, 90, 110, 0.2)"
              : "rgba(140, 180, 204, 0.15)",
            color: councilLoading ? "#5A7A8A" : "#8CB4CC",
            border: "1px solid rgba(140, 180, 204, 0.2)",
          }}
        >
          {councilLoading ? "Council convening..." : "Convene Council"}
        </button>
      </div>

      {/* Results section */}
      {councilResults && (
        <div className="flex-1 overflow-y-auto">
          {/* Question hero */}
          <div className="px-10 pt-6 pb-6 border-t" style={{ borderTopColor: "#1A2830" }}>
            <h2 className="font-sans text-[14px] font-medium leading-[1.5] text-[#E4EDF3]">
              {councilResults.question}
            </h2>
            <p className="font-mono text-[9px] text-[#5A7A8A] tracking-widest mt-2">
              {councilResults.debateType}
            </p>
          </div>

          {/* Personas debate */}
          <div className="px-10 pb-6">
            {councilResults.debate.map((persona, idx) => (
              <div key={persona.personaId} className="mb-6 last:mb-0">
                {/* Persona header */}
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-sans text-[13px] font-medium text-[#C8DAE6]">
                    {persona.persona}
                  </h3>
                  <span className="font-mono text-[9px] px-2 py-1 rounded"
                    style={{
                      background: "rgba(140, 180, 204, 0.15)",
                      color: "#8CB4CC",
                    }}>
                    {idx + 1}
                  </span>
                </div>

                {/* Stance */}
                {persona.stance && (
                  <p className="font-sans text-[11px] italic text-[#A8BCC8] mb-2">
                    &ldquo;{persona.stance}&rdquo;
                  </p>
                )}

                {/* Argument */}
                {persona.argument && (
                  <p className="font-sans text-[12px] leading-[1.7] text-[#8A9EAA] mb-4">
                    {persona.argument}
                  </p>
                )}

                {/* Model pills */}
                {persona.models.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {persona.models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleExploreModel(model.id)}
                        className="px-3 py-1.5 rounded-full font-sans text-[10px]
                          transition-all duration-200 hover:opacity-100"
                        style={{
                          background: "rgba(140, 180, 204, 0.15)",
                          color: "#8CB4CC",
                          border: "1px solid rgba(140, 180, 204, 0.25)",
                        }}
                        title={model.relevance}
                      >
                        <span className="font-mono text-[9px]">{model.id}</span>
                        <span className="mx-1">—</span>
                        <span className="truncate">{model.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Synthesis */}
          {councilResults.synthesis && (
            <div className="px-10 pb-10 border-t" style={{ borderTopColor: "#1A2830" }}>
              <button
                onClick={() => setSynthExpanded(!synthExpanded)}
                className="w-full flex items-start gap-3 py-4 hover:opacity-80 transition-opacity"
              >
                <span className="font-mono text-[10px] text-[#5A7A8A] tracking-widest
                  uppercase flex-shrink-0 mt-0.5">
                  {synthExpanded ? "−" : "+"}
                </span>
                <div className="text-left flex-1">
                  <h4 className="font-mono text-[10px] text-[#5A7A8A] tracking-widest
                    uppercase mb-2">
                    Synthesis
                  </h4>
                  {synthExpanded && (
                    <p className="font-sans text-[12px] leading-[1.8] text-[#9AB0C0]">
                      {councilResults.synthesis}
                    </p>
                  )}
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {councilResults && (
        <div
          className="flex-shrink-0 px-10 py-4 flex items-center justify-between"
          style={{ borderTop: "1px solid #1A2830" }}
        >
          <span className="font-mono text-[9px] text-[#3A5060]">
            Council complete
          </span>
          <button
            onClick={() => {
              clearCouncil();
              setQuestion("");
              setError(null);
            }}
            className="font-mono text-[9px] text-[#5A7A8A] hover:text-[#8CB4CC]
              cursor-pointer tracking-widest uppercase transition-colors"
          >
            New Council
          </button>
        </div>
      )}
    </div>
  );
}
