import { jsPDF } from "jspdf";
import { DocumentGenre, GENRE_ENGINE } from "./genres";

interface PdfBlock {
  type: "h1" | "h2" | "h3" | "p" | "blockquote" | "code" | "ul" | "ol";
  text: string;
  items?: string[];
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&lsquo;|&rsquo;/gi, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–");
}

function stripTags(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Parses TipTap HTML into semantic blocks for PDF typesetting.
 */
export function parseHtmlToPdfBlocks(html: string): PdfBlock[] {
  if (!html || !html.trim()) return [];

  const blocks: PdfBlock[] = [];
  const tokenRegex =
    /<(h1|h2|h3|p|blockquote|pre|ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi;

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const inner = match[2];

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      const text = stripTags(inner);
      if (text) blocks.push({ type: tag, text });
    } else if (tag === "blockquote") {
      const text = stripTags(inner);
      if (text) blocks.push({ type: "blockquote", text });
    } else if (tag === "pre") {
      const codeText = decodeHtmlEntities(
        inner.replace(/<[^>]+>/g, "")
      ).trim();
      if (codeText) blocks.push({ type: "code", text: codeText });
    } else if (tag === "ul" || tag === "ol") {
      const items: string[] = [];
      const liRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch: RegExpExecArray | null;
      while ((liMatch = liRegex.exec(inner)) !== null) {
        const itemText = stripTags(liMatch[1]);
        if (itemText) items.push(itemText);
      }
      if (items.length > 0) {
        blocks.push({ type: tag, text: "", items });
      }
    } else if (tag === "p") {
      const text = stripTags(inner);
      if (text) blocks.push({ type: "p", text });
    }
  }

  // Fallback if raw text had no matching tags
  if (blocks.length === 0) {
    const plain = stripTags(html);
    if (plain) {
      plain.split(/\n{2,}/).forEach((para) => {
        const trimmed = para.trim();
        if (trimmed) blocks.push({ type: "p", text: trimmed });
      });
    }
  }

  return blocks;
}

export function buildPdfDocument(params: {
  title: string;
  genre: DocumentGenre;
  html: string;
}): jsPDF {
  const { title, genre, html } = params;
  const genreConfig = GENRE_ENGINE[genre] || GENRE_ENGINE.technical;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter", // 612 x 792 pt
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 54;
  const topMargin = 62;
  const bottomMargin = 58;
  const contentWidth = pageWidth - marginX * 2;

  let cursorY = topMargin;

  const ensureSpace = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - bottomMargin) {
      pdf.addPage();
      cursorY = topMargin;
    }
  };

  const blocks = parseHtmlToPdfBlocks(html);

  // If the first block is not an H1 matching the title, render the document title header
  const firstBlockIsTitle =
    blocks.length > 0 &&
    blocks[0].type === "h1" &&
    blocks[0].text.toLowerCase() === title.toLowerCase();

  if (!firstBlockIsTitle && title) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.setTextColor(17, 24, 39);
    const titleLines = pdf.splitTextToSize(title, contentWidth);
    ensureSpace(titleLines.length * 26 + 16);
    pdf.text(titleLines, marginX, cursorY);
    cursorY += titleLines.length * 26 + 6;

    // Subtle divider line below document title
    pdf.setDrawColor(210, 214, 220);
    pdf.setLineWidth(1);
    pdf.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 20;
  }

  for (const block of blocks) {
    if (block.type === "h1") {
      cursorY += 8;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.setTextColor(17, 24, 39);
      const lines = pdf.splitTextToSize(block.text, contentWidth);
      ensureSpace(lines.length * 24 + 14);
      pdf.text(lines, marginX, cursorY);
      cursorY += lines.length * 24 + 10;
    } else if (block.type === "h2") {
      cursorY += 10;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14.5);
      pdf.setTextColor(31, 41, 55);
      const lines = pdf.splitTextToSize(block.text, contentWidth);
      ensureSpace(lines.length * 19 + 14);
      pdf.text(lines, marginX, cursorY);
      cursorY += lines.length * 19 + 4;
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.75);
      pdf.line(marginX, cursorY, pageWidth - marginX, cursorY);
      cursorY += 12;
    } else if (block.type === "h3") {
      cursorY += 6;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(55, 65, 81);
      const lines = pdf.splitTextToSize(block.text, contentWidth);
      ensureSpace(lines.length * 16 + 8);
      pdf.text(lines, marginX, cursorY);
      cursorY += lines.length * 16 + 6;
    } else if (block.type === "blockquote") {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(10.5);
      const innerWidth = contentWidth - 28;
      const lines = pdf.splitTextToSize(block.text, innerWidth);
      const boxHeight = lines.length * 15 + 16;
      ensureSpace(boxHeight + 10);

      // Soft amber/slate callout background
      pdf.setFillColor(254, 249, 235);
      pdf.roundedRect(
        marginX,
        cursorY - 11,
        contentWidth,
        boxHeight,
        4,
        4,
        "F"
      );
      // Left accent bar
      pdf.setFillColor(217, 119, 6);
      pdf.rect(marginX, cursorY - 11, 3.5, boxHeight, "F");

      pdf.setTextColor(120, 53, 15);
      pdf.text(lines, marginX + 14, cursorY + 2);
      cursorY += boxHeight + 10;
    } else if (block.type === "code") {
      pdf.setFont("courier", "normal");
      pdf.setFontSize(9.5);
      const innerWidth = contentWidth - 24;
      const rawLines = block.text.split("\n");
      const wrappedLines: string[] = [];
      for (const rl of rawLines) {
        const split = pdf.splitTextToSize(rl || " ", innerWidth);
        wrappedLines.push(...split);
      }
      const boxHeight = wrappedLines.length * 13.5 + 18;
      ensureSpace(boxHeight + 10);

      pdf.setFillColor(243, 244, 246);
      pdf.setDrawColor(209, 213, 219);
      pdf.roundedRect(
        marginX,
        cursorY - 10,
        contentWidth,
        boxHeight,
        4,
        4,
        "FD"
      );

      pdf.setTextColor(17, 24, 39);
      pdf.text(wrappedLines, marginX + 12, cursorY + 3);
      cursorY += boxHeight + 12;
    } else if (block.type === "ul" || block.type === "ol") {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(31, 41, 55);

      const items = block.items || [];
      items.forEach((item, idx) => {
        const prefix = block.type === "ol" ? `${idx + 1}.` : "•";
        const itemLines = pdf.splitTextToSize(item, contentWidth - 22);
        ensureSpace(itemLines.length * 15.5 + 5);
        pdf.setFont("helvetica", "bold");
        pdf.text(prefix, marginX + 4, cursorY);
        pdf.setFont("helvetica", "normal");
        pdf.text(itemLines, marginX + 20, cursorY);
        cursorY += itemLines.length * 15.5 + 4;
      });
      cursorY += 6;
    } else {
      // Standard paragraph
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(31, 41, 55);
      const lines = pdf.splitTextToSize(block.text, contentWidth);
      ensureSpace(lines.length * 16 + 8);
      pdf.text(lines, marginX, cursorY);
      cursorY += lines.length * 16 + 9;
    }
  }

  // Add running header & page numbers across all pages
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(156, 163, 175);

    // Header
    pdf.text(
      `${title.slice(0, 65)}  •  Typist ${genreConfig.label}`,
      marginX,
      32
    );
    pdf.setDrawColor(235, 238, 242);
    pdf.setLineWidth(0.5);
    pdf.line(marginX, 38, pageWidth - marginX, 38);

    // Footer
    pdf.line(
      marginX,
      pageHeight - 40,
      pageWidth - marginX,
      pageHeight - 40
    );
    pdf.text(
      `Generated with Typist Studio`,
      marginX,
      pageHeight - 26
    );
    pdf.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 26,
      { align: "right" }
    );
  }

  return pdf;
}

export function downloadDocumentAsPdf(params: {
  title: string;
  genre: DocumentGenre;
  html: string;
}): void {
  const pdf = buildPdfDocument(params);
  const safeFilename =
    params.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "typist-document";
  pdf.save(`${safeFilename}.pdf`);
}

export function createPdfPreviewUrl(params: {
  title: string;
  genre: DocumentGenre;
  html: string;
}): string {
  const pdf = buildPdfDocument(params);
  const blob = pdf.output("blob");
  return URL.createObjectURL(blob);
}
