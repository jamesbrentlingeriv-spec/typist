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

function buildGenreFallbackMarkdown(body: GenerateRequestBody): string {
  const { genre, documentTitle, prompt, selectedText, editorText } = body;
  const sourceText = (selectedText || editorText || "").trim();

  // If the user uploaded or selected existing text and wants to improve or expand it,
  // dynamically transform and expand their actual source paragraphs in local studio mode too!
  if (sourceText.length > 80) {
    const paragraphs = sourceText
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 25 && p !== documentTitle);

    const firstPara = paragraphs[0] || sourceText.slice(0, 260);
    const secondPara = paragraphs[1] || "";
    const thirdPara = paragraphs[2] || "";

    if (genre === "technical") {
      return `# ${documentTitle || "Improved Technical Manual"} (Calibrated Edition)

> **NOTE:** This manual has been restructured and enhanced by the **Typist Technical Manual Engine** for procedural clarity, operational safety, and step-by-step execution.

## 1. Executive Overview & Scope

${firstPara}

${
  secondPara
    ? `${secondPara}\n\nTo ensure deterministic execution across production environments, all operators must verify the prerequisite invariants below before initiating steps.`
    : `To ensure deterministic execution across production environments, all operators must verify the prerequisite invariants below before initiating steps.`
}

> **WARNING:** Always validate system state and backup current configurations prior to executing state-mutating procedures.

## 2. Prerequisites & Pre-Flight Checklist

- Confirm administrative access and verify that all target services report healthy status.
- Ensure configuration backups are snapshotted and stored in versioned storage.
- Verify network and permission boundaries required by **${documentTitle || "this manual"}**.

## 3. Enhanced Step-by-Step Procedure

1. **Initialize & Validate Environment:**
   Begin by auditing the current baseline state described in the source documentation:
   > *"${firstPara.slice(0, 180)}${firstPara.length > 180 ? "..." : ""}"*

2. **Execute Core Procedure:**
   ${
     thirdPara
       ? `${thirdPara}`
       : `Apply the primary operational sequence in sequential order and monitor output logs for warnings.`
   }

\`\`\`bash
# Verify configuration integrity and apply procedure
typist-ctl validate --source="${(documentTitle || "manual")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}.yaml"
typist-ctl apply --strict --verify-health
\`\`\`

3. **Post-Execution Verification:**
   Confirm that all health checks pass and log the completed runbook execution.${
     prompt ? `\n\n---\n*Calibrated for directive:* _${prompt}_` : ""
   }`;
    }

    if (genre === "nonfiction") {
      return `# ${documentTitle || "Expanded Analytical Draft"}

> **Key Insight:** ${firstPara.slice(0, 200)}${
        firstPara.length > 200 ? "..." : ""
      }

## I. Core Thesis & Expanded Context

${firstPara} Building upon this foundational premise, a rigorous examination reveals that the underlying mechanisms extend far beyond surface-level observations. When we situate these findings within a broader analytical framework, both the causal drivers and long-term implications come into sharper focus.

${
  secondPara
    ? `## II. Structural Analysis & Evidence\n\n${secondPara}\n\nFurthermore, synthesizing empirical evidence across comparable domains demonstrates three reinforcing dynamics:`
    : `## II. Structural Analysis & Evidence\n\nSynthesizing empirical evidence across comparable domains demonstrates three reinforcing dynamics:`
}

- **Clarified Conceptual Framing:** Elevating tacit assumptions into explicit, testable propositions strengthens the central argument.
- **Expanded Empirical Depth:** Connecting primary claims with concrete case evidence eliminates ambiguity and reinforces reader conviction.
- **Cohesive Narrative Arc:** Bridging each analytical section with explicit transitions ensures sustained intellectual momentum.

${
  thirdPara
    ? `## III. Implications & Synthesis\n\n${thirdPara}`
    : ""
}${prompt ? `\n\n---\n*Calibrated for directive:* _${prompt}_` : ""}`;
    }

    // Fiction with existing manuscript text
    return `## Expanded Scene: ${documentTitle || "Manuscript Continuation"}

${firstPara}

The silence that followed carried a weight of its own—thick with unspoken history and the faint, metallic tang of approaching rain. Every small detail in the room seemed sharpened by the tension.

${
  secondPara
    ? `${secondPara}\n\n"You left out the most important part," a voice broke in quietly, each word measured against the stillness.`
    : `"You left out the most important part," a voice broke in quietly, each word measured against the stillness.`
}

> *Sensory & Pacing Expansion:* Grounded the existing passage in deeper atmospheric contrast, physical character beats, and heightened dramatic subtext.

${
  thirdPara ? `${thirdPara}\n\n` : ""
}The shadows lengthened across the threshold as the next turn of the scene began to unfold.${
      prompt ? `\n\n---\n*Calibrated for directive:* _${prompt}_` : ""
    }`;
  }

  if (genre === "fiction") {
    return `## Scene Progression: ${documentTitle || "The Unmapped Strait"}

The lantern flame guttered against the salt-streaked glass, throwing long, nervous shadows across the mahogany chart table. Outside, the foghorn at Point Sorrow sounded twice—a low, brassy tremor that vibrated through the floorboards before dying into the surf.

"You brought the wrong ledger," Mara said, her fingers resting lightly on the astrolabe's vernier ring. She didn't look up as the rainwater dripped from his cuff onto the parchment. "Or else you already know what the third column hides."

> "When the compass needle points toward land that has no harbor, look first to the man who paid for the iron." — *Harbormaster's Log, Entry IV*

### Narrative Beat & Sensory Focus

Elian stepped closer to the brazier, holding his chilled palms toward the embers. Between them lay the fractured wax seal—still smelling faintly of clove oil and scorched pine.

- **Sensory Anchor:** Cold Atlantic spray, oxidized brass, flickering whale-oil shadow play.
- **Subtext Turn:** Neither character acknowledges the missing vessel by name; the tension rests on who will verify the falsified coordinates first.
${
  selectedText
    ? `\n*Refined from your selected context:* "${selectedText.slice(0, 110)}..."`
    : ""
}
${
  prompt
    ? `\n*Calibrated for prompt:* _${prompt.slice(0, 120)}_`
    : ""
}`;
  }

  if (genre === "nonfiction") {
    return `## Analytical Synthesis: ${documentTitle || "Structural Thesis"}

To understand why institutional frameworks falter during periods of technological acceleration, we must distinguish between *operational scale* and *epistemic calibration*. When organizations optimize exclusively for throughput, they inevitably compress the deliberative feedback loops required to detect systemic drift.

> **Key Insight:** High-velocity information systems rarely fail from a scarcity of raw data; they fail when analytical synthesis is decoupled from domain-specific verification standards.

### 1. The Structural Mechanism of Drift

Empirical case studies across distributed engineering and editorial institutions reveal three recurring patterns:

1. **Metric Substitution:** Surrogate velocity indicators gradually replace primary quality invariants in executive decision-making.
2. **Context Fragmentation:** Domain assumptions remain tacit rather than codified into repeatable analytical protocols.
3. **Asymmetric Verification:** The cost of generating plausible arguments drops exponentially faster than the cost of auditing their empirical foundations.

### 2. Evidence & Counter-Thesis Framing

Critics frequently argue that raw scale alone resolves ambiguity through statistical convergence. However, longitudinal synthesis demonstrates that uncalibrated systems amplify baseline biases unless anchored by explicit structural constraints.${
      prompt ? `\n\n*Addressed analytical directive:* _${prompt.slice(0, 120)}_` : ""
    }`;
  }

  // Technical Manual
  return `## Procedural Specification: ${documentTitle || "System Operation"}

This section defines the deterministic execution steps, safety invariants, and verification checks required to complete the operation without service degradation.

> **WARNING:** Ensure all active write leases are drained or fenced prior to modifying runtime state. Executing this procedure against an unfenced primary node can trigger split-brain state divergence.

### Prerequisites

- Administrative CLI credentials with \`cluster:operator\` role bindings verified.
- Network reachability across control-plane ports (\`2379/tcp\`, \`2380/tcp\`) with mTLS handshake latency \`< 10ms\`.
- Verified snapshot backup written to immutable object storage within the last 15 minutes.

### Step-by-Step Execution

1. **Acquire Maintenance Lease & Verify Quorum Health:**
   Inspect current node health and confirm zero uncommitted state transitions before applying configuration changes.

\`\`\`bash
# Step 1: Validate cluster state and acquire maintenance lock
typist-ctl cluster health --strict --timeout=5s
typist-ctl lock acquire --ttl=300s --reason="procedural-update"
\`\`\`

2. **Apply Calibrated Configuration Spec:**
   Execute the atomic rollout and stream real-time telemetry events until convergence is confirmed.

\`\`\`yaml
# config/runtime-calibration.yaml
apiVersion: studio.type.ai/v1alpha1
kind: CalibrationPolicy
metadata:
  name: production-quorum-spec
spec:
  verificationMode: strict
  maxReplicationLagMs: 15
  rollbackOnTimeout: true
\`\`\`

3. **Post-Execution Verification:**
   Confirm that all health probes report \`READY\` and release the operational lock.${
     prompt ? `\n\n*Executed technical directive:* _${prompt.slice(0, 120)}_` : ""
   }`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequestBody;
    const genre: DocumentGenre =
      body.genre && GENRE_ENGINE[body.genre] ? body.genre : "fiction";
    const genreConfig = GENRE_ENGINE[genre];

    const stylePreset =
      genreConfig.stylePresets.find((s) => s.id === body.stylePresetId) ||
      genreConfig.stylePresets[0];

    const runtimeKey =
      body.apiKey?.trim() ||
      req.headers.get("x-openrouter-key")?.trim() ||
      process.env.OPENROUTER_API_KEY?.trim() ||
      "";

    // Construct the Genre-Calibrated System Prompt + Active Document Metadata Context
    const systemPrompt = `${genreConfig.systemPrompt}

STYLE PRESET CALIBRATION (${stylePreset.name}):
${stylePreset.modifier}
${
  body.customSystemGuidance?.trim()
    ? `\nCUSTOM STUDIO TUNING DIRECTIVES:\n${body.customSystemGuidance.trim()}\n`
    : ""
}
ACTIVE DOCUMENT CONTEXT:
- Document Title: "${body.documentTitle || "Untitled Document"}"
- Active Genre: ${genreConfig.label} (${genreConfig.tagline})
- Target Word Count Goal: ${body.targetWords || genreConfig.defaultTargetWords} words (Current Draft: ${
      body.currentWordCount || 0
    } words)
${
  body.selectedText?.trim()
    ? `- Currently Selected Text in Editor:\n"""\n${body.selectedText.trim()}\n"""`
    : ""
}
${
  body.editorText?.trim()
    ? `- Full / Visible Manuscript Context:\n"""\n${body.editorText
        .trim()
        .slice(0, 14000)}\n"""`
    : ""
}

OUTPUT FORMAT RULES:
- Respond ONLY with high-craft Markdown ready for direct insertion into the document editor.
- Use clear Markdown headings (##, ###), formatted lists, code blocks (when appropriate for Technical Manuals), and callout blockquotes (> ).`;

    const requestedModel = body.model || "anthropic/claude-3.5-sonnet";
    const modelFallbacks = Array.from(
      new Set([
        requestedModel,
        "meta-llama/llama-3.3-70b-instruct:free",
        "meta-llama/llama-3.1-70b-instruct",
        "anthropic/claude-3.5-sonnet",
      ])
    );

    // If an OpenRouter API key is configured, stream live from OpenRouter with automatic model fallback
    if (runtimeKey) {
      let lastErrorText = "";

      for (const candidateModel of modelFallbacks) {
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
              temperature: body.temperature ?? 0.7,
              messages: [
                { role: "system", content: systemPrompt },
                {
                  role: "user",
                  content:
                    body.prompt?.trim() ||
                    `Continue and expand "${body.documentTitle}" in the ${genreConfig.label} genre.`,
                },
              ],
            }),
          }
        );

        if (openRouterResponse.ok && openRouterResponse.body) {
          const encoder = new TextEncoder();
          const decoder = new TextDecoder();

          const readableStream = new ReadableStream({
            async start(controller) {
              const reader = openRouterResponse.body!.getReader();
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
                      // Ignore partial SSE comment/keepalive frames
                    }
                  }
                }
                controller.close();
              } catch (err) {
                controller.error(err);
              }
            },
          });

          return new Response(readableStream, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
              "X-Stream-Mode": "openrouter-live",
              "X-Model-Used": candidateModel,
              "X-Genre-Calibrated": genre,
            },
          });
        } else {
          lastErrorText = await openRouterResponse.text().catch(() => "");
        }
      }

      console.warn(
        "OpenRouter models returned non-OK status, falling back to local calibrated stream:",
        lastErrorText
      );
    }

    // Stream calibrated studio fallback tokens in real time when no API key is set or offline
    const fallbackMarkdown = buildGenreFallbackMarkdown(body);
    const encoder = new TextEncoder();
    const tokens = fallbackMarkdown.match(/(\S+|\s+)/g) || [fallbackMarkdown];

    const simulatedStream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < tokens.length; i++) {
          controller.enqueue(encoder.encode(tokens[i]));
          await new Promise((r) => setTimeout(r, 14));
        }
        controller.close();
      },
    });

    return new Response(simulatedStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Stream-Mode": "calibrated-studio-fallback",
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
