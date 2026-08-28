import { type NextRequest, NextResponse } from "next/server";
import { getOccupation } from "@/lib/data.server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const occ = getOccupation(code);
  if (!occ) {
    return NextResponse.json({ error: "occupation not found" }, { status: 404 });
  }
  return NextResponse.json(occ, {
    headers: { "cache-control": "public, max-age=300, s-maxage=300" },
  });
}
