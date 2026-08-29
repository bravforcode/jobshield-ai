import { type NextRequest, NextResponse } from "next/server";
import { getArtifacts, getRecommendations } from "@/lib/data.server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/recommend?source=occ.xxx&topN=5
 * topN is clamped 1..50 (default 5). Rate-limited 60/min per IP.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "retry-after": String(rl.retryAfter ?? 60) } },
    );
  }
  const url = new URL(req.url);
  const source = url.searchParams.get("source") ?? "";
  const topNParam = url.searchParams.get("topN");
  const topN = topNParam ? Math.max(1, Math.min(50, parseInt(topNParam, 10))) : 5;

  if (!source || source.length > 64) {
    return NextResponse.json({ error: "missing or invalid source" }, { status: 400 });
  }

  const { occupations } = getArtifacts();
  if (!occupations.find((o) => o.code === source)) {
    return NextResponse.json({ error: "unknown source occupation" }, { status: 404 });
  }

  const recommendations = getRecommendations(source, topN);
  return NextResponse.json(
    { source, recommendations },
    { headers: { "cache-control": "public, max-age=60, s-maxage=60" } },
  );
}
