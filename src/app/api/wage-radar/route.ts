import { NextResponse } from "next/server";
import { getArtifacts } from "@/lib/data.server";

export async function GET() {
  const { wageRadar } = getArtifacts();
  return NextResponse.json(wageRadar, {
    headers: { "cache-control": "public, max-age=300, s-maxage=300" },
  });
}
