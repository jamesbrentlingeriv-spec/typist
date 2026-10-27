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

interface PdfTextLine {
  y: number;
  fontSize: number;
  text: string;
}

/**
 * Extracts layout-aware structured text and HTML from a PDF using PDF.js text items
 * (preserving font-size headings, vertical paragraph gaps, lists, and multi-page structure).
 */
async function extractStructuredPdf(
  arrayBuffer: ArrayBuffer,
  cleanTitle: string
): Promise<{
  pageCount: number;
  plainText: string;
  html: string;
}> {
  const pdfProxy = await getDocumentProxy(new Uint8Array(arrayBuffer));
  const pageCount = pdfProxy.numPages;

  const allPagesPlainText: string[] = [];
  const htmlParts: string[] = [`<h1>${escapeHtml(cleanTitle)}</h1>`];

  try {
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdfProxy.getPage(pageNum);
      const textContent = await page.getTextContent();
      const rawItems = (textContent.items || []) as Array<{
        str?: string;
        transform?: number[];
        hasEOL?: boolean;
      }>;

      const lines: PdfTextLine[] = [];
      let currentLineText = "";
      let currentY: number | null = null;
      let currentFontSize = 11;

      for (const item of rawItems) {
        const str = item.str ?? "";
        if (!str.trim() && !currentLineText) continue;

        const y = item.transform ? Math.round(item.transform[5]) : 0;
        const fontSize = item.transform
          ? Math.round(Math.abs(item.transform[0] || item.transform[3] || 11))
          : 11;

        if (currentY === null) {
          currentY = y;
          currentFontSize = fontSize;
          currentLineText = str;
        } else if (Math.abs(y - currentY) <= 4) {
          // Same horizontal line on the PDF page
          const needsSpace =
            currentLineText.length > 0 &&
            !currentLineText.endsWith(" ") &&
            !currentLineText.endsWith("-") &&
            !str.startsWith(" ") &&
            !/^[.,;:!?)]/.test(str);
          currentLineText += (needsSpace ? " " : "") + str;
          if (fontSize > currentFontSize) currentFontSize = fontSize;
        } else {
          if (currentLineText.trim()) {
            lines.push({
              y: currentY,
              fontSize: currentFontSize,
              text: currentLineText.trim(),
            });
          }
          currentY = y;
          currentFontSize = fontSize;
          currentLineText = str;
        }
      }

      if (currentLineText.trim() && currentY !== null) {
        lines.push({
          y: currentY,
          fontSize: currentFontSize,
          text: currentLineText.trim(),
        });
      }

      if (lines.length === 0) continue;

      // Calculate median body font size on this page
      const sortedSizes = lines
        .map((l) => l.fontSize)
        .sort((a, b) => a - b);
      const medianSize =
        sortedSizes[Math.floor(sortedSizes.length / 2)] || 11;

      // Group lines into semantic paragraphs, headings, and lists based on Y-distance and font size
      let paragraphBuffer: string[] = [];
      let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;
      const pagePlainParagraphs: string[] = [];

      const flushParagraph = () => {
        if (paragraphBuffer.length > 0) {
          const joined = paragraphBuffer
            .join(" ")
            .replace(/-\s+/g, "")
            .replace(/\s+/g, " ")
            .trim();
          if (joined) {
            htmlParts.push(`<p>${escapeHtml(joined)}</p>`);
            pagePlainParagraphs.push(joined);
          }
          paragraphBuffer = [];
        }
      };

      const flushList = () => {
        if (listBuffer && listBuffer.items.length > 0) {
          const lis = listBuffer.items
            .map((it) => `<li>${escapeHtml(it)}</li>`)
            .join("");
          htmlParts.push(`<${listBuffer.type}>${lis}</${listBuffer.type}>`);
          pagePlainParagraphs.push(
            listBuffer.items
              .map((it, idx) =>
                listBuffer?.type === "ol" ? `${idx + 1}. ${it}` : `• ${it}`
              )
              .join("\n")
          );
          listBuffer = null;
        }
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const prevLine = i > 0 ? lines[i - 1] : null;
        const verticalGap = prevLine ? Math.abs(prevLine.y - line.y) : 0;

        // Skip standalone page numbers at very top/bottom
        if (/^(page\s+)?\d+(\s+of\s+\d+)?$/i.test(line.text) && lines.length > 3) {
          continue;
        }

        const isBullet = /^[-•▪▸*]\s+/.test(line.text);
        const isNumbered = /^\d+[.)]\s+/.test(line.text);
        const isCallout =
          /^(warning|caution|important|note|tip|prerequisite|danger)\s*[:—-]/i.test(
            line.text
          );
        const isHeadingBySize =
          line.fontSize >= medianSize + 2 && line.text.length < 110;
        const isHeadingByPattern =
          line.text.length < 85 &&
          !line.text.endsWith(".") &&
          (/^(chapter|section|part|appendix|module)\s+[\divx]+/i.test(
            line.text
          ) ||
            /^\d+(\.\d+)*\s+[A-Z]/.test(line.text) ||
            /^(overview|prerequisites|installation|configuration|troubleshooting|introduction|conclusion|summary|specifications|procedure|safety|maintenance)$/i.test(
              line.text.trim()
            ));

        if (isHeadingBySize || isHeadingByPattern) {
          flushParagraph();
          flushList();
          const tag = line.fontSize >= medianSize + 5 ? "h2" : "h2";
          htmlParts.push(`<${tag}>${escapeHtml(line.text)}</${tag}>`);
          pagePlainParagraphs.push(`## ${line.text}`);
          continue;
        }

        if (isCallout) {
          flushParagraph();
          flushList();
          htmlParts.push(
            `<blockquote><p>${escapeHtml(line.text)}</p></blockquote>`
          );
          pagePlainParagraphs.push(`> ${line.text}`);
          continue;
        }

        if (isBullet) {
          flushParagraph();
          if (listBuffer && listBuffer.type !== "ul") flushList();
          if (!listBuffer) listBuffer = { type: "ul", items: [] };
          listBuffer.items.push(line.text.replace(/^[-•▪▸*]\s+/, "").trim());
          continue;
        }

        if (isNumbered) {
          flushParagraph();
          if (listBuffer && listBuffer.type !== "ol") flushList();
          if (!listBuffer) listBuffer = { type: "ol", items: [] };
          listBuffer.items.push(line.text.replace(/^\d+[.)]\s+/, "").trim());
          continue;
        }

        // If a list was open and this line is indented continuation or a new paragraph
        if (listBuffer) {
          flushList();
        }

        // Start a new paragraph if there is a large vertical gap
        if (
          prevLine &&
          verticalGap > Math.max(line.fontSize * 1.65, 18) &&
          paragraphBuffer.length > 0
        ) {
          flushParagraph();
        }

        paragraphBuffer.push(line.text);
      }

      flushParagraph();
      flushList();

      if (pagePlainParagraphs.length > 0) {
        allPagesPlainText.push(pagePlainParagraphs.join("\n\n"));
      }
    }
  } catch {
    // Fallback to simple unpdf text extraction if coordinate parsing fails on an unusual PDF
    const { text } = await extractText(pdfProxy, { mergePages: false });
    const pages = Array.isArray(text) ? text : [String(text || "")];
    for (const p of pages) {
      if (p.trim()) allPagesPlainText.push(p.trim());
    }
    return {
      pageCount,
      plainText: allPagesPlainText.join("\n\n"),
      html: rawTextToStructuredHtml(cleanTitle, allPagesPlainText.join("\n\n")),
    };
  }

  const finalPlainText = allPagesPlainText.join("\n\n").trim();
  return {
    pageCount,
    plainText: finalPlainText,
    html:
      htmlParts.length > 1
        ? htmlParts.join("\n")
        : rawTextToStructuredHtml(cleanTitle, finalPlainText),
  };
}

/**
 * Converts raw extracted text into clean, structured HTML suitable for TipTap.
 */
function rawTextToStructuredHtml(title: string, rawText: string): string {
  const normalized = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .trim();

  if (!normalized) {
    return `<h1>${escapeHtml(title)}</h1><p></p>`;
  }

  const blocks = normalized.includes("\n\n")
    ? normalized.split(/\n{2,}/)
    : normalized.split(/\n/);

  const htmlParts: string[] = [`<h1>${escapeHtml(title)}</h1>`];

  for (const rawBlock of blocks) {
    const block = rawBlock.trim();
    if (!block) continue;

    const lines = block.split("\n").map((l) => l.trim());

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

    if (/^(warning|caution|important|note|key insight)\s*:/i.test(block)) {
      htmlParts.push(`<blockquote><p>${escapeHtml(block)}</p></blockquote>`);
      continue;
    }

    if (lines.every((l) => /^[-•*]\s+/.test(l))) {
      const items = lines
        .map((l) => `<li>${escapeHtml(l.replace(/^[-•*]\s+/, ""))}</li>`)
        .join("");
      htmlParts.push(`<ul>${items}</ul>`);
      continue;
    }

    if (lines.length > 1 && lines.every((l) => /^\d+[.)]\s+/.test(l))) {
      const items = lines
        .map((l) => `<li>${escapeHtml(l.replace(/^\d+[.)]\s+/, ""))}</li>`)
        .join("");
      htmlParts.push(`<ol>${items}</ol>`);
      continue;
    }

    const paragraphText = lines.join(" ");
    htmlParts.push(`<p>${escapeHtml(paragraphText)}</p>`);
  }

  return htmlParts.join("\n");
}

function detectSuggestedGenre(text: string, filename: string): DocumentGenre {
  const sample = `${filename} ${text.slice(0, 4000)}`.toLowerCase();
  const techScore = (
    sample.match(
      /\b(manual|runbook|prerequisite|install|configure|cli|command|api|warning|step-by-step|troubleshooting|parameter|server|system|deploy|protocol|guide|instructions|safety|operation|equipment|device)\b/g
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

  if (techScore >= fictionScore && techScore >= nonfictionScore && techScore > 0) {
    return "technical";
  }
  if (nonfictionScore > fictionScore && nonfictionScore > 0) {
    return "nonfiction";
  }
  return "technical";
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
    let isPdfSource = false;

    if (ext === "pdf" || file.type === "application/pdf") {
      isPdfSource = true;
      const pdfData = await extractStructuredPdf(arrayBuffer, cleanTitle);
      pageCount = pdfData.pageCount;
      extractedText = pdfData.plainText;
      structuredHtml = pdfData.html;
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
      isPdfSource,
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
