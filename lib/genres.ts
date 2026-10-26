export type DocumentGenre = "fiction" | "nonfiction" | "technical";

export interface GenreCalibration {
  id: DocumentGenre;
  label: string;
  shortLabel: string;
  emoji: string;
  tagline: string;
  hexColor: string;
  badgeClass: string;
  activeTabClass: string;
  glowBorderClass: string;
  cardTintClass: string;
  progressBarClass: string;
  systemPrompt: string;
  stylePresets: {
    id: string;
    name: string;
    description: string;
    modifier: string;
  }[];
  promptShortcuts: {
    label: string;
    prompt: string;
    badge: string;
  }[];
  defaultTargetWords: number;
  placeholder: string;
}

export const GENRE_ENGINE: Record<DocumentGenre, GenreCalibration> = {
  fiction: {
    id: "fiction",
    label: "Fiction",
    shortLabel: "Fiction",
    emoji: "📖",
    tagline: "Narrative focus, sensory descriptions, dialogue cadence & show-don't-tell pacing",
    hexColor: "#a855f7",
    badgeClass:
      "bg-purple-500/15 text-purple-300 border border-purple-500/35 shadow-[0_0_12px_rgba(168,85,247,0.18)]",
    activeTabClass:
      "bg-purple-500/20 text-purple-200 border-purple-500/50 shadow-[0_0_18px_rgba(168,85,247,0.28)]",
    glowBorderClass: "border-purple-500/25 hover:border-purple-500/45",
    cardTintClass: "bg-purple-950/20 border-purple-500/30",
    progressBarClass: "from-purple-500 to-fuchsia-400",
    defaultTargetWords: 2500,
    placeholder:
      "Describe your scene premise, character conflict, sensory setting, or chapter beat sheet...",
    systemPrompt: `You are an elite Literary & Commercial Fiction Co-Writer inside Typist Studio.
GENRE CALIBRATION: FICTION
Follow these strict craft directives on every response:
1. NARRATIVE FOCUS & SHOW-DON'T-TELL: Ground emotional states in physical gesture, subtext, and concrete sensory details (light, texture, sound, atmosphere) rather than abstract exposition.
2. DIALOGUE CADENCE: Write natural, sharp dialogue with distinct character voice, subtext, and varied sentence rhythm. Use crisp action beats instead of heavy adverbial dialogue tags.
3. SCENE & CHAPTER ARCHITECTURE: Structure outputs with clear narrative momentum, scene turns, and evocative Markdown headings (e.g., ## Chapter / Scene headers).
4. FORMATTING: Return clean, rich Markdown suitable for direct insertion into a manuscript editor. Use blockquotes (> ) sparingly for in-world epigraphs, letters, or internal monologue highlights.`,
    stylePresets: [
      {
        id: "cinematic-noir",
        name: "Cinematic & Atmospheric",
        description: "Visceral sensory detail, tight pacing, neo-noir tension",
        modifier:
          "Use taut, cinematic prose with sharp sensory contrast, tight pacing, and evocative atmosphere.",
      },
      {
        id: "literary-character",
        name: "Literary & Interior",
        description: "Deep psychological nuance, lyrical cadence, rich subtext",
        modifier:
          "Prioritize lyrical cadence, deep psychological interiority, and layered interpersonal subtext.",
      },
      {
        id: "speculative-world",
        name: "Speculative / Sci-Fi",
        description: "Immersive worldbuilding woven seamlessly into action",
        modifier:
          "Weave worldbuilding and speculative technology organically into character action without info-dumping.",
      },
    ],
    promptShortcuts: [
      {
        label: "Expand Scene",
        badge: "Sensory",
        prompt:
          "Expand the current scene with richer sensory atmosphere, grounded physical beats, and heightened dramatic tension.",
      },
      {
        label: "Add Dialogue",
        badge: "Subtext",
        prompt:
          "Write a sharp, subtext-heavy dialogue exchange between the key characters that advances the conflict without on-the-nose exposition.",
      },
      {
        label: "Chapter Breakdown",
        badge: "Structure",
        prompt:
          "Create a 4-scene chapter beat breakdown with narrative hooks, turning points, and a cliffhanger resolution.",
      },
      {
        label: "Show, Don't Tell",
        badge: "Polish",
        prompt:
          "Rewrite the selected passage to replace abstract emotional summary with visceral sensory detail and character action beats.",
      },
    ],
  },

  nonfiction: {
    id: "nonfiction",
    label: "Nonfiction",
    shortLabel: "Nonfiction",
    emoji: "🖋️",
    tagline: "Analytical tone, essay/argumentative structure, evidence framing & thematic headings",
    hexColor: "#0284c7",
    badgeClass:
      "bg-sky-500/15 text-sky-300 border border-sky-500/35 shadow-[0_0_12px_rgba(2,132,199,0.2)]",
    activeTabClass:
      "bg-sky-500/20 text-sky-200 border-sky-500/50 shadow-[0_0_18px_rgba(2,132,199,0.28)]",
    glowBorderClass: "border-cyan-500/25 hover:border-cyan-500/45",
    cardTintClass: "bg-cyan-950/20 border-cyan-500/30",
    progressBarClass: "from-sky-500 to-cyan-400",
    defaultTargetWords: 2000,
    placeholder:
      "Describe your core thesis, analytical essay topic, research claim, or executive narrative...",
    systemPrompt: `You are an authoritative Nonfiction Essayist, Research Analyst, and Thought-Leadership Editor inside Typist Studio.
GENRE CALIBRATION: NONFICTION
Follow these strict craft directives on every response:
1. ANALYTICAL TONE & PRECISION: Maintain an incisive, intellectually rigorous, and lucid prose style. Avoid fluff, cliches, and vague generalizations.
2. ESSAY & ARGUMENTATIVE STRUCTURE: Frame ideas around clear theses, counter-arguments, causal mechanisms, and logically sequenced thematic headings (##, ###).
3. EVIDENCE & CITATION FRAMING: Anchor claims with concrete historical/empirical examples, structured bullet syntheses, and callout blockquotes (> **Key Insight:** ...) for core takeaways.
4. FORMATTING: Output clean Markdown with strong thematic section headers, analytical bullet points, and synthesized conclusions.`,
    stylePresets: [
      {
        id: "analytical-essay",
        name: "Longform Analytical Essay",
        description: "The Atlantic / New Yorker style synthesis & narrative rigor",
        modifier:
          "Write with the narrative intellectual clarity of a flagship longform essay, blending thesis precision with compelling case studies.",
      },
      {
        id: "executive-brief",
        name: "Executive Thesis & Strategy",
        description: "High-signal arguments, structured evidence, zero fluff",
        modifier:
          "Use high-density analytical framing, clear structural subheadings, and evidence-backed strategic takeaways.",
      },
      {
        id: "academic-synthesis",
        name: "Research & Literature Synthesis",
        description: "Methodical claim-evidence-warrant structure with citations",
        modifier:
          "Structure paragraphs using rigorous claim-evidence-reasoning flow with formal citation placeholders and methodological clarity.",
      },
    ],
    promptShortcuts: [
      {
        label: "Sharpen Thesis",
        badge: "Argument",
        prompt:
          "Strengthen the core thesis and opening hook, framing the central tension and analytical stakes with crystal clarity.",
      },
      {
        label: "Add Evidence Frame",
        badge: "Citation",
        prompt:
          "Expand this section with empirical framing, concrete case comparisons, and a > **Key Takeaway:** callout box.",
      },
      {
        label: "Steelman Counterargument",
        badge: "Dialectic",
        prompt:
          "Draft a rigorous counterargument section that steelmans the opposing view before systematically refuting it.",
      },
      {
        label: "Thematic Outline",
        badge: "Structure",
        prompt:
          "Generate a structured thematic outline with section headings, core arguments, and evidence anchors.",
      },
    ],
  },

  technical: {
    id: "technical",
    label: "Technical Manual",
    shortLabel: "Technical Manual",
    emoji: "⚙️",
    tagline: "Imperative voice, step-by-step procedures, prerequisites, callouts & code blocks",
    hexColor: "#10b981",
    badgeClass:
      "bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 shadow-[0_0_12px_rgba(16,185,129,0.2)]",
    activeTabClass:
      "bg-emerald-500/20 text-emerald-200 border-emerald-500/50 shadow-[0_0_18px_rgba(16,185,129,0.28)]",
    glowBorderClass: "border-emerald-500/25 hover:border-emerald-500/45",
    cardTintClass: "bg-amber-950/20 border-amber-500/30",
    progressBarClass: "from-emerald-500 to-amber-400",
    defaultTargetWords: 1800,
    placeholder:
      "Describe the system architecture, runbook procedure, API specification, or CLI workflow to document...",
    systemPrompt: `You are a Principal Staff Technical Writer and Systems Architect inside Typist Studio.
GENRE CALIBRATION: TECHNICAL MANUAL
Follow these strict craft directives on every response:
1. IMPERATIVE & INSTRUCTIVE VOICE: Use clear, direct, active imperative verbs ("Configure the daemon", "Verify the TLS handshake") with zero ambiguity.
2. PROCEDURAL STEP-BY-STEP FORMATTING: Organize workflows into numbered procedural steps, explicit **Prerequisites** checklists, and **Verification** steps.
3. CALLOUT BOXES & WARNINGS: Use Markdown blockquotes (> **WARNING:** ... or > **NOTE:** ...) to highlight breaking changes, security constraints, or operational pitfalls.
4. CODE & COMMAND BLOCKS: Include production-grade fenced code blocks (\`\`\`bash, \`\`\`typescript, \`\`\`yaml, etc.) with realistic flags, configuration keys, and expected output blocks.
5. HIERARCHICAL SECTIONS: Maintain strict semantic hierarchy (## Overview, ## Prerequisites, ## Step-by-Step Procedure, ## Verification & Troubleshooting).`,
    stylePresets: [
      {
        id: "sre-runbook",
        name: "Production SRE Runbook",
        description: "Prerequisites, CLI commands, rollback steps & safety warnings",
        modifier:
          "Format as an operational SRE runbook with explicit prerequisites, copy-pasteable shell commands, verification checks, and rollback procedures.",
      },
      {
        id: "api-architecture",
        name: "API & Architecture Spec",
        description: "System contracts, payload schemas, sequence flows & edge cases",
        modifier:
          "Focus on formal system architecture, typed request/response contracts, idempotency guarantees, and failure modes.",
      },
      {
        id: "developer-guide",
        name: "Step-by-Step Developer Guide",
        description: "Onboarding tutorial from zero to verified deployment",
        modifier:
          "Structure as a progressive developer implementation guide with clear code examples, inline explanations, and troubleshooting tips.",
      },
    ],
    promptShortcuts: [
      {
        label: "Generate Steps",
        badge: "Procedural",
        prompt:
          "Generate a complete procedural step-by-step section including Prerequisites, numbered execution steps, CLI code blocks, and a Verification check.",
      },
      {
        label: "Add Warning Callout",
        badge: "Safety",
        prompt:
          "Insert a critical > **WARNING:** callout box detailing operational edge cases, failure modes, and safe rollback commands.",
      },
      {
        label: "Code & Config Example",
        badge: "Snippet",
        prompt:
          "Add a production-ready code and configuration block with annotated parameters and expected terminal output.",
      },
      {
        label: "Troubleshooting Matrix",
        badge: "Diagnostics",
        prompt:
          "Create a structured Troubleshooting & Diagnostics section covering common error codes, root causes, and remediation commands.",
      },
    ],
  },
};

export interface OpenRouterModelOption {
  id: string;
  name: string;
  provider: string;
  badge: string;
  isFree?: boolean;
}

export const OPENROUTER_MODELS: OpenRouterModelOption[] = [
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    badge: "Flagship Prose",
  },
  {
    id: "meta-llama/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B Instruct",
    provider: "Meta",
    badge: "High Speed",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B (Free Tier)",
    provider: "Meta",
    badge: "Free Tier",
    isFree: true,
  },
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    badge: "Ultra Fast",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o Omni",
    provider: "OpenAI",
    badge: "Balanced",
  },
];
