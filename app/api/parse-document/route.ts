import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { marked } from "marked";
import { DocumentGenre } from "@/lib/genres";

export const runtime = "nodejs";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Converts raw extracted text (e.g. from a PDF manual or plain text file)
 * into clean, structured HTML suitable for the TipTap rich-text editor.
 */
function rawTextToStructuredHtml(title: string, rawText: string): string {
  const normalized = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .trim();

  if (!normalized) {
    return `<h1>${escapeHtml(title)}</h1><p></p>`;
  }

  const blocks = normalized.split(/\n{2,}/);
  const htmlParts: string[] = [`<h1>${escapeHtml(title)}</h1>`];

  for (const rawBlock of blocks) {
    const block = rawBlock.trim();
    if (!block) continue;

    const lines = block.split("\n").map((l) => l.trim());

    // Detect single-line headings (e.g. "1. Overview", "CHAPTER I", "Prerequisites", all-caps short headers)
    if (
      lines.length === 1 &&
      lines[0].length < 90 &&
      !lines[0].endsWith(".") &&
      (/^(chapter|section|part|appendix)\s+[\divx]+/i.test(lines[0]) ||
        /^\d+(\.\d+)*\s+[A-Z]/.test(lines[0]) ||
        /^(overview|prerequisites|installation|configuration|troubleshooting|introduction|conclusion|summary|warning|note|step\s+\d+)/i.test(
          lines[0]
        ) ||
        (lines[0] === lines[0].toUpperCase() &&
          /[A-Z]{3,}/.test(lines[0]) &&
          lines[0].length <= 65))
    ) {
      htmlParts.push(`<h2>${escapeHtml(lines[0])}</h2>`);
      continue;
    }

    // Detect Warning / Note callout blocks
    if (/^(warning|caution|important|note|key insight)\s*:/i.test(block)) {
      htmlParts.push(`<blockquote><p>${escapeHtml(block)}</p></blockquote>`);
      continue;
    }

    // Detect bullet lists
    if (lines.every((l) => /^[-•*]\s+/.test(l))) {
      const items = lines
        .map((l) => `<li>${escapeHtml(l.replace(/^[-•*]\s+/, ""))}</li>`)
        .join("");
      htmlParts.push(`<ul>${items}</ul>`);
      continue;
    }

    // Detect numbered procedural steps
    if (lines.length > 1 && lines.every((l) => /^\d+[.)]\s+/.test(l))) {
      const items = lines
        .map((l) => `<li>${escapeHtml(l.replace(/^\d+[.)]\s+/, ""))}</li>`)
        .join("");
      htmlParts.push(`<ol>${items}</ol>`);
      continue;
    }

    // Detect CLI / Code blocks
    if (
      lines.some(
        (l) =>
          l.startsWith("$ ") ||
          l.startsWith("# ") ||
          l.startsWith("sudo ") ||
          l.startsWith("npm ") ||
          l.startsWith("docker ") ||
          l.startsWith("kubectl ") ||
          l.includes("```")
      )
    ) {
      const cleanedCode = block.replace(/```[a-z]*\n?/gi, "").trim();
      htmlParts.push(`<pre><code>${escapeHtml(cleanedCode)}</code></pre>`);
      continue;
    }

    // Regular paragraph (join soft line wraps within a paragraph)
    const paragraphText = lines.join(" ");
    htmlParts.push(`<p>${escapeHtml(paragraphText)}</p>`);
  }

  return htmlParts.join("\n");
}

function detectSuggestedGenre(text: string, filename: string): DocumentGenre {
  const sample = `${filename} ${text.slice(0, 4000)}`.toLowerCase();
  const techScore = (
    sample.match(
      /\b(manual|runbook|prerequisite|install|configure|cli|command|api|warning|step-by-step|troubleshooting|parameter|server|system|deploy|protocol)\b/g
    ) || []
  ).length;
  const fictionScore = (
    sample.match(
      /\b(chapter|scene|whispered|replied|shouted|looked|darkness|shadow|protagonist|novel|story)\b/g
    ) || []
  ).length;
  const nonfictionScore = (
    sample.match(
      /\b(thesis|essay|argument|evidence|study|research|analysis|citation|historical|economic|framework)\b/g
    ) || []
  ).length;

  if (techScore >= fictionScore && techScore >= nonfictionScore && techScore > 1) {
    return "technical";
  }
  if (nonfictionScore > fictionScore && nonfictionScore > 1) {
    return "nonfiction";
  }
  return "fiction";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No document file provided." },
        { status: 400 }
      );
    }

    const fileName = file.name || "Uploaded-Document";
    const cleanTitle =
      fileName
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]+/g, " ")
        .trim() || "Imported Document";

    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";
    let structuredHtml = "";
    let pageCount: number | undefined = undefined;

    if (ext === "pdf" || file.type === "application/pdf") {
      const pdfProxy = await getDocumentProxy(new Uint8Array(arrayBuffer));
      pageCount = pdfProxy.numPages;
      const { text } = await extractText(pdfProxy, { mergePages: true });
      extractedText = Array.isArray(text) ? text.join("\n\n") : text || "";
      structuredHtml = rawTextToStructuredHtml(cleanTitle, extractedText);
    } else if (
      ext === "docx" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const [htmlResult, rawResult] = await Promise.all([
        mammoth.convertToHtml({ buffer }),
        mammoth.extractRawText({ buffer }),
      ]);
      extractedText = rawResult.value?.trim() || "";
      const bodyHtml = htmlResult.value?.trim() || "";
      structuredHtml = bodyHtml.startsWith("<h1")
        ? bodyHtml
        : `<h1>${escapeHtml(cleanTitle)}</h1>\n${bodyHtml}`;
    } else if (ext === "doc" || file.type === "application/msword") {
      // Legacy .doc / RTF fallback: extract printable UTF-8/ASCII runs
      const rawLatin = buffer.toString("utf8");
      const printableMatches =
        rawLatin.match(/[\x20-\x7E\r\n\t]{12,}/g) || [];
      extractedText = printableMatches
        .join("\n\n")
        .replace(/[^\x20-\x7E\n]/g, " ")
        .replace(/\s{3,}/g, "\n\n")
        .trim();
      structuredHtml = rawTextToStructuredHtml(cleanTitle, extractedText);
    } else if (ext === "md" || ext === "markdown") {
      extractedText = buffer.toString("utf8");
      const parsedMd = marked.parse(extractedText, { async: false }) as string;
      structuredHtml = parsedMd.includes("<h1")
        ? parsedMd
        : `<h1>${escapeHtml(cleanTitle)}</h1>\n${parsedMd}`;
    } else if (ext === "html" || ext === "htm") {
      const rawHtml = buffer.toString("utf8");
      const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      structuredHtml = bodyMatch ? bodyMatch[1] : rawHtml;
      extractedText = structuredHtml
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    } else {
      // Plain text (.txt, .log, .rst, etc.)
      extractedText = buffer.toString("utf8");
      structuredHtml = rawTextToStructuredHtml(cleanTitle, extractedText);
    }

    const wordCount = extractedText.trim()
      ? extractedText.trim().split(/\s+/).length
      : 0;

    const suggestedGenre = detectSuggestedGenre(extractedText, fileName);

    return NextResponse.json({
      title: cleanTitle,
      fileName,
      fileType: ext.toUpperCase() || "DOC",
      pageCount,
      wordCount,
      suggestedGenre,
      html: structuredHtml,
      plainText: extractedText,
    });
  } catch (err) {
    console.error("Error parsing uploaded document:", err);
    const message =
      err instanceof Error
        ? err.message
        : "Failed to parse uploaded file. Please try PDF, DOCX, MD, or TXT.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
