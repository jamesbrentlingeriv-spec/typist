"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Search,
  BookOpen,
  LifeBuoy,
  Settings,
  Plus,
  Sparkles,
  ArrowUpRight,
  Clock,
  Folder,
  Trash2,
  Cpu,
  KeyRound,
  Sliders,
  Check,
  X,
  FileText,
  Zap,
  Upload,
  FileUp,
  Loader2,
} from "lucide-react";
import {
  DocumentGenre,
  GENRE_ENGINE,
  OPENROUTER_MODELS,
} from "@/lib/genres";
import {
  StudioDocument,
  getDocuments,
  createNewDocument,
  deleteDocument,
  getStudioSettings,
  saveStudioSettings,
} from "@/lib/storage";

interface ParsedUploadResult {
  title: string;
  fileName: string;
  fileType: string;
  pageCount?: number;
  wordCount: number;
  suggestedGenre: DocumentGenre;
  html: string;
  plainText: string;
}

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<StudioDocument[]>([]);
  const [activeGenreFilter, setActiveGenreFilter] = useState<
    "all" | DocumentGenre
  >("all");
  const [heroGenre, setHeroGenre] = useState<DocumentGenre>("fiction");
  const [heroPrompt, setHeroPrompt] = useState("");
  const [heroStylePreset, setHeroStylePreset] = useState(
    GENRE_ENGINE.fiction.stylePresets[0].id
  );
  const [selectedModel, setSelectedModel] = useState(OPENROUTER_MODELS[0].id);
  const [apiKey, setApiKey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [activeModal, setActiveModal] = useState<
    null | "settings" | "tutorials" | "support"
  >(null);
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // Uploaded Document State (PDF, DOCX, DOC, MD, TXT)
  const [uploadedDoc, setUploadedDoc] = useState<ParsedUploadResult | null>(
    null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    setDocuments(getDocuments());
    const s = getStudioSettings();
    setSelectedModel(s.selectedModel);
    setApiKey(s.openRouterApiKey);
  }, []);

  // Keep style preset synced when heroGenre changes
  useEffect(() => {
    setHeroStylePreset(GENRE_ENGINE[heroGenre].stylePresets[0].id);
  }, [heroGenre]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesGenre =
        activeGenreFilter === "all" || doc.genre === activeGenreFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGenre && matchesSearch;
    });
  }, [documents, activeGenreFilter, searchQuery]);

  const processUploadedFile = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-document", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse document");
      }
      const parsed = data as ParsedUploadResult;
      setUploadedDoc(parsed);
      if (parsed.suggestedGenre) {
        setHeroGenre(parsed.suggestedGenre);
      }
      if (!heroPrompt.trim()) {
        if (parsed.suggestedGenre === "technical") {
          setHeroPrompt(
            `Review and improve this uploaded manual ("${parsed.title}"). Enhance procedural clarity, add missing prerequisites or safety warning callouts, and standardize step-by-step formatting.`
          );
        } else if (parsed.suggestedGenre === "nonfiction") {
          setHeroPrompt(
            `Expand and strengthen this uploaded document ("${parsed.title}"). Sharpen the core thesis, deepen analytical sections, and synthesize key takeaways.`
          );
        } else {
          setHeroPrompt(
            `Expand and enrich the writing in this uploaded manuscript ("${parsed.title}") with stronger sensory detail, pacing, and character depth.`
          );
        }
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Could not parse uploaded file."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleLaunchFromHero = (
    e?: React.FormEvent,
    skipAiPrompt?: boolean
  ) => {
    e?.preventDefault();
    const newDoc = createNewDocument({
      title: uploadedDoc?.title || undefined,
      genre: heroGenre,
      stylePreset: heroStylePreset,
      initialContent: uploadedDoc?.html || undefined,
      initialPrompt: skipAiPrompt
        ? undefined
        : heroPrompt.trim() || undefined,
    });
    saveStudioSettings({ selectedModel, openRouterApiKey: apiKey });
    router.push(`/doc/${newDoc.id}`);
  };

  const handleQuickCreateBlank = (genre: DocumentGenre) => {
    const newDoc = createNewDocument({
      genre,
      stylePreset: GENRE_ENGINE[genre].stylePresets[0].id,
    });
    router.push(`/doc/${newDoc.id}`);
  };

  const handleDeleteDoc = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const next = deleteDocument(id);
    setDocuments(next);
  };

  const heroGenreConfig = GENRE_ENGINE[heroGenre];

  const countsByGenre = useMemo(() => {
    return {
      all: documents.length,
      fiction: documents.filter((d) => d.genre === "fiction").length,
      nonfiction: documents.filter((d) => d.genre === "nonfiction").length,
      technical: documents.filter((d) => d.genre === "technical").length,
    };
  }, [documents]);

  return (
    <div className="flex min-h-screen bg-[#000000] text-neutral-100">
      {/* Left Navigation Sidebar (#0d0f12) */}
      <aside className="w-64 shrink-0 bg-[#0d0f12] border-r border-neutral-800/90 flex flex-col justify-between p-4 select-none">
        <div className="space-y-6">
          {/* Profile Avatar & Brand Header */}
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src="/logo.png"
                  alt="Typist Logo"
                  className="w-10 h-10 rounded-xl object-cover border border-amber-500/40 shadow-[0_0_18px_rgba(245,158,11,0.35)]"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0d0f12]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-white">
                    Typist
                  </span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    PWA
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Author Workspace
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleQuickCreateBlank(heroGenre)}
              title="New Calibrated Draft"
              className="p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.35)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Hidden File Input for PDF, DOCX, DOC, MD, TXT */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.md,.markdown,.txt,.html,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                processUploadedFile(file);
              }
              e.target.value = "";
            }}
          />

          {/* Primary Navigation Links */}
          <nav className="space-y-1">
            <NavButton
              active={!showSearchBar && activeModal === null}
              onClick={() => {
                setShowSearchBar(false);
                setActiveModal(null);
              }}
              icon={<Home className="w-4 h-4" />}
              label="Home & Hub"
            />
            <NavButton
              active={false}
              onClick={() => fileInputRef.current?.click()}
              icon={<FileUp className="w-4 h-4 text-emerald-400" />}
              label="Upload PDF / DOCX"
              shortcut="Import"
            />
            <NavButton
              active={showSearchBar}
              onClick={() => setShowSearchBar((prev) => !prev)}
              icon={<Search className="w-4 h-4" />}
              label="Search Drafts"
              shortcut="⌘K"
            />
            <NavButton
              active={activeModal === "tutorials"}
              onClick={() => setActiveModal("tutorials")}
              icon={<BookOpen className="w-4 h-4" />}
              label="Tutorials"
            />
            <NavButton
              active={activeModal === "support"}
              onClick={() => setActiveModal("support")}
              icon={<LifeBuoy className="w-4 h-4" />}
              label="Support"
            />
            <NavButton
              active={activeModal === "settings"}
              onClick={() => setActiveModal("settings")}
              icon={<Settings className="w-4 h-4" />}
              label="Settings & API Key"
            />
          </nav>

          {/* Genre Filter & Document Folders */}
          <div className="pt-3 border-t border-neutral-800/80 space-y-2">
            <div className="px-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <span>Genre Folders</span>
              <Folder className="w-3.5 h-3.5 text-neutral-600" />
            </div>

            <div className="space-y-1">
              <GenreFolderButton
                active={activeGenreFilter === "all"}
                onClick={() => setActiveGenreFilter("all")}
                emoji="🗂️"
                label="All Studio Drafts"
                count={countsByGenre.all}
                accentClass="border-amber-500/40 bg-amber-500/15 text-amber-200"
              />
              <GenreFolderButton
                active={activeGenreFilter === "fiction"}
                onClick={() => setActiveGenreFilter("fiction")}
                emoji="📖"
                label="Fiction"
                count={countsByGenre.fiction}
                accentClass="border-purple-500/40 bg-purple-500/15 text-purple-200"
                dotColor="bg-purple-400"
              />
              <GenreFolderButton
                active={activeGenreFilter === "nonfiction"}
                onClick={() => setActiveGenreFilter("nonfiction")}
                emoji="🖋️"
                label="Nonfiction"
                count={countsByGenre.nonfiction}
                accentClass="border-sky-500/40 bg-sky-500/15 text-sky-200"
                dotColor="bg-sky-400"
              />
              <GenreFolderButton
                active={activeGenreFilter === "technical"}
                onClick={() => setActiveGenreFilter("technical")}
                emoji="⚙️"
                label="Technical Manual"
                count={countsByGenre.technical}
                accentClass="border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                dotColor="bg-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Bottom OpenRouter Runtime Status Card */}
        <div className="p-3 rounded-xl bg-[#16191f] border border-neutral-800/90 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-neutral-300 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              OpenRouter Engine
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
          </div>
          <p className="text-[11px] text-neutral-500 truncate font-mono">
            {OPENROUTER_MODELS.find((m) => m.id === selectedModel)?.name ||
              selectedModel}
          </p>
          <button
            type="button"
            onClick={() => setActiveModal("settings")}
            className="w-full py-1.5 px-2.5 rounded-lg bg-[#0d0f12] hover:bg-neutral-900 text-[11px] text-amber-300 border border-amber-500/25 transition-colors cursor-pointer"
          >
            {apiKey ? "✓ Custom API Key Configured" : "Configure OpenRouter Key"}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-6 sm:px-12 py-10">
        <div className="mx-auto max-w-5xl space-y-12">
          {/* Optional Search Bar Drawer */}
          {showSearchBar && (
            <div className="p-3 rounded-2xl bg-[#16191f] border border-cyan-500/30 flex items-center gap-3 shadow-cyan-glow">
              <Search className="w-4 h-4 text-cyan-400 ml-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search manuscripts by title, chapter heading, or content..."
                autoFocus
                className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-neutral-400 hover:text-white px-2"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* HERO CREATION CONSOLE */}
          <section
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) {
                processUploadedFile(file);
              }
            }}
            className={`relative rounded-3xl bg-[#0d0f12] border p-6 sm:p-9 shadow-[0_0_50px_-12px_rgba(245,158,11,0.18)] overflow-hidden transition-all ${
              isDraggingOver
                ? "border-emerald-400 ring-2 ring-emerald-500/40 bg-emerald-950/15"
                : "border-amber-500/25"
            }`}
          >
            {/* Subtle radial optical glow */}
            <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative z-10 space-y-6">
              {/* Top Heading & Calibration Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src="/logo.png"
                    alt="Typist Studio Icon"
                    className="hidden sm:block w-14 h-14 rounded-2xl object-cover border border-amber-500/40 shadow-[0_0_24px_rgba(245,158,11,0.3)] shrink-0"
                  />
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Typist Genre Calibration Engine v2.4
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                      What are we writing today?
                    </h1>
                  </div>
                </div>

                {/* Interactive Segmented Genre Pill Toggle */}
                <div
                  role="group"
                  aria-label="Interactive Genre Selector"
                  className="inline-flex p-1.5 rounded-2xl bg-[#16191f] border border-neutral-800 self-start"
                >
                  {(
                    ["fiction", "nonfiction", "technical"] as DocumentGenre[]
                  ).map((gKey) => {
                    const g = GENRE_ENGINE[gKey];
                    const isSelected = heroGenre === gKey;
                    return (
                      <button
                        key={gKey}
                        type="button"
                        onClick={() => setHeroGenre(gKey)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? `${g.activeTabClass} border`
                            : "text-neutral-400 hover:text-neutral-200 border border-transparent"
                        }`}
                      >
                        <span>{g.emoji}</span>
                        <span>{g.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Genre Calibration Directive Preview Pill */}
              <div className="flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl bg-[#16191f]/90 border border-neutral-800/90 text-xs text-neutral-300">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`px-2 py-0.5 rounded-md font-semibold text-[11px] shrink-0 ${heroGenreConfig.badgeClass}`}
                  >
                    {heroGenreConfig.label} Mode
                  </span>
                  <span className="text-neutral-400 truncate">
                    {heroGenreConfig.tagline}
                  </span>
                </div>
                <span className="hidden md:inline text-[11px] text-emerald-400/90 font-mono shrink-0">
                  Drop PDF, DOCX, or MD anywhere here
                </span>
              </div>

              {/* Uploaded Document Preview & Action Card */}
              {isUploading && (
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 flex items-center gap-3 text-xs text-emerald-200">
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                  <span>
                    Extracting and structuring text from your uploaded document...
                  </span>
                </div>
              )}

              {uploadError && (
                <div className="p-3.5 rounded-2xl bg-red-950/30 border border-red-500/40 flex items-center justify-between text-xs text-red-200">
                  <span>{uploadError}</span>
                  <button
                    type="button"
                    onClick={() => setUploadError(null)}
                    className="text-red-300 hover:text-white px-2"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {uploadedDoc && !isUploading && (
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/35 space-y-3 shadow-[0_0_25px_rgba(16,185,129,0.12)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[11px] font-bold">
                        {uploadedDoc.fileType}
                      </span>
                      <span className="text-sm font-bold text-white">
                        {uploadedDoc.title}
                      </span>
                      <span className="text-xs font-mono text-emerald-300/90">
                        • {uploadedDoc.wordCount.toLocaleString()} words
                        {uploadedDoc.pageCount
                          ? ` • ${uploadedDoc.pageCount} page${
                              uploadedDoc.pageCount > 1 ? "s" : ""
                            }`
                          : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleLaunchFromHero(undefined, true)}
                        className="px-3 py-1 rounded-lg bg-[#16191f] hover:bg-neutral-800 text-emerald-300 border border-emerald-500/35 text-xs font-semibold transition-all cursor-pointer"
                      >
                        Open Directly in Editor →
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadedDoc(null)}
                        title="Remove uploaded file"
                        className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-300 line-clamp-2 font-mono bg-[#0d0f12]/80 p-2.5 rounded-xl border border-neutral-800">
                    {uploadedDoc.plainText.slice(0, 280) ||
                      "Document parsed and ready for studio editing."}
                  </p>

                  {/* 1-Click AI Improvement & Expansion Presets for Uploaded Document */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-mono uppercase text-emerald-400 mr-1">
                      Document Actions:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setHeroPrompt(
                          `Review and improve this uploaded ${heroGenreConfig.label.toLowerCase()} ("${uploadedDoc.title}"). Upgrade clarity, structure, callout boxes, and formatting while preserving all key technical/narrative facts.`
                        )
                      }
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 transition-all cursor-pointer"
                    >
                      ✨ Improve & Make It Better
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setHeroPrompt(
                          `Expand the writing in "${uploadedDoc.title}". Elaborate on key sections with deeper detail, concrete examples, smoother transitions, and comprehensive coverage.`
                        )
                      }
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/35 transition-all cursor-pointer"
                    >
                      🚀 Expand Writing & Depth
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setHeroPrompt(
                          `Restructure and modernize "${uploadedDoc.title}" with clear hierarchical headings, step-by-step procedures or beat breakdowns, and a summary section.`
                        )
                      }
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/35 transition-all cursor-pointer"
                    >
                      📐 Restructure & Format
                    </button>
                  </div>
                </div>
              )}

              {/* Large Prompt Box & Bottom Controls */}
              <form onSubmit={(e) => handleLaunchFromHero(e, false)} className="space-y-3">
                <div className="rounded-2xl bg-[#16191f] border border-neutral-800 focus-within:border-amber-500/50 focus-within:shadow-[0_0_25px_rgba(245,158,11,0.15)] transition-all p-4">
                  <textarea
                    rows={4}
                    value={heroPrompt}
                    onChange={(e) => setHeroPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handleLaunchFromHero();
                      }
                    }}
                    placeholder={
                      uploadedDoc
                        ? `Tell Typist how you want to improve, rewrite, or expand "${uploadedDoc.title}"...`
                        : "Describe your concept, chapter premise, or outline — or upload a PDF / DOCX below to improve or expand..."
                    }
                    className="w-full bg-transparent text-base text-white placeholder-neutral-500 focus:outline-none resize-none leading-relaxed"
                  />

                  {/* Bottom Controls inside Console */}
                  <div className="pt-3 mt-2 border-t border-neutral-800/90 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Upload PDF / DOCX / MD / TXT Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/40 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {uploadedDoc
                            ? "Replace File"
                            : "Upload PDF / DOCX / MD"}
                        </span>
                      </button>

                      {/* Style Preset Dropdown */}
                      <div className="flex items-center gap-1.5 bg-[#0d0f12] border border-neutral-800 rounded-xl px-3 py-1.5">
                        <Sliders className="w-3.5 h-3.5 text-amber-400" />
                        <select
                          aria-label="Style Preset"
                          value={heroStylePreset}
                          onChange={(e) => setHeroStylePreset(e.target.value)}
                          className="bg-transparent text-xs font-medium text-neutral-200 focus:outline-none cursor-pointer"
                        >
                          {heroGenreConfig.stylePresets.map((preset) => (
                            <option
                              key={preset.id}
                              value={preset.id}
                              className="bg-[#0d0f12] text-neutral-200"
                            >
                              Style: {preset.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* OpenRouter Model Selector Badge */}
                      <div className="flex items-center gap-1.5 bg-[#0d0f12] border border-cyan-500/30 rounded-xl px-3 py-1.5">
                        <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                        <select
                          aria-label="OpenRouter Model"
                          value={selectedModel}
                          onChange={(e) => {
                            setSelectedModel(e.target.value);
                            saveStudioSettings({
                              selectedModel: e.target.value,
                            });
                          }}
                          className="bg-transparent text-xs font-medium text-cyan-200 focus:outline-none cursor-pointer"
                        >
                          {OPENROUTER_MODELS.map((m) => (
                            <option
                              key={m.id}
                              value={m.id}
                              className="bg-[#0d0f12] text-neutral-200"
                            >
                              {m.name} • {m.badge}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Vivid Send / Launch Studio Button */}
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.45)] transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 fill-black" />
                      <span>
                        {uploadedDoc
                          ? "Import & Run Co-Writer"
                          : "Launch Studio & Generate"}
                      </span>
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Quick Starter Prompts for the Selected Genre */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-neutral-500 font-mono uppercase">
                    Quick Starters:
                  </span>
                  {heroGenreConfig.promptShortcuts.map((sc) => (
                    <button
                      key={sc.label}
                      type="button"
                      onClick={() => setHeroPrompt(sc.prompt)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-[#16191f] hover:bg-neutral-800 text-neutral-300 border border-neutral-800 hover:border-amber-500/30 transition-all cursor-pointer"
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </form>
            </div>
          </section>

          {/* DRAFTS SHELF */}
          <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-900 pb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Drafts Shelf
                </h2>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#16191f] text-neutral-400 border border-neutral-800">
                  {filteredDocuments.length}{" "}
                  {filteredDocuments.length === 1 ? "document" : "documents"}
                </span>
              </div>

              {/* Quick Genre Filter Pills */}
              <div className="flex items-center gap-1.5">
                {(
                  ["all", "fiction", "nonfiction", "technical"] as const
                ).map((filterKey) => {
                  const isActive = activeGenreFilter === filterKey;
                  const label =
                    filterKey === "all"
                      ? "All Genres"
                      : `${GENRE_ENGINE[filterKey].emoji} ${GENRE_ENGINE[filterKey].label}`;
                  return (
                    <button
                      key={filterKey}
                      type="button"
                      onClick={() => setActiveGenreFilter(filterKey)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isActive
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-[#16191f] text-neutral-400 hover:text-neutral-200 border border-neutral-800"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredDocuments.length === 0 ? (
              <div className="rounded-2xl bg-[#0d0f12] border border-neutral-800 p-12 text-center space-y-3">
                <FileText className="w-8 h-8 text-neutral-600 mx-auto" />
                <h3 className="text-sm font-semibold text-neutral-300">
                  No drafts match the current filter
                </h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Use the Hero Creation Console above or click below to create a
                  calibrated document.
                </p>
                <button
                  type="button"
                  onClick={() => handleQuickCreateBlank(heroGenre)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-black cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create {heroGenreConfig.label} Draft
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDocuments.map((doc) => {
                  const g = GENRE_ENGINE[doc.genre] || GENRE_ENGINE.fiction;
                  const pct = Math.min(
                    100,
                    Math.round(
                      (doc.wordCount / Math.max(1, doc.targetWords)) * 100
                    )
                  );
                  const plainSnippet = doc.content
                    .replace(/<[^>]*>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();

                  return (
                    <Link
                      key={doc.id}
                      href={`/doc/${doc.id}`}
                      className={`group relative flex flex-col justify-between rounded-2xl bg-[#16191f] border p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl ${g.glowBorderClass}`}
                    >
                      <div className="space-y-3">
                        {/* Top Badge Row */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${g.badgeClass}`}
                          >
                            {g.emoji} {g.label}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteDoc(e, doc.id)}
                              title="Delete draft"
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 transition-colors" />
                          </div>
                        </div>

                        {/* Document Title */}
                        <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                          {doc.title}
                        </h3>

                        {/* Manuscript Excerpt */}
                        <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed">
                          {plainSnippet || "Empty calibrated manuscript..."}
                        </p>
                      </div>

                      {/* Word Count Progress Bar & Timestamp Footer */}
                      <div className="pt-5 mt-4 border-t border-neutral-800/80 space-y-2.5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-neutral-300">
                              {doc.wordCount.toLocaleString()}{" "}
                              <span className="text-neutral-500">
                                / {doc.targetWords.toLocaleString()} words
                              </span>
                            </span>
                            <span className="text-amber-400 font-semibold">
                              {pct}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#0d0f12] overflow-hidden border border-neutral-800">
                            <div
                              className={`h-full bg-gradient-to-r ${g.progressBarClass} transition-all duration-300`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-neutral-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Updated{" "}
                            {new Date(doc.updatedAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </span>
                          <span className="text-amber-400/80 group-hover:text-amber-300 font-medium">
                            Open Studio →
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Modals for Settings, Tutorials, Support */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0d0f12] border border-amber-500/30 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-[#16191f] border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {activeModal === "settings" && (
                  <>
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    Studio & OpenRouter Settings
                  </>
                )}
                {activeModal === "tutorials" && (
                  <>
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    Genre Calibration Studio Guide
                  </>
                )}
                {activeModal === "support" && (
                  <>
                    <LifeBuoy className="w-4 h-4 text-emerald-400" />
                    Studio Architecture & Diagnostics
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-neutral-300">
              {activeModal === "settings" && (
                <>
                  <div className="space-y-1.5">
                    <label className="block font-semibold text-white">
                      OpenRouter API Key (Runtime or{" "}
                      <code>OPENROUTER_API_KEY</code>)
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="w-full rounded-xl bg-[#16191f] border border-neutral-800 px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500/50"
                    />
                    <p className="text-[11px] text-neutral-500">
                      Stored locally in your browser and passed securely to{" "}
                      <code>/api/generate</code>. If left blank, the server uses{" "}
                      <code>process.env.OPENROUTER_API_KEY</code> or the
                      built-in calibrated studio stream.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-semibold text-white">
                      Default OpenRouter Model
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full rounded-xl bg-[#16191f] border border-neutral-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                    >
                      {OPENROUTER_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.provider}) — {m.badge}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    {settingsSavedToast && (
                      <span className="text-emerald-400 flex items-center gap-1 mr-auto">
                        <Check className="w-3.5 h-3.5" /> Settings saved!
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        saveStudioSettings({
                          openRouterApiKey: apiKey,
                          selectedModel,
                        });
                        setSettingsSavedToast(true);
                        setTimeout(() => setSettingsSavedToast(false), 2000);
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold cursor-pointer"
                    >
                      Save Configuration
                    </button>
                  </div>
                </>
              )}

              {activeModal === "tutorials" && (
                <div className="space-y-3 leading-relaxed">
                  <div className="p-3 rounded-xl bg-[#16191f] border border-purple-500/30">
                    <strong className="text-purple-300">
                      📖 Fiction Calibration:
                    </strong>{" "}
                    Enforces show-don&apos;t-tell sensory descriptions, subtext-rich
                    dialogue cadence, and scene/chapter beat breakdowns.
                  </div>
                  <div className="p-3 rounded-xl bg-[#16191f] border border-sky-500/30">
                    <strong className="text-sky-300">
                      🖋️ Nonfiction Calibration:
                    </strong>{" "}
                    Enforces analytical rigor, thesis/counter-argument framing,
                    empirical citations, and Key Insight callouts.
                  </div>
                  <div className="p-3 rounded-xl bg-[#16191f] border border-emerald-500/30">
                    <strong className="text-emerald-300">
                      ⚙️ Technical Manual Calibration:
                    </strong>{" "}
                    Enforces imperative voice, numbered procedural steps,
                    prerequisite checklists, warning boxes, and code blocks.
                  </div>
                </div>
              )}

              {activeModal === "support" && (
                <div className="space-y-3 leading-relaxed">
                  <p>
                    <strong>Typist</strong> automatically injects your
                    active document&apos;s genre, title, word count target, and
                    selected manuscript text into every{" "}
                    <code>/api/generate</code> streaming call.
                  </p>
                  <p className="text-neutral-400">
                    Tip: Highlight any paragraph inside the TipTap editor to
                    reveal the <strong>Refine Selection</strong> button, or use
                    one-click <strong>✓ Apply to Document</strong> and{" "}
                    <strong>Insert at Cursor</strong> in the Co-Writer sidebar.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
  shortcut,
}: {
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
        active
          ? "bg-[#16191f] text-amber-300 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
          : "text-neutral-400 hover:text-neutral-100 hover:bg-[#16191f]/60 border border-transparent"
      }`}
    >
      <span className="flex items-center gap-2.5">
        {icon}
        <span>{label}</span>
      </span>
      {shortcut && (
        <span className="text-[10px] font-mono text-neutral-500 bg-[#0d0f12] px-1.5 py-0.5 rounded border border-neutral-800">
          {shortcut}
        </span>
      )}
    </button>
  );
}

function GenreFolderButton({
  active,
  onClick,
  emoji,
  label,
  count,
  accentClass,
  dotColor,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
  count: number;
  accentClass: string;
  dotColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
        active
          ? accentClass
          : "border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-[#16191f]/60"
      }`}
    >
      <span className="flex items-center gap-2">
        {dotColor ? (
          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        ) : (
          <span>{emoji}</span>
        )}
        <span>{label}</span>
      </span>
      <span className="text-[11px] font-mono text-neutral-500">{count}</span>
    </button>
  );
}
