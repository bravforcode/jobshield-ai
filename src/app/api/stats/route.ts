import { NextResponse } from "next/server";
import { getArtifacts } from "@/lib/data.server";

export async function GET() {
  const { stats } = getArtifacts();
  return NextResponse.json(stats, {
    headers: { "cache-control": "public, max-age=300, s-maxage=300" },
  });
}
