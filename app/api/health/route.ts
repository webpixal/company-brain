import { NextResponse } from "next/server";
import { getBrain } from "@/lib/brain";

export async function GET() {
  const brain = getBrain();
  return NextResponse.json({ status: "ok", chunks_loaded: brain.chunkCount });
}
