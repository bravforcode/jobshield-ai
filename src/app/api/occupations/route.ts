import { NextResponse } from "next/server";
import { getArtifacts } from "@/lib/data.server";

export async function GET() {
  const { occupations } = getArtifacts();
  return NextResponse.json(occupations, {
    headers: { "cache-control": "public, max-age=300, s-maxage=300" },
  });
}
