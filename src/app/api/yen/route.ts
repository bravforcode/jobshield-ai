import { type NextRequest, NextResponse } from "next/server";
import { getArtifacts } from "@/lib/data.server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Lightweight Yen K=3 via data.artifacts precomputation: we expose top-N already,
// but Yen requires path diversity. For now we return the same ranked list sliced to k
// and document that full K-loopless path enumeration is Python-side (py/src/jobshield/path/yen.py).
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
  const target = url.searchParams.get("target") ?? "";
  const kParam = url.searchParams.get("k");
  const k = kParam ? Math.max(1, Math.min(5, parseInt(kParam, 10))) : 3;

  if (!source || source.length > 64)
    return NextResponse.json({ error: "missing source" }, { status: 400 });
  const { occupations, recommendations } = getArtifacts();
  if (!occupations.find((o) => o.code === source))
    return NextResponse.json({ error: "unknown source" }, { status: 404 });

  const recs = recommendations[source] ?? [];
  // If target specified, filter to that target and synthesize k variants by repeating path (placeholder for full Yen)
  let list = recs;
  if (target) {
    list = recs.filter((r) => r.target === target);
    if (list.length === 0)
      return NextResponse.json({ error: "unknown target for source" }, { status: 404 });
  }
  const sliced = list.slice(0, k).map((r, i) => ({ ...r, yen_rank: i + 1, k }));
  return NextResponse.json(
    { source, target: target || null, k, paths: sliced },
    { headers: { "cache-control": "public, max-age=60" } },
  );
}
