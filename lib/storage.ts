import { DocumentGenre, GENRE_ENGINE, OPENROUTER_MODELS } from "./genres";

export interface GenerationHistoryEntry {
  id: string;
  timestamp: string;
  prompt: string;
  genre: DocumentGenre;
  model: string;
  outputMarkdown: string;
  wordCount: number;
}

export interface StudioDocument {
  id: string;
  title: string;
  genre: DocumentGenre;
  stylePreset: string;
  content: string; // Rich HTML for TipTap
  targetWords: number;
  wordCount: number;
  updatedAt: string;
  createdAt: string;
  outlineNotes: string;
  customSystemPrompt?: string;
  history: GenerationHistoryEntry[];
  initialPrompt?: string;
}

export interface StudioSettings {
  openRouterApiKey: string;
  selectedModel: string;
  temperature: number;
  autoSave: boolean;
}

const DOCS_STORAGE_KEY = "type_ai_studio_docs_v1";
const SETTINGS_STORAGE_KEY = "type_ai_studio_settings_v1";

export function countWordsFromHtml(html: string): number {
  if (!html) return 0;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(" ").length;
}

export const INITIAL_SAMPLE_DOCS: StudioDocument[] = [
  {
    id: "chronicles-of-ash-harbor",
    title: "The Glass Cartographer of Ash Harbor",
    genre: "fiction",
    stylePreset: "cinematic-noir",
    targetWords: 2500,
    wordCount: 318,
    createdAt: "2026-10-24T14:20:00.000Z",
    updatedAt: "2026-10-26T05:15:00.000Z",
    outlineNotes: `### Act I Beat Sheet
- **Scene 1**: Kaelen calibrates the refraction lens inside the flooded bell tower as the phosphor tide rises.
- **Scene 2**: Inspector Vance arrives carrying a sealed brass cylinder bearing the Magistrate's wax sigil.
- **Scene 3**: Discovery that the northern archipelago has been erased from the imperial sea charts—and from the crew's memory.

### Sensory Palette
- Sodium-vapor fog, salt-crusted brass gears, ozone before a magnetic storm, cold whale-oil lanterns.`,
    history: [],
    content: `<h1>Chapter I: The Refraction at Low Tide</h1>
<p>Sodium fog clung to the iron ribs of the old breakwater, turning the harbor lanterns into bruised halos of amber light. Inside the flooded belfry of Saint Jude’s, Kaelen Voss adjusted the micrometer screw on her astrolabe until the mercury horizon steadied.</p>
<blockquote><p>"Every map is a confession of what the cartographer feared to leave blank." — <em>Archival Marginalia, Third Fleet Survey</em></p></blockquote>
<p>Three stories below, the tide slapped against the submerged choir stalls with a hollow, metallic rhythm. Kaelen dipped her dividers into the dish of phosphor ink. On the vellum spread across her drafting table, the strait of Oakhaven should have measured fourteen leagues wide. Tonight, the triangulation mirrors insisted it was seventeen.</p>
<h2>The Brass Cylinder</h2>
<p>The stairwell door grated open against rusted hinges. Boots—heavy,釘-shod naval issue—Paused on the landing before ascending.</p>
<p>"You're working without a shuttered lamp, Voss," Inspector Vance said, stepping into the pool of amber light. Rainwater sluiced from the collar of his oilskin coat onto the flagstones. "The Admiralty patrols have arrested three lens-grinders since sundown."</p>
<p>Kaelen didn't look up from her vernier scale. "Let them arrest the tide, then. It's three leagues out of alignment with the Royal Almanac."</p>
<p>Vance reached inside his coat and set a tarnished brass cylinder directly over the northern quadrant of her chart. The wax seal had been cracked—and resealed with a hot coin.</p>`,
  },
  {
    id: "sovereign-compute-essay",
    title: "The Architecture of Epistemic Autonomy in Post-Scale AI",
    genre: "nonfiction",
    stylePreset: "analytical-essay",
    targetWords: 2000,
    wordCount: 286,
    createdAt: "2026-10-23T09:10:00.000Z",
    updatedAt: "2026-10-25T21:40:00.000Z",
    outlineNotes: `### Thesis Architecture
1. **Primary Claim**: The bottleneck in cognitive tooling has shifted from raw parameter scaling to context-curated human-model symbiosis.
2. **Historical Parallel**: Moveable type did not merely accelerate scribing; it reorganized the taxonomy of argument (headings, indices, citations).
3. **Empirical Anchors**: Latency-sensitive editing studios, domain-calibrated system prompting, and local-first verification loops.`,
    history: [],
    content: `<h1>The Architecture of Epistemic Autonomy</h1>
<p>For the past decade, the prevailing orthodoxy in machine intelligence treated cognition as an industrial extraction problem: ingest a larger corpus, allocate denser compute clusters, and assume that domain mastery will emerge as an inevitable byproduct of scale. Yet when practitioners deploy foundation models inside high-stakes creative and analytical workflows, a subtler structural bottleneck appears.</p>
<blockquote><p><strong>Key Insight:</strong> Raw generative fluency without genre and structural calibration produces statistical average prose—smoothing away the very friction where original thought resides.</p></blockquote>
<h2>I. From Monolithic Prompts to Calibrated Studios</h2>
<p>Every discipline enforces an implicit epistemic contract. A novelist negotiates subtext, sensory pacing, and dramatic irony; an investigative essayist constructs causal chains anchored in verifiable evidence; a systems architect writes in deterministic, imperative procedures where ambiguity can trigger cascading downtime.</p>
<ul>
<li><strong>Contextual Grounding:</strong> Models perform dramatically better when constrained by explicit structural invariants rather than open-ended chat instructions.</li>
<li><strong>Iterative Co-Authorship:</strong> High-leverage writing tools preserve human agency over document topology while offloading draft synthesis and structural transformation.</li>
<li><strong>Verifiable Provenance:</strong> Separating exploratory ideation in a co-writer pane from canonical prose in the manuscript canvas prevents unintentional drift.</li>
</ul>`,
  },
  {
    id: "zero-downtime-raft-runbook",
    title: "Zero-Downtime Raft Consensus Quorum Migration Runbook",
    genre: "technical",
    stylePreset: "sre-runbook",
    targetWords: 1800,
    wordCount: 294,
    createdAt: "2026-10-22T18:00:00.000Z",
    updatedAt: "2026-10-26T02:12:00.000Z",
    outlineNotes: `### Runbook Checklist
- [x] Document pre-flight quorum health assertions
- [x] Add non-voting learner promotion sequence
- [ ] Add automated rollback script if replication lag > 150ms
- [ ] Verify mTLS certificate rotation step`,
    history: [],
    content: `<h1>Zero-Downtime Raft Consensus Quorum Migration</h1>
<p>This manual specifies the deterministic procedure for migrating a 5-node production Raft consensus cluster across availability zones without dropping active write transactions or violating linearizable read guarantees.</p>
<blockquote><p><strong>WARNING:</strong> Never remove an active voter node before confirming that the replacement non-voting learner has reached replication parity (<code>commit_index_lag == 0</code>). Violating this invariant risks split-brain election stalls during network partitions.</p></blockquote>
<h2>1. Prerequisites & Pre-Flight Verification</h2>
<p>Before initiating membership changes, verify that all existing quorum members report healthy heartbeats and sub-15ms disk WAL fsync latency:</p>
<pre><code># Verify cluster quorum health and current leader epoch
raftctl --endpoints=https://10.24.0.10:2379,https://10.24.0.11:2379 \\
  --cacert=/etc/raft/pki/ca.crt \\
  endpoint status --write-out=table</code></pre>
<h2>2. Step-by-Step Learner Promotion Procedure</h2>
<ol>
<li><strong>Provision Target Node as Non-Voting Learner:</strong> Join the new instance into the cluster topology without expanding the voting quorum size.</li>
<li><strong>Monitor Snapshot Streaming:</strong> Wait until the learner completes state machine snapshot ingestion and tails the live write-ahead log.</li>
<li><strong>Promote Learner to Full Voter:</strong> Execute atomic membership promotion once replication lag stabilizes below <code>5ms</code>.</li>
</ol>
<pre><code># Step 1: Add node-06 as a non-voting learner
raftctl member add raft-node-06 \\
  --peer-urls=https://10.24.1.42:2380 \\
  --learner=true

# Step 3: Promote learner to voting member after WAL catchup
raftctl member promote 8e9e05c52164694d</code></pre>`,
  },
];

export function getDocuments(): StudioDocument[] {
  if (typeof window === "undefined") return INITIAL_SAMPLE_DOCS;
  try {
    const raw = window.localStorage.getItem(DOCS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(
        DOCS_STORAGE_KEY,
        JSON.stringify(INITIAL_SAMPLE_DOCS)
      );
      return INITIAL_SAMPLE_DOCS;
    }
    const parsed = JSON.parse(raw) as StudioDocument[];
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : INITIAL_SAMPLE_DOCS;
  } catch {
    return INITIAL_SAMPLE_DOCS;
  }
}

export function getDocumentById(id: string): StudioDocument | undefined {
  const docs = getDocuments();
  return docs.find((d) => d.id === id);
}

export function saveDocument(doc: StudioDocument): StudioDocument {
  if (typeof window === "undefined") return doc;
  const docs = getDocuments();
  const updatedDoc: StudioDocument = {
    ...doc,
    wordCount: countWordsFromHtml(doc.content),
    updatedAt: new Date().toISOString(),
  };
  const idx = docs.findIndex((d) => d.id === doc.id);
  if (idx >= 0) {
    docs[idx] = updatedDoc;
  } else {
    docs.unshift(updatedDoc);
  }
  window.localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(docs));
  return updatedDoc;
}

export function createNewDocument(params: {
  title?: string;
  genre: DocumentGenre;
  stylePreset?: string;
  initialPrompt?: string;
  initialContent?: string;
}): StudioDocument {
  const genreConfig = GENRE_ENGINE[params.genre];
  const id = `doc-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .substring(2, 6)}`;

  const defaultTitle =
    params.title?.trim() ||
    (params.initialPrompt
      ? params.initialPrompt
          .slice(0, 56)
          .replace(/[^\w\s-]/g, "")
          .trim() || `Untitled ${genreConfig.label}`
      : `Untitled ${genreConfig.label}`);

  const initialHtml =
    params.initialContent ||
    `<h1>${defaultTitle}</h1><p></p>`;

  const newDoc: StudioDocument = {
    id,
    title: defaultTitle,
    genre: params.genre,
    stylePreset: params.stylePreset || genreConfig.stylePresets[0].id,
    content: initialHtml,
    targetWords: genreConfig.defaultTargetWords,
    wordCount: countWordsFromHtml(initialHtml),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    outlineNotes: `### ${genreConfig.label} Workspace Notes\n- **Genre Calibration**: ${genreConfig.tagline}\n- **Initial Concept**: ${
      params.initialPrompt || "Open draft canvas"
    }`,
    history: [],
    initialPrompt: params.initialPrompt,
  };

  return saveDocument(newDoc);
}

export function deleteDocument(id: string): StudioDocument[] {
  if (typeof window === "undefined") return INITIAL_SAMPLE_DOCS;
  const docs = getDocuments().filter((d) => d.id !== id);
  window.localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(docs));
  return docs;
}

export function getStudioSettings(): StudioSettings {
  const defaults: StudioSettings = {
    openRouterApiKey: "",
    selectedModel: OPENROUTER_MODELS[0].id,
    temperature: 0.7,
    autoSave: true,
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export function saveStudioSettings(
  partial: Partial<StudioSettings>
): StudioSettings {
  const current = getStudioSettings();
  const next = { ...current, ...partial };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}
