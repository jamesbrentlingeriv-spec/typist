"use client";

import React, {
  useEffect,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
} from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import { marked } from "marked";
import {
  Bold,
  Italic,
  Strikethrough,
  Code2,
  Quote,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Sparkles,
  Target,
  Highlighter,
  FileText,
} from "lucide-react";
import { DocumentGenre, GENRE_ENGINE } from "@/lib/genres";

export interface DocumentEditorHandle {
  applyDraftToDoc: (
    markdown: string,
    mode?: "append" | "insert" | "replace"
  ) => void;
  importHtmlIntoDoc: (html: string, mode?: "replace" | "append") => void;
  undoLastChange: () => void;
  getPlainText: () => string;
  getSelectedText: () => string;
  getHtml: () => string;
}

export function markdownToHtml(markdown: string): string {
  if (!markdown) return "";
  try {
    const raw = marked.parse(markdown, { async: false }) as string;
    return raw;
  } catch {
    return `<p>${markdown}</p>`;
  }
}

export function applyDraftToDoc(
  editor: Editor | null,
  markdown: string,
  mode: "append" | "insert" | "replace" = "append"
): void {
  if (!editor || !markdown.trim()) return;
  const html = markdownToHtml(markdown);

  if (mode === "replace") {
    editor.chain().focus().setContent(html, true).run();
    return;
  }

  if (mode === "insert") {
    editor.chain().focus().insertContent(html).run();
    return;
  }

  // Default: append smoothly at the end of the document
  const endPos = editor.state.doc.content.size;
  editor
    .chain()
    .focus()
    .insertContentAt(endPos, html)
    .scrollIntoView()
    .run();
}

interface DocumentEditorProps {
  initialContent: string;
  genre: DocumentGenre;
  targetWords: number;
  onUpdateContent: (html: string, wordCount: number, plainText: string) => void;
  onSelectionChange?: (selectedText: string) => void;
  onUpdateTargetWords?: (newTarget: number) => void;
  onQuickSendSelectionToAI?: (selectedText: string) => void;
}

export const DocumentEditor = forwardRef<
  DocumentEditorHandle,
  DocumentEditorProps
>(function DocumentEditor(
  {
    initialContent,
    genre,
    targetWords,
    onUpdateContent,
    onSelectionChange,
    onUpdateTargetWords,
    onQuickSendSelectionToAI,
  },
  ref
) {
  const genreConfig = GENRE_ENGINE[genre];
  const [selectedSnippet, setSelectedSnippet] = useState("");
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(targetWords));
  const [lastSnapshotHtml, setLastSnapshotHtml] = useState<string | null>(null);

  useEffect(() => {
    setTargetInput(String(targetWords));
  }, [targetWords]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Highlight,
      Typography,
      Placeholder.configure({
        placeholder: genreConfig.placeholder,
      }),
      CharacterCount,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "ProseMirror focus:outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const plain = ed.getText();
      const words =
        ed.storage.characterCount?.words?.() ??
        (plain.trim() ? plain.trim().split(/\s+/).length : 0);
      onUpdateContent(html, words, plain);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { from, to } = ed.state.selection;
      if (from !== to) {
        const text = ed.state.doc.textBetween(from, to, " ").trim();
        setSelectedSnippet(text);
        onSelectionChange?.(text);
      } else {
        setSelectedSnippet("");
        onSelectionChange?.("");
      }
    },
  });

  const handleApplyDraft = useCallback(
    (markdown: string, mode: "append" | "insert" | "replace" = "append") => {
      if (!editor) return;
      setLastSnapshotHtml(editor.getHTML());
      applyDraftToDoc(editor, markdown, mode);
    },
    [editor]
  );

  const handleUndo = useCallback(() => {
    if (!editor) return;
    if (lastSnapshotHtml) {
      editor.chain().focus().setContent(lastSnapshotHtml, true).run();
      setLastSnapshotHtml(null);
    } else {
      editor.chain().focus().undo().run();
    }
  }, [editor, lastSnapshotHtml]);

  const handleImportHtml = useCallback(
    (html: string, mode: "replace" | "append" = "replace") => {
      if (!editor || !html.trim()) return;
      setLastSnapshotHtml(editor.getHTML());
      if (mode === "replace") {
        editor.chain().focus().setContent(html, true).run();
      } else {
        const endPos = editor.state.doc.content.size;
        editor.chain().focus().insertContentAt(endPos, html).scrollIntoView().run();
      }
    },
    [editor]
  );

  useImperativeHandle(
    ref,
    () => ({
      applyDraftToDoc: handleApplyDraft,
      importHtmlIntoDoc: handleImportHtml,
      undoLastChange: handleUndo,
      getPlainText: () => editor?.getText() || "",
      getSelectedText: () => selectedSnippet,
      getHtml: () => editor?.getHTML() || "",
    }),
    [editor, handleApplyDraft, handleImportHtml, handleUndo, selectedSnippet]
  );

  const wordCount =
    editor?.storage.characterCount?.words?.() ??
    (editor?.getText().trim()
      ? editor.getText().trim().split(/\s+/).length
      : 0);

  const charCount = editor?.storage.characterCount?.characters?.() ?? 0;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 225));
  const progressPercent = Math.min(
    100,
    Math.round((wordCount / Math.max(1, targetWords)) * 100)
  );

  const activeStyleValue = editor?.isActive("heading", { level: 1 })
    ? "h1"
    : editor?.isActive("heading", { level: 2 })
    ? "h2"
    : editor?.isActive("heading", { level: 3 })
    ? "h3"
    : "p";

  const handleStyleDropdownChange = (val: string) => {
    if (!editor) return;
    if (val === "p") {
      editor.chain().focus().setParagraph().run();
    } else if (val === "h1") {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    } else if (val === "h2") {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    } else if (val === "h3") {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    }
  };

  return (
    <div className="relative flex flex-col h-full bg-[#000000] select-text">
      {/* Floating Ribbon Toolbar */}
      <div className="sticky top-0 z-20 px-6 pt-3 pb-2 bg-gradient-to-b from-[#000000] via-[#000000]/95 to-transparent">
        <div className="mx-auto max-w-4xl flex flex-wrap items-center justify-between gap-1.5 px-3 py-2 rounded-xl bg-[#0d0f12]/95 border border-neutral-800/90 shadow-[0_10px_30px_rgba(0,0,0,0.85)] backdrop-blur-md">
          {/* Style Switcher & Heading Pills */}
          <div className="flex items-center gap-1">
            <select
              aria-label="Text Style"
              value={activeStyleValue}
              onChange={(e) => handleStyleDropdownChange(e.target.value)}
              className="bg-[#16191f] text-xs font-medium text-neutral-200 border border-neutral-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500/50 cursor-pointer"
            >
              <option value="p">Body Text</option>
              <option value="h1">Heading 1 (H1)</option>
              <option value="h2">Heading 2 (H2)</option>
              <option value="h3">Heading 3 (H3)</option>
            </select>

            <div className="h-4 w-[1px] bg-neutral-800 mx-1" />

            <ToolbarButton
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 1 }).run()
              }
              active={editor?.isActive("heading", { level: 1 })}
              title="Heading 1"
            >
              <Heading1 className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run()
              }
              active={editor?.isActive("heading", { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 3 }).run()
              }
              active={editor?.isActive("heading", { level: 3 })}
              title="Heading 3"
            >
              <Heading3 className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().setParagraph().run()}
              active={editor?.isActive("paragraph")}
              title="Body Paragraph"
            >
              <Pilcrow className="w-3.5 h-3.5" />
            </ToolbarButton>

            <div className="h-4 w-[1px] bg-neutral-800 mx-1" />

            {/* Inline Marks */}
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBold().run()}
              active={editor?.isActive("bold")}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              active={editor?.isActive("italic")}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              active={editor?.isActive("strike")}
              title="Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHighlight().run()}
              active={editor?.isActive("highlight")}
              title="Optical Highlight"
            >
              <Highlighter className="w-3.5 h-3.5" />
            </ToolbarButton>

            <div className="h-4 w-[1px] bg-neutral-800 mx-1" />

            {/* Structural Blocks: Code block, Callout box, Lists */}
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              active={editor?.isActive("codeBlock")}
              title="Code / Command Block"
            >
              <Code2 className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              active={editor?.isActive("blockquote")}
              title="Callout Box / Epigraph Quote"
            >
              <Quote className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              active={editor?.isActive("bulletList")}
              title="Bullet List"
            >
              <List className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              active={editor?.isActive("orderedList")}
              title="Numbered Procedural List"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </ToolbarButton>
          </div>

          {/* Right side of ribbon: Selection AI shortcut + Undo/Redo */}
          <div className="flex items-center gap-1">
            {selectedSnippet && onQuickSendSelectionToAI && (
              <button
                type="button"
                onClick={() => onQuickSendSelectionToAI(selectedSnippet)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 transition-all mr-1"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                Refine Selection
              </button>
            )}

            <ToolbarButton
              onClick={handleUndo}
              disabled={!editor?.can().undo() && !lastSnapshotHtml}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor?.can().redo()}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </ToolbarButton>
          </div>
        </div>
      </div>

      {/* Distraction-Free Manuscript Canvas */}
      <div className="flex-1 overflow-y-auto px-8 sm:px-14 pt-6 pb-28">
        <div className="mx-auto max-w-3xl">
          {/* Subtle Genre Calibration Subheader Bar */}
          <div className="mb-6 flex items-center justify-between text-xs text-neutral-500 border-b border-neutral-900 pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>
                Active Calibration:{" "}
                <strong className="text-neutral-300 font-medium">
                  {genreConfig.emoji} {genreConfig.label}
                </strong>
              </span>
              <span className="hidden md:inline text-neutral-600">•</span>
              <span className="hidden md:inline text-neutral-500">
                {genreConfig.tagline}
              </span>
            </div>
            <div className="flex items-center gap-2 text-neutral-500 font-mono text-[11px]">
              <FileText className="w-3 h-3 text-neutral-600" />
              <span>~{readingMinutes} min read</span>
            </div>
          </div>

          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Real-Time Word Counter Dock (Bottom-Left) */}
      <div className="fixed bottom-4 left-5 z-30 flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[#0d0f12]/95 border border-neutral-800/90 shadow-[0_8px_30px_rgba(0,0,0,0.85)] backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-amber-400" />
          <div className="text-xs font-mono">
            <span className="text-white font-semibold">
              {wordCount.toLocaleString()}
            </span>
            <span className="text-neutral-500"> / </span>
            {editingTarget ? (
              <input
                type="number"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                onBlur={() => {
                  setEditingTarget(false);
                  const parsed = parseInt(targetInput, 10);
                  if (!isNaN(parsed) && parsed > 50) {
                    onUpdateTargetWords?.(parsed);
                  } else {
                    setTargetInput(String(targetWords));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setEditingTarget(false);
                    const parsed = parseInt(targetInput, 10);
                    if (!isNaN(parsed) && parsed > 50) {
                      onUpdateTargetWords?.(parsed);
                    }
                  }
                }}
                autoFocus
                className="w-16 bg-[#16191f] text-amber-300 border border-amber-500/40 rounded px-1 py-0.5 text-xs focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTarget(true)}
                title="Click to adjust target word count goal"
                className="text-neutral-400 hover:text-amber-300 transition-colors underline decoration-dotted underline-offset-2"
              >
                {targetWords.toLocaleString()} words
              </button>
            )}
          </div>
        </div>

        {/* Mini Progress Bar */}
        <div className="w-24 h-1.5 bg-[#16191f] rounded-full overflow-hidden border border-neutral-800">
          <div
            className={`h-full bg-gradient-to-r ${genreConfig.progressBarClass} transition-all duration-300`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <span className="text-[11px] font-mono text-amber-400/90 font-medium">
          {progressPercent}%
        </span>

        <span className="hidden sm:inline text-[11px] text-neutral-600 border-l border-neutral-800 pl-2.5 font-mono">
          {charCount.toLocaleString()} chars
        </span>
      </div>
    </div>
  );
});

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-lg text-xs transition-all ${
        active
          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
          : "text-neutral-400 hover:text-neutral-100 hover:bg-[#16191f] border border-transparent"
      } ${disabled ? "opacity-35 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}
