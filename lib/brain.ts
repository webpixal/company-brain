/**
 * Company Brain - core engine (TypeScript port)
 *
 * Same design as the Python prototype: hybrid TF-IDF retrieval
 * (word-level + character n-gram + keyword-overlap boost), extractive
 * answers by default, generative via Claude if ANTHROPIC_API_KEY is set.
 *
 * Ported to Next.js/TypeScript to match Needletail's production stack
 * (Next.js on Vercel) rather than requiring a separate Python service.
 */
import fs from "fs";
import path from "path";

const DOCS_DIR = path.join(process.cwd(), "lib", "sample_docs");
const CHUNK_SIZE = 600;

export interface Chunk {
  source: string;
  title: string;
  text: string;
}

export interface RetrievedChunk extends Chunk {
  score: number;
}

export interface AnswerResult {
  query: string;
  answer: string;
  sources: { source: string; title: string; score: number }[];
}

function loadAndChunkDocs(docsDir: string = DOCS_DIR): Chunk[] {
  const chunks: Chunk[] = [];
  const files = fs
    .readdirSync(docsDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  for (const file of files) {
    const text = fs.readFileSync(path.join(docsDir, file), "utf-8");
    const sections = text.split(/\n(?=##? )/);

    for (const rawSection of sections) {
      const section = rawSection.trim();
      if (!section) continue;

      for (let i = 0; i < section.length; i += CHUNK_SIZE) {
        const piece = section.slice(i, i + CHUNK_SIZE).trim();
        if (!piece) continue;
        const firstLine = piece.split("\n")[0];
        const headerMatch = firstLine.match(/^#+\s*(.+)/);
        const title = headerMatch ? headerMatch[1] : "General";
        chunks.push({ source: file, title, text: piece });
      }
    }
  }
  return chunks;
}

function tokenizeWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z]{3,}/g) || []).filter(
    (w) => !STOP_WORDS.has(w)
  );
}

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "has",
  "have", "with", "this", "that", "from", "will", "your", "our",
]);

function charNGrams(text: string, n = [3, 4, 5]): string[] {
  const clean = text.toLowerCase().replace(/\s+/g, " ").trim();
  const grams: string[] = [];
  for (const size of n) {
    for (let i = 0; i <= clean.length - size; i++) {
      grams.push(clean.slice(i, i + size));
    }
  }
  return grams;
}

// Minimal TF-IDF: build vocab + idf from a corpus of token lists,
// return a term -> weight map per document for cosine similarity.
class TfIdfIndex {
  private idf = new Map<string, number>();
  private docVectors: Map<string, number>[] = [];

  constructor(tokenizedDocs: string[][]) {
    const df = new Map<string, number>();
    for (const tokens of tokenizedDocs) {
      const seen = new Set(tokens);
      for (const t of seen) df.set(t, (df.get(t) || 0) + 1);
    }
    const N = tokenizedDocs.length;
    for (const [term, count] of df.entries()) {
      this.idf.set(term, Math.log((1 + N) / (1 + count)) + 1);
    }
    for (const tokens of tokenizedDocs) {
      this.docVectors.push(this.vectorize(tokens));
    }
  }

  private vectorize(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    const vec = new Map<string, number>();
    for (const [term, count] of tf.entries()) {
      const idf = this.idf.get(term) ?? Math.log(2);
      // sublinear TF, matches sklearn's sublinear_tf=True
      vec.set(term, (1 + Math.log(count)) * idf);
    }
    return vec;
  }

  private cosine(a: Map<string, number>, b: Map<string, number>): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (const v of a.values()) normA += v * v;
    for (const v of b.values()) normB += v * v;
    const [small, large] = a.size < b.size ? [a, b] : [b, a];
    for (const [k, v] of small.entries()) {
      const other = large.get(k);
      if (other) dot += v * other;
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  similarities(queryTokens: string[]): number[] {
    const qVec = this.vectorize(queryTokens);
    return this.docVectors.map((docVec) => this.cosine(qVec, docVec));
  }
}

export class CompanyBrain {
  private chunks: Chunk[];
  private wordIndex: TfIdfIndex;
  private charIndex: TfIdfIndex;

  constructor(docsDir: string = DOCS_DIR) {
    this.chunks = loadAndChunkDocs(docsDir);
    const wordTokenized = this.chunks.map((c) => tokenizeWords(c.text));
    const charTokenized = this.chunks.map((c) => charNGrams(c.text));
    this.wordIndex = new TfIdfIndex(wordTokenized);
    this.charIndex = new TfIdfIndex(charTokenized);
  }

  get chunkCount() {
    return this.chunks.length;
  }

  retrieve(query: string, topK = 3): RetrievedChunk[] {
    const qWords = tokenizeWords(query);
    const qChars = charNGrams(query);

    const wordSims = this.wordIndex.similarities(qWords);
    const charSims = this.charIndex.similarities(qChars);

    const qWordSet = new Set(qWords);
    const boost = this.chunks.map((c) => {
      const tWords = new Set(tokenizeWords(c.text));
      let overlap = 0;
      for (const w of qWordSet) if (tWords.has(w)) overlap++;
      return overlap / Math.max(qWordSet.size, 1);
    });

    const scored = this.chunks.map((chunk, i) => ({
      ...chunk,
      score: 0.45 * wordSims[i] + 0.25 * charSims[i] + 0.3 * boost[i],
    }));

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async answer(query: string, topK = 3): Promise<AnswerResult> {
    const results = this.retrieve(query, topK);

    if (results.length === 0) {
      return {
        query,
        answer: "No relevant information found in the knowledge base for this query.",
        sources: [],
      };
    }

    // Provider priority: Groq (free) -> Anthropic (paid) -> extractive fallback.
    // Groq checked first since it's the free option - if a GROQ_API_KEY
    // is present, use it and skip Anthropic entirely (no cost).
    const groqKey = process.env.GROQ_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    let answerText: string;

    if (groqKey) {
      answerText = await this.generateWithGroq(query, results, groqKey);
    } else if (anthropicKey) {
      answerText = await this.generateWithClaude(query, results, anthropicKey);
    } else {
      const top = results[0];
      answerText = `[Extractive mode — set GROQ_API_KEY (free) or ANTHROPIC_API_KEY for generative answers]\n\nBased on '${top.title}' (${top.source}):\n${top.text}`;
    }

    return {
      query,
      answer: answerText,
      sources: results.map((r) => ({
        source: r.source,
        title: r.title,
        score: Math.round(r.score * 1000) / 1000,
      })),
    };
  }

  private buildPrompt(query: string, results: RetrievedChunk[]): string {
    const context = results
      .map((r) => `[Source: ${r.source} - ${r.title}]\n${r.text}`)
      .join("\n\n---\n\n");
    return `You are the Needletail Company Brain, an internal knowledge assistant. Answer the question using ONLY the context below. Cite which source you used. If the context doesn't fully answer it, say what's missing.\n\nContext:\n${context}\n\nQuestion: ${query}`;
  }

  /**
   * Free provider. Groq's free tier needs no card and has generous
   * rate limits for a demo like this. OpenAI-compatible API shape.
   * Get a key at https://console.groq.com/keys
   * Model: openai/gpt-oss-120b (Groq deprecated the old llama-3.3-70b-versatile
   * alias in June 2026 - see console.groq.com/docs/models for the current list).
   */
  private async generateWithGroq(
    query: string,
    results: RetrievedChunk[],
    apiKey: string
  ): Promise<string> {
    const prompt = this.buildPrompt(query, results);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          max_tokens: 400,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error?.message || JSON.stringify(data);
        console.error("Groq API error:", res.status, msg);
        return `[Groq API error ${res.status}: ${msg}]\n\nFalling back to top match:\n${results[0].text}`;
      }

      const text = data?.choices?.[0]?.message?.content || "";
      if (!text.trim()) {
        console.error("Groq API returned empty content:", JSON.stringify(data));
        return `[Groq API returned an empty response]\n\nFalling back to top match:\n${results[0].text}`;
      }
      return text;
    } catch (err) {
      console.error("Groq API request failed:", err);
      return `[Groq API request failed: ${String(err)}]\n\nFalling back to top match:\n${results[0].text}`;
    }
  }

  private async generateWithClaude(
    query: string,
    results: RetrievedChunk[],
    apiKey: string
  ): Promise<string> {
    const prompt = this.buildPrompt(query, results);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 400,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Surface the real error instead of silently returning "".
        // Common causes: invalid/expired key, wrong model name, no credits.
        const msg = data?.error?.message || JSON.stringify(data);
        console.error("Claude API error:", res.status, msg);
        return `[Claude API error ${res.status}: ${msg}]\n\nFalling back to top match:\n${results[0].text}`;
      }

      const text = (data.content || [])
        .map((b: { text?: string }) => b.text || "")
        .join("");

      if (!text.trim()) {
        console.error("Claude API returned empty content:", JSON.stringify(data));
        return `[Claude API returned an empty response]\n\nFalling back to top match:\n${results[0].text}`;
      }

      return text;
    } catch (err) {
      console.error("Claude API request failed:", err);
      return `[Claude API request failed: ${String(err)}]\n\nFalling back to top match:\n${results[0].text}`;
    }
  }
}

let brainInstance: CompanyBrain | null = null;
export function getBrain(): CompanyBrain {
  if (!brainInstance) brainInstance = new CompanyBrain();
  return brainInstance;
}
