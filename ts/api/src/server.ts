// HTTP server. Bun.serve, zero deps. Endpoints:
//   GET /api/occupations            -> list with wage + risk
//   GET /api/occupations/:code      -> single + centrality + underpayment
//   GET /api/recommend?source=...   -> top-N recommendations
//   GET /api/wage-radar             -> centrality vs wage table
//   GET /                           -> static web/

import { join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { PipelineArtifacts } from "@jobshield/shared/contracts";
import { ArtifactsLoadError, loadArtifacts } from "./artifacts";
import { computeWageRadar } from "./radar";
import { recommend } from "./recommend";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../");
const ARTIFACTS_PATH = process.env.JOBSHIELD_ARTIFACTS ?? join(REPO_ROOT, "data/artifacts.json");
const WEB_ROOT = process.env.JOBSHIELD_WEB_ROOT ?? resolve(REPO_ROOT, "ts/web");
const PORT = Number(process.env.PORT ?? 3000);

let cached: PipelineArtifacts | null = null;
let cachedRadar: ReturnType<typeof computeWageRadar> | null = null;

async function getArtifacts(): Promise<PipelineArtifacts> {
  if (cached === null) {
    cached = await loadArtifacts(ARTIFACTS_PATH);
    cachedRadar = computeWageRadar(cached);
  }
  return cached;
}

function getRadarRows(): ReturnType<typeof computeWageRadar> {
  if (cachedRadar === null || cached === null) {
    // Defensive: should be set by getArtifacts() which must be called first.
    throw new Error("getRadarRows called before getArtifacts");
  }
  return cachedRadar;
}

function getCached(): PipelineArtifacts {
  if (cached === null) {
    throw new Error("getCached called before getArtifacts");
  }
  return cached;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
}

function notFound(message: string): Response {
  return json({ error: message }, 404);
}

function buildOccupationSummaries(
  artifacts: PipelineArtifacts,
  radarRows: ReturnType<typeof computeWageRadar>,
) {
  return Object.keys(artifacts.wage_data).map((code) => {
    const w = artifacts.wage_data[code]?.median ?? 0;
    const risk = artifacts.risk_scores[code] ?? 0;
    const degree = artifacts.centrality.degree[code] ?? 0;
    const between = artifacts.centrality.betweenness[code] ?? 0;
    const radar = radarRows.find((r) => r.occ === code);
    return {
      code,
      label: code,
      wage_median: w,
      risk,
      degree_centrality: degree,
      betweenness_centrality: between,
      underpayment_gap: radar?.gap_ratio ?? 0,
      // gap_ratio = (predicted - actual) / predicted => predicted = actual / (1 - gap).
      // For overpaid (negative gap), the formula still yields a finite number.
      predicted_wage: radar ? w / (1 - (radar.gap_ratio ?? 0)) : w,
      actual_wage: w,
    };
  });
}

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // CORS preflight.
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, OPTIONS",
        "access-control-allow-headers": "*",
      },
    });
  }

  try {
    if (path === "/api/occupations") {
      await getArtifacts();
      return json(buildOccupationSummaries(getCached(), getRadarRows()));
    }
    if (path.startsWith("/api/occupations/")) {
      const code = decodeURIComponent(path.slice("/api/occupations/".length));
      await getArtifacts();
      const summary = buildOccupationSummaries(getCached(), getRadarRows()).find(
        (o) => o.code === code,
      );
      if (!summary) return notFound(`unknown occupation: ${code}`);
      return json(summary);
    }
    if (path === "/api/recommend") {
      const source = url.searchParams.get("source");
      if (!source) return notFound("missing source param");
      const topNParam = url.searchParams.get("topN") ?? "5";
      const topN = Number(topNParam);
      if (!Number.isFinite(topN) || topN < 1 || topN > 50) {
        return notFound(`invalid topN: ${topNParam} (must be integer 1..50)`);
      }
      const artifacts = await getArtifacts();
      if (!artifacts.wage_data[source]) {
        return notFound(`unknown source: ${source}`);
      }
      const recs = recommend(artifacts, source, { topN });
      return json({ source, recommendations: recs });
    }
    if (path === "/api/wage-radar") {
      await getArtifacts();
      return json(getRadarRows());
    }
    if (path === "/api/health") {
      return json({ ok: true, artifacts_path: ARTIFACTS_PATH });
    }
    // Static web assets (best-effort).
    // HTML index is at ts/web/index.html; CSS/TS are at ts/web/src/*.
    if (path === "/" || path === "/index.html") {
      const file = Bun.file(join(WEB_ROOT, "index.html"));
      if (await file.exists()) {
        return new Response(file, { headers: { "content-type": "text/html" } });
      }
    }
    if (path.startsWith("/web/")) {
      const tail = path.slice("/web/".length);
      // /web/main.ts -> src/main.ts; /web/styles.css -> src/styles.css.
      const candidate = normalize(join(WEB_ROOT, "src", tail));
      // Use path.relative + startsWith('..') check to defeat "../.." escapes.
      // startsWith(WEB_ROOT) alone is unsafe (prefix match — /jobsume/web-evil/
      // would pass).
      const rel = relative(WEB_ROOT, candidate);
      if (rel.startsWith("..") || rel.startsWith(sep) || rel === "..") {
        return notFound("forbidden");
      }
      const file = Bun.file(candidate);
      if (await file.exists()) {
        const ct = candidate.endsWith(".css")
          ? "text/css"
          : candidate.endsWith(".ts") || candidate.endsWith(".js")
            ? "application/javascript"
            : "application/octet-stream";
        return new Response(file, { headers: { "content-type": ct } });
      }
    }
    return notFound(`unknown route: ${path}`);
  } catch (err) {
    if (err instanceof ArtifactsLoadError) {
      return json({ error: err.message }, 500);
    }
    return json({ error: (err as Error).message }, 500);
  }
}
