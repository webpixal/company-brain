# Company Brain — Needletail Prototype (Next.js)

A knowledge-base prototype: ask a question, get an answer grounded in
internal docs with source citations. Built on Next.js/TypeScript to
match Needletail's production stack (Next.js on Vercel).

**Live demo:** https://company-brain-hazel-xi.vercel.app/

## Run locally

Open http://localhost:3000

Optional: copy `.env.example` to `.env.local` and set `GROQ_API_KEY`
(free) or `ANTHROPIC_API_KEY` for generative (vs extractive) answers.

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

Standard Next.js app — already deployed to Vercel with zero config
changes required. Push to `main` and Vercel handles the rest.
