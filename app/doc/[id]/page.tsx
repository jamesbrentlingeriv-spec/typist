"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Cloud,
  Share2,
  Download,
  Cpu,
  Check,
  FileDown,
  Copy,
  X,
  Upload,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  DocumentGenre,
  GENRE_ENGINE,
  OPENROUTER_MODELS,
} from "@/lib/genres";
import {
  StudioDocument,
  GenerationHistoryEntry,
  getDocumentById,
  saveDocument,
  createNewDocument,
  getStudioSettings,
  saveStudioSettings,
} from "@/lib/storage";
import {
  DocumentEditor,
  DocumentEditorHandle,
} from "@/components/editor/DocumentEditor";
import { CopilotSidebar } from "@/components/ai/CopilotSidebar";

export default function DocumentWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const docId = params?.id || "chronicles-of-ash-harbor";

  const editorRef = useRef<DocumentEditorHandle | null>(null);

  const [doc, setDoc] = useState<StudioDocument | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [selectedEditorText, setSelectedEditorText] = useState("");
  const [selectedModel, setSelectedModel] = useState(OPENROUTER_MODELS[0].id);
  const [apiKey, setApiKey] = useState("");
  const [initialPromptToRun, setInitialPromptToRun] = useState<
    string | undefined
  >(undefined);
  const [shareCopied, setShareCopied] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);

  // In-Workspace File Upload State (PDF, DOCX, DOC, MD, TXT)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [parsedUpload, setParsedUpload] = useState<{
    title: string;
    fileName: string;
    fileType: string;
    pageCount?: number;
    wordCount: number;
    suggestedGenre: DocumentGenre;
    html: string;
    plainText: string;
  } | null>(null);
  const workspaceFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const settings = getStudioSettings();
    setSelectedModel(settings.selectedModel);
    setApiKey(settings.openRouterApiKey);

    const existing = getDocumentById(docId);
    if (existing) {
      setDoc(existing);
      if (existing.initialPrompt) {
        setInitialPromptToRun(existing.initialPrompt);
      }
    } else {
      const created = createNewDocument({
        title: "Untitled Studio Manuscript",
        genre: "fiction",
      });
      setDoc(created);
    }
  }, [docId]);

  const persistUpdate = useCallback((updated: StudioDocument) => {
    setSaveState("saving");
    const saved = saveDocument(updated);
    setDoc(saved);
    const timer = setTimeout(() => setSaveState("saved"), 420);
    return () => clearTimeout(timer);
  }, []);

  if (!doc) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center text-neutral-400 text-sm">
        Initializing Typist Studio Workspace...
      </div>
    );
  }

  const handleTitleChange = (newTitle: string) => {
    const next = { ...doc, title: newTitle };
    setDoc(next);
    persistUpdate(next);
  };

  const handleGenreSwitch = (newGenre: DocumentGenre) => {
    const nextPreset = GENRE_ENGINE[newGenre].stylePresets[0].id;
    const next: StudioDocument = {
      ...doc,
      genre: newGenre,
      stylePreset: nextPreset,
    };
    setDoc(next);
    persistUpdate(next);
  };

  const handleEditorContentUpdate = (
    html: string,
    wordCount: number,
    _plainText: string
  ) => {
    const next: StudioDocument = {
      ...doc,
      content: html,
      wordCount,
    };
    setDoc(next);
    persistUpdate(next);
  };

  const handleTargetWordsUpdate = (newTarget: number) => {
    const next: StudioDocument = {
      ...doc,
      targetWords: newTarget,
    };
    setDoc(next);
    persistUpdate(next);
  };

  const handleAddHistory = (entry: GenerationHistoryEntry) => {
    const next: StudioDocument = {
      ...doc,
      history: [entry, ...(doc.history || [])].slice(0, 25),
    };
    setDoc(next);
    persistUpdate(next);
  };

  const handleClearInitialPrompt = () => {
    setInitialPromptToRun(undefined);
    if (doc.initialPrompt) {
      const next = { ...doc, initialPrompt: undefined };
      setDoc(next);
      saveDocument(next);
    }
  };

  const handleWorkspaceFileSelect = async (file: File) => {
    setIsUploadingFile(true);
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
        throw new Error(data.error || "Failed to parse uploaded document");
      }
      setParsedUpload(data);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Could not parse uploaded file."
      );
    } finally {
      setIsUploadingFile(false);
    }
  };

  const applyUploadedToWorkspace = (
    mode: "replace" | "append",
    aiAction?: "improve" | "expand"
  ) => {
    if (!parsedUpload) return;

    editorRef.current?.importHtmlIntoDoc(parsedUpload.html, mode);

    const updatedGenre =
      mode === "replace" && parsedUpload.suggestedGenre
        ? parsedUpload.suggestedGenre
        : doc.genre;

    const updatedTitle =
      mode === "replace" && parsedUpload.title ? parsedUpload.title : doc.title;

    const nextDoc: StudioDocument = {
      ...doc,
      title: updatedTitle,
      genre: updatedGenre,
      content:
        mode === "replace"
          ? parsedUpload.html
          : `${doc.content}\n${parsedUpload.html}`,
    };

    setDoc(nextDoc);
    persistUpdate(nextDoc);
    setShowUploadModal(false);

    if (aiAction === "improve") {
      setInitialPromptToRun(
        `Review and improve this uploaded ${GENRE_ENGINE[updatedGenre].label.toLowerCase()} ("${updatedTitle}"). Upgrade clarity, structure, callout boxes, and formatting while preserving key information.`
      );
    } else if (aiAction === "expand") {
      setInitialPromptToRun(
        `Expand the writing in "${updatedTitle}". Elaborate on key sections with deeper detail, concrete examples, and stronger ${GENRE_ENGINE[updatedGenre].label.toLowerCase()} pacing.`
      );
    }

    setParsedUpload(null);
  };

  const handleExportDownload = (format: "md" | "html" | "txt") => {
    const plain = editorRef.current?.getPlainText() || "";
    const html = editorRef.current?.getHtml() || doc.content;
    const safeFilename =
      doc.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "manuscript";

    let contentStr = plain;
    let mime = "text/plain;charset=utf-8";

    if (format === "html") {
      contentStr = `<!DOCTYPE html>\n<html><head><meta charset="utf-8"><title>${doc.title}</title></head><body>\n${html}\n</body></html>`;
      mime = "text/html;charset=utf-8";
    } else if (format === "md") {
      contentStr = `# ${doc.title}\n\n> Genre Calibration: ${
        GENRE_ENGINE[doc.genre].label
      }\n\n${plain}`;
      mime = "text/markdown;charset=utf-8";
    }

    const blob = new Blob([contentStr], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFilename}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#000000] text-neutral-100">
      {/* TOP WORKSPACE HEADER BAR */}
      <header className="h-14 shrink-0 px-4 bg-[#0d0f12] border-b border-neutral-800/90 flex items-center justify-between gap-3 z-30 select-none">
        {/* Left: Breadcrumb back to dashboard + Editable Document Title + Live Saving Indicator */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Link
            href="/"
            className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#16191f] hover:bg-neutral-800 text-xs font-semibold text-neutral-200 hover:text-amber-300 border border-neutral-800 transition-all shrink-0"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />
            <img
              src="/logo.png"
              alt="Typist Logo"
              className="w-5 h-5 rounded-md object-cover border border-amber-500/35"
            />
            <span className="font-bold text-white">Typist</span>
          </Link>

          <span className="text-neutral-700">/</span>

          <input
            type="text"
            aria-label="Document Title"
            value={doc.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="bg-transparent hover:bg-[#16191f]/70 focus:bg-[#16191f] text-sm font-bold text-white px-2.5 py-1 rounded-lg border border-transparent focus:border-amber-500/40 focus:outline-none truncate max-w-[240px] sm:max-w-xs md:max-w-md transition-all"
          />

          {/* Live Saving Status Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#16191f] border border-neutral-800 text-[11px] text-neutral-400 shrink-0">
            <Cloud
              className={`w-3.5 h-3.5 ${
                saveState === "saving"
                  ? "text-amber-400 animate-pulse"
                  : "text-emerald-400"
              }`}
            />
            <span>{saveState === "saving" ? "Saving..." : "Synced"}</span>
          </div>
        </div>

        {/* Center: On-the-Fly Genre Switcher Pill Group */}
        <div
          role="group"
          aria-label="Workspace Genre Switcher"
          className="flex items-center gap-1 p-1 rounded-xl bg-[#16191f] border border-neutral-800 shrink-0"
        >
          {(["fiction", "nonfiction", "technical"] as DocumentGenre[]).map(
            (gKey) => {
              const g = GENRE_ENGINE[gKey];
              const active = doc.genre === gKey;
              return (
                <button
                  key={gKey}
                  type="button"
                  onClick={() => handleGenreSwitch(gKey)}
                  title={`Switch Genre Calibration to ${g.label}`}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? `${g.badgeClass}`
                      : "text-neutral-400 hover:text-neutral-200 border border-transparent"
                  }`}
                >
                  <span>{g.emoji}</span>
                  <span className="hidden md:inline">{g.shortLabel}</span>
                </button>
              );
            }
          )}
        </div>

        {/* Right: Top Action Group (OpenRouter Model Dropdown, Cloud Status, Share, Export) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* OpenRouter Model Selector Dropdown */}
          <div className="hidden xl:flex items-center gap-1.5 bg-[#16191f] border border-cyan-500/25 rounded-xl px-2.5 py-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <select
              aria-label="Select OpenRouter Model"
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                saveStudioSettings({ selectedModel: e.target.value });
              }}
              className="bg-transparent text-xs font-medium text-cyan-200 focus:outline-none cursor-pointer"
            >
              {OPENROUTER_MODELS.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                  className="bg-[#0d0f12] text-neutral-200"
                >
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Upload / Import PDF or DOCX Button */}
          <button
            type="button"
            onClick={() => {
              setParsedUpload(null);
              setUploadError(null);
              setShowUploadModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 text-xs font-semibold text-emerald-300 border border-emerald-500/40 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Upload PDF / DOC</span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                navigator.clipboard?.writeText(window.location.href);
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 1800);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#16191f] hover:bg-neutral-800 text-xs font-medium text-neutral-200 border border-neutral-800 transition-all cursor-pointer"
          >
            {shareCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Link Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-neutral-400" />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>

          {/* Vibrant Export Button */}
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-[0_0_16px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* MAIN STUDIO SPLIT VIEW: Left 65% Editor Canvas | Right 35% AI Co-Writer Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Canvas (Left Pane - 65%) */}
        <div className="w-full lg:w-[65%] h-full overflow-hidden flex flex-col">
          <DocumentEditor
            ref={editorRef}
            initialContent={doc.content}
            genre={doc.genre}
            targetWords={doc.targetWords}
            onUpdateContent={handleEditorContentUpdate}
            onSelectionChange={setSelectedEditorText}
            onUpdateTargetWords={handleTargetWordsUpdate}
            onQuickSendSelectionToAI={(snippet) => {
              setSelectedEditorText(snippet);
              setInitialPromptToRun(
                `Refine and elevate this selected passage in ${
                  GENRE_ENGINE[doc.genre].label
                } style: "${snippet.slice(0, 200)}"`
              );
            }}
          />
        </div>

        {/* AI Co-Writer Sidebar (Right Pane - 35%) */}
        <div className="hidden lg:block lg:w-[35%] h-full overflow-hidden">
          <CopilotSidebar
            genre={doc.genre}
            documentTitle={doc.title}
            targetWords={doc.targetWords}
            currentWordCount={doc.wordCount}
            stylePresetId={doc.stylePreset}
            onChangeStylePreset={(presetId) => {
              const next = { ...doc, stylePreset: presetId };
              setDoc(next);
              persistUpdate(next);
            }}
            selectedModel={selectedModel}
            onChangeModel={(modelId) => {
              setSelectedModel(modelId);
              saveStudioSettings({ selectedModel: modelId });
            }}
            apiKey={apiKey}
            onChangeApiKey={(key) => {
              setApiKey(key);
              saveStudioSettings({ openRouterApiKey: key });
            }}
            outlineNotes={doc.outlineNotes || ""}
            onChangeOutlineNotes={(notes) => {
              const next = { ...doc, outlineNotes: notes };
              setDoc(next);
              persistUpdate(next);
            }}
            customSystemPrompt={doc.customSystemPrompt || ""}
            onChangeCustomSystemPrompt={(val) => {
              const next = { ...doc, customSystemPrompt: val };
              setDoc(next);
              persistUpdate(next);
            }}
            history={doc.history || []}
            onAddHistory={handleAddHistory}
            getEditorPlainText={() => editorRef.current?.getPlainText() || ""}
            selectedEditorText={selectedEditorText}
            onApplyDraft={(markdown, mode) => {
              editorRef.current?.applyDraftToDoc(markdown, mode);
            }}
            onUndoDraft={() => {
              editorRef.current?.undoLastChange();
            }}
            initialPromptToRun={initialPromptToRun}
            onClearInitialPrompt={handleClearInitialPrompt}
          />
        </div>
      </div>

      {/* Export Manuscript Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0d0f12] border border-amber-500/35 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-[#16191f] border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileDown className="w-4 h-4 text-amber-400" />
                Export Calibrated Manuscript
              </h3>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-neutral-400">
                Export <strong className="text-white">{doc.title}</strong> (
                {doc.wordCount.toLocaleString()} words •{" "}
                {GENRE_ENGINE[doc.genre].label}) in your preferred studio
                format:
              </p>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => handleExportDownload("md")}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#16191f] hover:bg-amber-500/15 border border-neutral-800 hover:border-amber-500/40 text-left transition-all cursor-pointer"
                >
                  <div>
                    <div className="font-semibold text-white">
                      Markdown (.md)
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Preserves headings, callouts, and code blocks
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-amber-400" />
                </button>

                <button
                  type="button"
                  onClick={() => handleExportDownload("html")}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#16191f] hover:bg-cyan-500/15 border border-neutral-800 hover:border-cyan-500/40 text-left transition-all cursor-pointer"
                >
                  <div>
                    <div className="font-semibold text-white">
                      Standalone HTML (.html)
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Semantic HTML document ready for web publishing
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-cyan-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const plain = editorRef.current?.getPlainText() || "";
                    navigator.clipboard?.writeText(plain);
                    setExportCopied(true);
                    setTimeout(() => setExportCopied(false), 2000);
                  }}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#16191f] hover:bg-emerald-500/15 border border-neutral-800 hover:border-emerald-500/40 text-left transition-all cursor-pointer"
                >
                  <div>
                    <div className="font-semibold text-white">
                      {exportCopied
                        ? "✓ Copied to Clipboard!"
                        : "Copy Plain Text to Clipboard"}
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Instant copy of clean manuscript prose
                    </div>
                  </div>
                  <Copy className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for Workspace Upload */}
      <input
        ref={workspaceFileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.md,.markdown,.txt,.html,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain,text/markdown"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleWorkspaceFileSelect(file);
          }
          e.target.value = "";
        }}
      />

      {/* Upload & Improve Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0d0f12] border border-emerald-500/35 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-[#16191f] border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                Upload PDF, Word (.DOCX/.DOC), or Markdown
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {!parsedUpload && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleWorkspaceFileSelect(file);
                  }}
                  onClick={() => workspaceFileInputRef.current?.click()}
                  className="border-2 border-dashed border-emerald-500/35 hover:border-emerald-400 rounded-2xl p-8 text-center bg-[#16191f]/70 hover:bg-emerald-950/20 transition-all cursor-pointer space-y-2.5"
                >
                  {isUploadingFile ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
                      <span className="text-emerald-200 font-semibold">
                        Extracting & formatting document structure...
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="font-semibold text-white text-sm">
                        Click to choose a file or drag & drop here
                      </div>
                      <p className="text-neutral-400 text-[11px]">
                        Supports <strong>.PDF</strong> manuals,{" "}
                        <strong>.DOCX / .DOC</strong> documents,{" "}
                        <strong>.MD</strong>, and <strong>.TXT</strong> files
                      </p>
                    </>
                  )}
                </div>
              )}

              {uploadError && (
                <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-red-200">
                  {uploadError}
                </div>
              )}

              {parsedUpload && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/35 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold">
                          {parsedUpload.fileType}
                        </span>
                        <span className="font-bold text-white text-sm">
                          {parsedUpload.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => workspaceFileInputRef.current?.click()}
                        className="text-[11px] text-emerald-300 hover:underline"
                      >
                        Change file
                      </button>
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono">
                      {parsedUpload.wordCount.toLocaleString()} words extracted
                      {parsedUpload.pageCount
                        ? ` • ${parsedUpload.pageCount} PDF pages`
                        : ""}{" "}
                      • Suggested Genre:{" "}
                      <strong className="text-emerald-300">
                        {GENRE_ENGINE[parsedUpload.suggestedGenre].label}
                      </strong>
                    </div>
                    <p className="text-[11px] text-neutral-300 line-clamp-3 font-mono bg-[#0d0f12] p-2.5 rounded-lg border border-neutral-800">
                      {parsedUpload.plainText.slice(0, 300)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                      How would you like to use this document?
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        applyUploadedToWorkspace("replace", "improve")
                      }
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-left transition-all cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-amber-200 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          Load Document & Make It Better with AI Co-Writer
                        </div>
                        <div className="text-[11px] text-neutral-300 mt-0.5">
                          Opens in editor and streams an improved, clearer,
                          better-structured version in the sidebar
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        applyUploadedToWorkspace("replace", "expand")
                      }
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-left transition-all cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-cyan-200">
                          🚀 Load Document & Expand the Writing
                        </div>
                        <div className="text-[11px] text-neutral-300 mt-0.5">
                          Opens in editor and streams expanded sections, deeper
                          details, and examples
                        </div>
                      </div>
                    </button>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => applyUploadedToWorkspace("replace")}
                        className="p-2.5 rounded-xl bg-[#16191f] hover:bg-neutral-800 border border-neutral-800 text-center font-semibold text-white cursor-pointer"
                      >
                        Replace Editor Content Only
                      </button>
                      <button
                        type="button"
                        onClick={() => applyUploadedToWorkspace("append")}
                        className="p-2.5 rounded-xl bg-[#16191f] hover:bg-neutral-800 border border-neutral-800 text-center font-semibold text-emerald-300 cursor-pointer"
                      >
                        + Append to Current Doc
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
