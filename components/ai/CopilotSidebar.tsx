"use client";

import React, { useState, useRef, useEffect } from "react";
import { marked } from "marked";
import {
  Sparkles,
  Send,
  Check,
  CornerDownLeft,
  Undo2,
  RotateCcw,
  Sliders,
  FileText,
  History,
  MessageSquare,
  KeyRound,
  Cpu,
  Layers,
  ArrowRight,
  Square,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import {
  DocumentGenre,
  GENRE_ENGINE,
  OPENROUTER_MODELS,
} from "@/lib/genres";
import { GenerationHistoryEntry } from "@/lib/storage";

export type SidebarTab = "chat" | "tuning" | "outline" | "history";

interface CopilotSidebarProps {
  genre: DocumentGenre;
  documentTitle: string;
  targetWords: number;
  currentWordCount: number;
  stylePresetId: string;
  onChangeStylePreset: (presetId: string) => void;
  selectedModel: string;
  onChangeModel: (modelId: string) => void;
  apiKey: string;
  onChangeApiKey: (key: string) => void;
  outlineNotes: string;
  onChangeOutlineNotes: (notes: string) => void;
  customSystemPrompt: string;
  onChangeCustomSystemPrompt: (val: string) => void;
  history: GenerationHistoryEntry[];
  onAddHistory: (entry: GenerationHistoryEntry) => void;
  getEditorPlainText: () => string;
  selectedEditorText: string;
  onApplyDraft: (markdown: string, mode: "append" | "insert" | "replace") => void;
  onUndoDraft: () => void;
  initialPromptToRun?: string;
  onClearInitialPrompt?: () => void;
}

interface PostGenSummary {
  wordCount: number;
  headingCount: number;
  codeBlockCount: number;
  calloutCount: number;
  structuralNotes: string[];
  nextStepSuggestions: string[];
  streamMode: string;
  modelUsed: string;
}

function computeSummary(
  markdown: string,
  genre: DocumentGenre,
  streamMode: string,
  modelUsed: string
): PostGenSummary {
  const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const headingMatches = markdown.match(/^#{1,3}\s+.+$/gm) || [];
  const codeBlockMatches = markdown.match(/```[\s\S]*?```/g) || [];
  const calloutMatches = markdown.match(/^>\s+.+$/gm) || [];

  const structuralNotes: string[] = [];
  if (headingMatches.length > 0) {
    structuralNotes.push(
      `${headingMatches.length} hierarchical section heading${
        headingMatches.length > 1 ? "s" : ""
      } structured`
    );
  }
  if (calloutMatches.length > 0) {
    structuralNotes.push(
      `${calloutMatches.length} callout / epigraph blockquote${
        calloutMatches.length > 1 ? "s" : ""
      } framed`
    );
  }
  if (codeBlockMatches.length > 0) {
    structuralNotes.push(
      `${codeBlockMatches.length} executable code/config block${
        codeBlockMatches.length > 1 ? "s" : ""
      } included`
    );
  }
  if (structuralNotes.length === 0) {
    structuralNotes.push(
      `Calibrated ${GENRE_ENGINE[genre].label} prose block (${words} words)`
    );
  }

  const nextStepsByGenre: Record<DocumentGenre, string[]> = {
    fiction: [
      "Deepen sensory contrast & subtext in the closing exchange",
      "Draft the subsequent scene transition with a sharp narrative hook",
      "Introduce an internal character beat or environmental complication",
    ],
    nonfiction: [
      "Add an empirical counter-thesis section to steelman the argument",
      "Synthesize a Key Insight callout box summarizing the section",
      "Transition into concrete historical or industry case evidence",
    ],
    technical: [
      "Append a post-execution Verification & Health Check command block",
      "Add a Rollback & Failure Recovery procedure for production safety",
      "Generate an environment variable and parameter reference table",
    ],
  };

  return {
    wordCount: words,
    headingCount: headingMatches.length,
    codeBlockCount: codeBlockMatches.length,
    calloutCount: calloutMatches.length,
    structuralNotes,
    nextStepSuggestions: nextStepsByGenre[genre],
    streamMode,
    modelUsed,
  };
}

export function CopilotSidebar({
  genre,
  documentTitle,
  targetWords,
  currentWordCount,
  stylePresetId,
  onChangeStylePreset,
  selectedModel,
  onChangeModel,
  apiKey,
  onChangeApiKey,
  outlineNotes,
  onChangeOutlineNotes,
  customSystemPrompt,
  onChangeCustomSystemPrompt,
  history,
  onAddHistory,
  getEditorPlainText,
  selectedEditorText,
  onApplyDraft,
  onUndoDraft,
  initialPromptToRun,
  onClearInitialPrompt,
}: CopilotSidebarProps) {
  const genreConfig = GENRE_ENGINE[genre];
  const [activeTab, setActiveTab] = useState<SidebarTab>("chat");
  const [promptInput, setPromptInput] = useState("");
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedMarkdown, setStreamedMarkdown] = useState("");
  const [summary, setSummary] = useState<PostGenSummary | null>(null);
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);
  const [temperature, setTemperature] = useState(0.7);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const triggerGeneration = async (customPrompt?: string) => {
    const promptToUse = (customPrompt ?? promptInput).trim();
    if (!promptToUse && !isStreaming) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLastSubmittedPrompt(promptToUse);
    if (!customPrompt) setPromptInput("");
    setIsStreaming(true);
    setStreamedMarkdown("");
    setSummary(null);
    setAppliedBanner(null);
    setActiveTab("chat");

    let accumulated = "";
    let streamMode = "openrouter-live";
    let modelUsed = selectedModel;

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-openrouter-key": apiKey } : {}),
        },
        body: JSON.stringify({
          prompt: promptToUse,
          genre,
          documentTitle,
          targetWords,
          currentWordCount,
          editorText: getEditorPlainText(),
          selectedText: selectedEditorText,
          stylePresetId,
          customSystemGuidance: customSystemPrompt,
          model: selectedModel,
          apiKey,
          temperature,
        }),
        signal: controller.signal,
      });

      streamMode =
        response.headers.get("X-Stream-Mode") || "calibrated-studio-fallback";
      modelUsed = response.headers.get("X-Model-Used") || selectedModel;

      if (!response.ok || !response.body) {
        throw new Error(`Generation request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamedMarkdown(accumulated);

        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop =
            scrollContainerRef.current.scrollHeight;
        }
      }

      const finalSummary = computeSummary(
        accumulated,
        genre,
        streamMode,
        modelUsed
      );
      setSummary(finalSummary);

      onAddHistory({
        id: `gen-${Date.now()}`,
        timestamp: new Date().toISOString(),
        prompt: promptToUse,
        genre,
        model: modelUsed,
        outputMarkdown: accumulated,
        wordCount: finalSummary.wordCount,
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setStreamedMarkdown(
          accumulated ||
            `> **Note:** Stream interrupted. Please check your OpenRouter configuration or retry.`
        );
      }
    } finally {
      setIsStreaming(false);
    }
  };

  // Run initial prompt if navigated from Home Hero Creation Console
  useEffect(() => {
    if (initialPromptToRun && initialPromptToRun.trim()) {
      const prompt = initialPromptToRun;
      onClearInitialPrompt?.();
      triggerGeneration(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPromptToRun]);

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const renderedPreviewHtml = streamedMarkdown
    ? (marked.parse(streamedMarkdown, { async: false }) as string)
    : "";

  // Universal cross-genre shortcuts + active genre shortcuts
  const quickShortcuts = [
    {
      label: "Expand Scene",
      prompt:
        "Expand the current scene or section with vivid detail, stronger pacing, and deeper context.",
    },
    {
      label: "Generate Steps",
      prompt:
        "Generate a clear procedural step-by-step sequence with prerequisites, numbered actions, and verification checks.",
    },
    {
      label: "Add Dialogue",
      prompt:
        "Write a sharp, character-driven dialogue exchange with strong subtext and natural cadence.",
    },
    ...genreConfig.promptShortcuts.filter(
      (s) =>
        !["Expand Scene", "Generate Steps", "Add Dialogue"].includes(s.label)
    ),
  ].slice(0, 5);

  return (
    <aside className="flex flex-col h-full bg-[#0d0f12] border-l border-neutral-800/90 text-neutral-200 select-none">
      {/* Sidebar Header with 4 Studio Tabs */}
      <div className="px-4 pt-3 pb-2.5 border-b border-neutral-800/80 bg-[#0d0f12]">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div>
              <span className="text-xs font-semibold tracking-wide text-white uppercase">
                AI Co-Writer Studio
              </span>
            </div>
          </div>

          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${genreConfig.badgeClass}`}
          >
            {genreConfig.emoji} {genreConfig.shortLabel} Engine
          </span>
        </div>

        {/* Navigation Tabs: Chat, Style Tuning, Outline/Notes, History */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#16191f] border border-neutral-800/90">
          <TabPill
            active={activeTab === "chat"}
            onClick={() => setActiveTab("chat")}
            icon={<MessageSquare className="w-3 h-3" />}
            label="Chat"
          />
          <TabPill
            active={activeTab === "tuning"}
            onClick={() => setActiveTab("tuning")}
            icon={<Sliders className="w-3 h-3" />}
            label="Style Tuning"
          />
          <TabPill
            active={activeTab === "outline"}
            onClick={() => setActiveTab("outline")}
            icon={<FileText className="w-3 h-3" />}
            label="Outline/Notes"
          />
          <TabPill
            active={activeTab === "history"}
            onClick={() => setActiveTab("history")}
            icon={<History className="w-3 h-3" />}
            label="History"
            badgeCount={history.length > 0 ? history.length : undefined}
          />
        </div>
      </div>

      {/* Main Tab Body */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {activeTab === "chat" && (
          <>
            {/* Active Genre Calibration Banner Card */}
            <div className="p-3 rounded-xl bg-[#16191f] border border-amber-500/20 shadow-inner">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-amber-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  Genre Calibration Preprocessor
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">
                  {
                    (
                       genreConfig.stylePresets.find(
                        (s) => s.id === stylePresetId
                      ) || genreConfig.stylePresets[0]
                    ).name
                  }
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Auto-prepending{" "}
                <span className="text-neutral-200 font-medium">
                  {genreConfig.label}
                </span>{" "}
                system directives ({genreConfig.tagline.toLowerCase()}) +
                manuscript metadata to every OpenRouter completion.
              </p>

              {selectedEditorText && (
                <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-start gap-2">
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold shrink-0">
                    Selection Active
                  </span>
                  <p className="text-[11px] text-neutral-300 line-clamp-2 italic">
                    &ldquo;{selectedEditorText}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Streaming Draft Response Card (Deep Tinted Surface) */}
            {(isStreaming || streamedMarkdown) ? (
              <div className="rounded-2xl bg-amber-950/20 border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.08)] overflow-hidden transition-all">
                {/* Card Header */}
                <div className="px-4 py-2.5 bg-amber-950/30 border-b border-amber-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isStreaming
                          ? "bg-amber-400 animate-ping"
                          : "bg-emerald-400"
                      }`}
                    />
                    <span className="text-xs font-semibold text-amber-200">
                      {isStreaming
                        ? "Streaming Co-Writer Draft..."
                        : "Calibrated Draft Ready"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isStreaming && (
                      <button
                        type="button"
                        onClick={stopStreaming}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 text-[11px] hover:bg-red-500/30"
                      >
                        <Square className="w-2.5 h-2.5 fill-current" />
                        Stop
                      </button>
                    )}
                    {summary && (
                      <span className="text-[11px] font-mono text-amber-300/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        +{summary.wordCount} words
                      </span>
                    )}
                  </div>
                </div>

                {/* Prompt Reference */}
                {lastSubmittedPrompt && (
                  <div className="px-4 py-2 bg-[#0d0f12]/60 border-b border-amber-500/15 text-[11px] text-neutral-400 flex items-center gap-1.5">
                    <span className="text-amber-400 font-medium shrink-0">
                      Directive:
                    </span>
                    <span className="truncate text-neutral-300">
                      {lastSubmittedPrompt}
                    </span>
                  </div>
                )}

                {/* Live Streamed Markdown Content */}
                <div className="p-4 max-h-[340px] overflow-y-auto select-text">
                  <div
                    className="prose prose-invert max-w-none text-xs leading-relaxed space-y-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-amber-200 [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-white [&_p]:text-neutral-200 [&_blockquote]:border-l-2 [&_blockquote]:border-amber-400 [&_blockquote]:pl-3 [&_blockquote]:py-1 [&_blockquote]:bg-amber-500/10 [&_blockquote]:rounded-r [&_blockquote]:text-amber-100 [&_pre]:bg-[#060709] [&_pre]:p-2.5 [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-emerald-500/30 [&_code]:text-emerald-300 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                    dangerouslySetInnerHTML={{ __html: renderedPreviewHtml }}
                  />
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 align-middle bg-amber-400 animate-pulse" />
                  )}
                </div>

                {/* One-Click Action Buttons */}
                <div className="px-3.5 py-3 bg-[#0d0f12]/90 border-t border-amber-500/25 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isStreaming || !streamedMarkdown.trim()}
                    onClick={() => {
                      onApplyDraft(streamedMarkdown, "append");
                      setAppliedBanner("Applied to end of document");
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.35)] transition-all disabled:opacity-40 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ✓ Apply to Document
                  </button>

                  <button
                    type="button"
                    disabled={isStreaming || !streamedMarkdown.trim()}
                    onClick={() => {
                      onApplyDraft(streamedMarkdown, "insert");
                      setAppliedBanner("Inserted at active cursor");
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-200 border border-cyan-500/35 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    <CornerDownLeft className="w-3 h-3 text-cyan-400" />
                    Insert at Cursor
                  </button>

                  <button
                    type="button"
                    disabled={isStreaming}
                    onClick={() => {
                      onUndoDraft();
                      setAppliedBanner("Reverted last document change");
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#16191f] hover:bg-neutral-800 text-neutral-300 border border-neutral-700 transition-all cursor-pointer"
                  >
                    <Undo2 className="w-3 h-3" />
                    Undo
                  </button>

                  <button
                    type="button"
                    disabled={isStreaming}
                    onClick={() =>
                      triggerGeneration(
                        lastSubmittedPrompt ||
                          `Continue expanding "${documentTitle}"`
                      )
                    }
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#16191f] hover:bg-neutral-800 text-amber-300 border border-amber-500/30 transition-all ml-auto cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Regenerate
                  </button>
                </div>

                {appliedBanner && (
                  <div className="px-4 py-1.5 bg-emerald-950/50 border-t border-emerald-500/30 flex items-center justify-between text-[11px] text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {appliedBanner}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAppliedBanner(null)}
                      className="text-emerald-400/70 hover:text-emerald-200"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Empty State Action Card when no stream has been run yet */
              <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 text-center space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-white">
                    Co-Writer Ready for {genreConfig.label}
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                    Select a prompt shortcut below or describe the next scene,
                    argument, or procedural step to stream calibrated prose.
                  </p>
                </div>
                <div className="pt-1 flex flex-wrap justify-center gap-1.5">
                  {quickShortcuts.slice(0, 3).map((sc) => (
                    <button
                      key={sc.label}
                      type="button"
                      onClick={() => triggerGeneration(sc.prompt)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 transition-all cursor-pointer"
                    >
                      + {sc.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Post-Generation Summary Card */}
            {summary && !isStreaming && (
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Post-Generation Structural Summary
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                    {summary.wordCount} words •{" "}
                    {summary.streamMode === "openrouter-live"
                      ? "OpenRouter Live"
                      : "Studio Calibrated Stream"}
                  </span>
                </div>

                {/* Structural Notes */}
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                    Structural Notes
                  </p>
                  <ul className="space-y-1">
                    {summary.structuralNotes.map((note, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-neutral-300 flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Next Step Suggestions (Clickable to immediately run!) */}
                <div className="space-y-1.5 pt-1 border-t border-cyan-500/20">
                  <p className="text-[11px] font-medium text-amber-300/90 uppercase tracking-wider">
                    Recommended Next Steps
                  </p>
                  <div className="space-y-1">
                    {summary.nextStepSuggestions.map((step, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => triggerGeneration(step)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[#16191f]/90 hover:bg-amber-500/15 border border-neutral-800 hover:border-amber-500/35 text-xs text-neutral-300 hover:text-amber-200 flex items-center justify-between gap-2 transition-all group cursor-pointer"
                      >
                        <span className="truncate">{step}</span>
                        <ArrowRight className="w-3 h-3 text-neutral-500 group-hover:text-amber-400 shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "tuning" && (
          <div className="space-y-4">
            {/* Genre Calibration System Prompt Inspector */}
            <div className="p-3.5 rounded-xl bg-[#16191f] border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  Active Genre System Prompt
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${genreConfig.badgeClass}`}
                >
                  {genreConfig.emoji} {genreConfig.label}
                </span>
              </div>
              <pre className="text-[11px] font-mono text-neutral-300 bg-[#0b0d10] p-2.5 rounded-lg border border-neutral-800 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                {genreConfig.systemPrompt}
              </pre>
            </div>

            {/* Style Preset Calibration */}
            <div className="p-3.5 rounded-xl bg-[#16191f] border border-neutral-800 space-y-2.5">
              <label className="block text-xs font-semibold text-white">
                Style Calibration Preset
              </label>
              <div className="space-y-2">
                {genreConfig.stylePresets.map((preset) => {
                  const active = preset.id === stylePresetId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onChangeStylePreset(preset.id)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                        active
                          ? "bg-amber-950/25 border-amber-500/45 text-amber-200"
                          : "bg-[#0d0f12] border-neutral-800 text-neutral-300 hover:border-neutral-700"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>{preset.name}</span>
                        {active && (
                          <span className="text-[10px] text-amber-400 font-mono">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Additional System Instructions */}
            <div className="p-3.5 rounded-xl bg-[#16191f] border border-neutral-800 space-y-2">
              <label className="block text-xs font-semibold text-white">
                Custom Studio Directives (Appended to Genre Engine)
              </label>
              <textarea
                rows={3}
                value={customSystemPrompt}
                onChange={(e) => onChangeCustomSystemPrompt(e.target.value)}
                placeholder="e.g., Maintain third-person limited POV on Kaelen; avoid modern idioms..."
                className="w-full rounded-lg bg-[#0d0f12] border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* OpenRouter Runtime Configuration */}
            <div className="p-3.5 rounded-xl bg-amber-950/15 border border-amber-500/25 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  OpenRouter API Configuration
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {apiKey ? "Custom Key Active" : "Env / Studio Stream"}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-neutral-400">
                  Runtime OpenRouter API Key (optional override for{" "}
                  <code>OPENROUTER_API_KEY</code>)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => onChangeApiKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full rounded-lg bg-[#0d0f12] border border-neutral-800 px-3 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-neutral-400">
                  Primary OpenRouter Model (with automatic fallback)
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => onChangeModel(e.target.value)}
                  className="w-full rounded-lg bg-[#0d0f12] border border-neutral-800 px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/50"
                >
                  {OPENROUTER_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.provider}) — {m.badge}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Creativity / Temperature</span>
                  <span className="font-mono text-amber-300">
                    {temperature.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.2}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "outline" && (
          <div className="space-y-3 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-white">
                  Architecture & Outline Scratchpad
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Keep beat sheets, thesis claims, or runbook checklists synced
                  with this document.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  triggerGeneration(
                    `Generate a comprehensive ${genreConfig.label} structural outline and section breakdown for "${documentTitle}".`
                  )
                }
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/35 hover:bg-amber-500/25 transition-all cursor-pointer shrink-0"
              >
                + AI Outline
              </button>
            </div>

            <textarea
              value={outlineNotes}
              onChange={(e) => onChangeOutlineNotes(e.target.value)}
              rows={15}
              placeholder="Write your chapter beats, research citations, or system prerequisites here..."
              className="w-full flex-1 rounded-xl bg-[#16191f] border border-neutral-800 p-3.5 text-xs font-mono text-neutral-200 leading-relaxed focus:outline-none focus:border-amber-500/50 resize-none"
            />
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-white">
                Co-Writer Generation Log ({history.length})
              </h4>
              <span className="text-[11px] text-neutral-500">
                Click any draft to restore
              </span>
            </div>

            {history.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#16191f] border border-neutral-800 text-center text-xs text-neutral-500">
                No AI drafts generated in this session yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#16191f] border border-neutral-800 hover:border-amber-500/35 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-amber-300 truncate max-w-[180px]">
                        {item.prompt}
                      </span>
                      <span className="text-neutral-500 font-mono">
                        {item.wordCount}w
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 line-clamp-2 font-mono">
                      {item.outputMarkdown.replace(/[#>*`]/g, "")}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setStreamedMarkdown(item.outputMarkdown);
                            setLastSubmittedPrompt(item.prompt);
                            setSummary(
                              computeSummary(
                                item.outputMarkdown,
                                item.genre,
                                "history-restore",
                                item.model
                              )
                            );
                            setActiveTab("chat");
                          }}
                          className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-200 cursor-pointer"
                        >
                          Inspect
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onApplyDraft(item.outputMarkdown, "append")
                          }
                          className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-[11px] text-amber-300 border border-amber-500/30 cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Message Input Area with Prompt Shortcuts */}
      <div className="p-3.5 bg-[#0d0f12] border-t border-neutral-800/90 space-y-2.5">
        {/* Prompt Shortcuts Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {quickShortcuts.map((shortcut) => (
            <button
              key={shortcut.label}
              type="button"
              disabled={isStreaming}
              onClick={() => triggerGeneration(shortcut.prompt)}
              className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#16191f] hover:bg-amber-500/15 text-neutral-300 hover:text-amber-300 border border-neutral-800 hover:border-amber-500/40 transition-all cursor-pointer disabled:opacity-40"
            >
              ✦ {shortcut.label}
            </button>
          ))}
        </div>

        {/* Prompt Textarea + Vivid Send Button */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            triggerGeneration();
          }}
          className="relative rounded-xl bg-[#16191f] border border-amber-500/25 focus-within:border-amber-500/60 focus-within:shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all"
        >
          <textarea
            rows={2}
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                triggerGeneration();
              }
            }}
            placeholder={`Ask Co-Writer (${genreConfig.label} mode)...`}
            className="w-full bg-transparent px-3.5 pt-2.5 pb-8 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none resize-none"
          />
          <div className="absolute bottom-2 left-3 right-2.5 flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 font-mono">
              Enter to stream • Shift+Enter for newline
            </span>
            <button
              type="submit"
              disabled={isStreaming || !promptInput.trim()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)] transition-all disabled:opacity-35 cursor-pointer"
            >
              <span>Stream</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}

function TabPill({
  active,
  onClick,
  icon,
  label,
  badgeCount,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badgeCount?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
        active
          ? "bg-amber-500 text-black font-semibold shadow-[0_0_12px_rgba(245,158,11,0.35)]"
          : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
      {badgeCount !== undefined && (
        <span
          className={`text-[9px] px-1 rounded-full ${
            active ? "bg-black/20 text-black" : "bg-neutral-800 text-amber-400"
          }`}
        >
          {badgeCount}
        </span>
      )}
    </button>
  );
}
