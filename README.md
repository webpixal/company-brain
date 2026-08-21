# Company Brain — Needletail Prototype (Next.js)

A knowledge-base prototype: ask a question, get an answer grounded in
internal docs with source citations. Built on Next.js/TypeScript to
match Needletail's production stack (Next.js on Vercel).

## Run locally
```
npm install
npm run dev
```
Open http://localhost:3000

Optional: copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY`
for generative (vs extractive) answers.

## Structure
- `lib/brain.ts` — retrieval engine (hybrid TF-IDF + keyword boost) and
  answer generation, isolated from the API/UI layer so retrieval can be
  swapped for a real embedding model without touching either.
- `lib/sample_docs/` — 3 representative docs standing in for the real
  knowledge sources (GTM/Pricing, Ops/Escalation, Product/Engineering).
- `app/api/query/route.ts` — `POST /api/query` — the "build your own
  tool on top of it" surface any team member can call directly.
- `app/api/health/route.ts` — health check.
- `app/page.tsx` — query UI.

See `WRITEUP.md` for the approach writeup.

## Deploy
This is a standard Next.js app — deploys to Vercel with no config changes.
