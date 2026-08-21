import { NextRequest, NextResponse } from "next/server";
import { getBrain } from "@/lib/brain";

/**
 * POST /api/query
 * This is the "build your own tool on top of it" surface - any team
 * member can hit this from a Slack bot, CLI, or dashboard widget
 * without touching the retrieval code.
 *
 * Body: { "query": string, "top_k"?: number }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const query = (body.query || "").trim();
  const topK = Number(body.top_k) || 3;

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const brain = getBrain();
  const result = await brain.answer(query, topK);
  return NextResponse.json(result);
}
