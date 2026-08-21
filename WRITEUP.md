# Company Brain — Prototype Writeup

**KH Nazmul Ahamed** · Founder's Office role

## How I read the problem

Needletail's knowledge (GTM, Product, Engineering, G&A, ops) is scattered
across tools, docs, and people's heads. The real goal isn't "a chatbot" —
it's a single queryable layer that _any_ team member can build on top of,
so knowledge work doesn't bottleneck on whoever happens to remember where
something lives.

Building the full thing in 3 days isn't realistic, so I scoped down to
prove the core loop end-to-end rather than build one department's slice
in isolation: **ingest → retrieve → answer with citations → expose as an
API anyone can build on.** That loop is the hard part; more document
types and departments are just more data once it exists.

## Stack choice

I first built this in Python/Flask, then ported it to Next.js/TypeScript
after checking your site — you're running Next.js on Vercel. Matching
your stack means this isn't a throwaway demo; it's something that could
actually run in your infra with no rewrite, and any team member on a
Next.js-based team can extend it without context-switching languages.

## What I built

A working Next.js app, live at [your Vercel link]:

1. **Ingestion** — loads markdown docs, chunks by section (`lib/brain.ts`).
   I used 3 representative docs (Pricing/GTM, Ops/Escalation SOP,
   Product/Engineering) standing in for the real knowledge sources.
2. **Retrieval** — hybrid TF-IDF (word-level + character n-gram) with a
   keyword-overlap boost, implemented directly in TypeScript (no
   external vector DB or embedding API needed). Runs instantly, zero
   cost, good enough to prove the concept on a small corpus.
3. **Answering** — extractive by default (returns the most relevant
   chunk + source), no API key required. If `GROQ_API_KEY` (free) or
   `ANTHROPIC_API_KEY` is set, it switches to generative answers via an
   LLM, grounded strictly in retrieved context, with source citation.
   Same interface either way — the fallback means anyone can run this
   without setup friction.
4. **Interface** — a query UI (`/`) to ask and see cited sources, _and_
   a JSON API (`POST /api/query`) as the actual point of the exercise:
   any team member can hit this endpoint from a Slack bot, CLI, or
   internal dashboard without touching the retrieval code.

## What I deliberately left out

- **Real embeddings / vector DB** — TF-IDF is a fine stand-in for a demo
  but has a known weakness I hit while testing: short chunks can
  out-score longer, more relevant ones because similarity isn't
  length-normalized. Production version swaps in an embedding model
  - reranking — `lib/brain.ts` isolates retrieval specifically so this
    is a drop-in swap, not a rewrite.
- **Auth / permissions** — G&A and ops docs likely need access control
  Product/Eng docs don't. Not solved here, but the API-first design
  means an auth layer wraps around `/api/query` rather than being
  baked into retrieval.
- **Live data sources** (Notion, Slack, Google Docs) — started with
  static files to prove the loop; connecting real sources is an
  ingestion-layer problem, not an architecture change.

## If I had more time

1. Swap TF-IDF for real embeddings + reranking (fixes the short-chunk
   scoring issue above).
2. Add a lightweight ingestion connector (Google Drive or Notion API)
   so the corpus updates itself instead of static files.
3. Add per-source access control so the API can be safely exposed
   beyond a small trusted group.
4. Usage logging on `/api/query` — which questions get asked most is
   itself useful signal for what to document better.
5. Add graceful loading/error states to the UI for slower generative
   calls at higher document volumes.

## How to run it

```
npm install
npm run dev
```

Optional: set `GROQ_API_KEY` (free) or `ANTHROPIC_API_KEY` in
`.env.local` for generative (vs extractive) answers.
