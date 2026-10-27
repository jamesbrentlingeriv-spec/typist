import { NextRequest } from "next/server";
import { DocumentGenre, GENRE_ENGINE } from "@/lib/genres";

export const runtime = "nodejs";

interface GenerateRequestBody {
  prompt: string;
  genre: DocumentGenre;
  documentTitle: string;
  targetWords: number;
  currentWordCount?: number;
  editorText?: string;
  selectedText?: string;
  stylePresetId?: string;
  customSystemGuidance?: string;
  model?: string;
  apiKey?: string;
  temperature?: number;
}

/**
 * Purely faithful offline transformer if network is unreachable:
 * Never invents unrelated topics, characters, or fake CLI commands—only restructures
 * and formats the user's actual document text.
 */
function buildFaithfulDocumentTransform(body: GenerateRequestBody): string {
  const { documentTitle, prompt, selectedText, editorText } = body;
  const sourceText = (selectedText || editorText || "").trim();

  if (!sourceText) {
    return `## ${documentTitle || "Document Draft"}\n\n${
      prompt || "Start writing or upload a PDF / DOCX document to improve or expand."
    }`;
  }

  const rawLines = sourceText
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const out: string[] = [`# ${documentTitle || "Improved Document"}`];

  for (const line of rawLines) {
    if (line.toLowerCase() === (documentTitle || "").toLowerCase()) continue;
    if (line.startsWith("## ") || line.startsWith("# ")) {
      out.push(`\n${line}\n`);
    } else if (
      line.length < 80 &&
      !line.endsWith(".") &&
      (/^\d+(\.\d+)*\s+[A-Z]/.test(line) ||
        /^(chapter|section|part|step|overview|prerequisites|introduction|summary|conclusion)/i.test(
          line
        ))
    ) {
      out.push(`\n## ${line}\n`);
    } else if (/^(warning|note|important|caution)\s*[:—-]/i.test(line)) {
      out.push(`> **${line}**`);
    } else if (/^[-•*]\s+/.test(line)) {
      out.push(`- ${line.replace(/^[-•*]\s+/, "")}`);
    } else if (/^\d+[.)]\s+/.test(line)) {
      out.push(line);
    } else {
      out.push(line);
    }
  }

  return out.join("\n\n");
}

function createSseToPlainTextStream(
  upstreamBody: ReadableStream<Uint8Array>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const reader = upstreamBody.getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;
            const dataStr = trimmed.replace(/^data:\s*/, "");
            if (dataStr === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // Ignore partial SSE frames
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequestBody;
    const genre: DocumentGenre =
      body.genre && GENRE_ENGINE[body.genre] ? body.genre : "technical";
    const genreConfig = GENRE_ENGINE[genre];

    const stylePreset =
      genreConfig.stylePresets.find((s) => s.id === body.stylePresetId) ||
      genreConfig.stylePresets[0];

    const runtimeKey =
      body.apiKey?.trim() ||
      req.headers.get("x-openrouter-key")?.trim() ||
      process.env.OPENROUTER_API_KEY?.trim() ||
      "";

    const hasExistingDocument = Boolean(
      (body.selectedText && body.selectedText.trim().length > 10) ||
        (body.editorText && body.editorText.trim().length > 10)
    );

    const systemPrompt = `${genreConfig.systemPrompt}

STYLE PRESET CALIBRATION (${stylePreset.name}):
${stylePreset.modifier}
${
  body.customSystemGuidance?.trim()
    ? `\nCUSTOM STUDIO TUNING DIRECTIVES:\n${body.customSystemGuidance.trim()}\n`
    : ""
}
CRITICAL GROUNDING & DOCUMENT FIDELITY RULES:
1. NEVER invent unrelated topics, fictional characters, or fake CLI tools (like "typist-ctl" or "raftctl") that are not in the user's document or prompt.
2. When the user has uploaded or written a document in the editor (shown below under ACTIVE DOCUMENT CONTENT), you MUST work directly with their ACTUAL document content:
   - Preserve all real subject matter, domain terminology, product names, facts, and intent from their uploaded PDF/document.
   - If asked to "improve" or "make it better": rewrite, reorganize, clarify, and format the user's ACTUAL document into a cleaner, more professional ${
     genreConfig.label
   } with clear Markdown headings (##, ###), bullet/numbered lists, callout boxes (> **Important:** ...), and polished prose.
   - If asked to "expand": elaborate directly on the actual sections, steps, arguments, or scenes present in the user's document with deeper explanation, examples, and clarity.
3. Output ONLY clean Markdown ready to be applied directly into the document or exported as a PDF. Do not wrap the entire response in a markdown code fence.

ACTIVE DOCUMENT METADATA:
- Document Title: "${body.documentTitle || "Untitled Document"}"
- Active Genre: ${genreConfig.label}
- Current Word Count: ${body.currentWordCount || 0} words (Target Goal: ${
      body.targetWords || genreConfig.defaultTargetWords
    } words)
${
  body.selectedText?.trim()
    ? `\nSELECTED PASSAGE TO TRANSFORM:\n"""\n${body.selectedText.trim()}\n"""`
    : ""
}
${
  body.editorText?.trim()
    ? `\nACTIVE DOCUMENT CONTENT (FROM UPLOADED PDF / EDITOR):\n"""\n${body.editorText
        .trim()
        .slice(0, 18000)}\n"""`
    : ""
}`;

    const userPrompt = hasExistingDocument
      ? `${
          body.prompt?.trim() ||
          `Improve, restructure, and polish this ${genreConfig.label} document.`
        }\n\nIMPORTANT: Base your entire output strictly on the ACTIVE DOCUMENT CONTENT provided above so the improved/expanded version stays 100% faithful to the uploaded document's real subject matter.`
      : body.prompt?.trim() ||
        `Write a comprehensive ${genreConfig.label} titled "${body.documentTitle}".`;

    const requestedModel = body.model || "anthropic/claude-3.5-sonnet";
    const modelFallbacks = Array.from(
      new Set([
        requestedModel,
        "meta-llama/llama-3.3-70b-instruct:free",
        "meta-llama/llama-3.1-70b-instruct",
        "anthropic/claude-3.5-sonnet",
      ])
    );

    // 1. If an OpenRouter API key is configured, stream live from OpenRouter
    if (runtimeKey) {
      for (const candidateModel of modelFallbacks) {
        try {
          const openRouterResponse = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${runtimeKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://typist.studio.local",
                "X-Title": "Typist Studio",
              },
              body: JSON.stringify({
                model: candidateModel,
                stream: true,
                temperature: body.temperature ?? 0.5,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
              }),
            }
          );

          if (openRouterResponse.ok && openRouterResponse.body) {
            return new Response(
              createSseToPlainTextStream(openRouterResponse.body),
              {
                headers: {
                  "Content-Type": "text/plain; charset=utf-8",
                  "Cache-Control": "no-cache, no-transform",
                  "X-Stream-Mode": "openrouter-live",
                  "X-Model-Used": candidateModel,
                  "X-Genre-Calibrated": genre,
                },
              }
            );
          }
        } catch {
          // Try next fallback model
        }
      }
    }

    // 2. Zero-config live AI streaming fallback (works out-of-the-box without requiring an OpenRouter key!)
    try {
      const zeroConfigResponse = await fetch(
        "https://text.pollinations.ai/openai",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai",
            stream: true,
            temperature: body.temperature ?? 0.5,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        }
      );

      if (zeroConfigResponse.ok && zeroConfigResponse.body) {
        return new Response(
          createSseToPlainTextStream(zeroConfigResponse.body),
          {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
              "X-Stream-Mode": "live-ai-zero-config",
              "X-Model-Used": "Typist Built-In AI (OpenAI)",
              "X-Genre-Calibrated": genre,
            },
          }
        );
      }
    } catch (err) {
      console.warn("Zero-config live AI fallback error:", err);
    }

    // 3. Offline deterministic fallback: strictly formats the user's real document text without inventing anything
    const faithfulMarkdown = buildFaithfulDocumentTransform(body);
    const encoder = new TextEncoder();
    const tokens =
      faithfulMarkdown.match(/(\S+|\s+)/g) || [faithfulMarkdown];

    const simulatedStream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < tokens.length; i++) {
          controller.enqueue(encoder.encode(tokens[i]));
          await new Promise((r) => setTimeout(r, 8));
        }
        controller.close();
      },
    });

    return new Response(simulatedStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Stream-Mode": "offline-faithful-formatter",
        "X-Model-Used": requestedModel,
        "X-Genre-Calibrated": genre,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected generation error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
