// HTTP server. Bun.serve, zero deps. Endpoints:
//   GET /api/occupations            -> list with wage + risk
//   GET /api/occupations/:code      -> single + centrality + underpayment
//   GET /api/recommend?source=...   -> top-N recommendations
//   GET /api/wage-radar             -> centrality vs wage table
//   GET /                           -> static web/

import { join, normalize, resolve } from "node:path";
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

async function getArtifacts(): Promise<PipelineArtifacts> {
  if (cached === null) {
    cached = await loadArtifacts(ARTIFACTS_PATH);
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

function buildOccupationSummaries(artifacts: PipelineArtifacts) {
  return Object.keys(artifacts.wage_data).map((code) => {
    const w = artifacts.wage_data[code]?.median ?? 0;
    const risk = artifacts.risk_scores[code] ?? 0;
    const degree = artifacts.centrality.degree[code] ?? 0;
    const between = artifacts.centrality.betweenness[code] ?? 0;
    const radar = computeWageRadar(artifacts).find((r) => r.occ === code);
    return {
      code,
      label: code,
      wage_median: w,
      risk,
      degree_centrality: degree,
      betweenness_centrality: between,
      underpayment_gap: radar?.gap_ratio ?? 0,
      predicted_wage: radar ? radar.centrality * 0 + w / (1 - (radar.gap_ratio ?? 0)) : w,
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
      const artifacts = await getArtifacts();
      return json(buildOccupationSummaries(artifacts));
    }
    if (path.startsWith("/api/occupations/")) {
      const code = decodeURIComponent(path.slice("/api/occupations/".length));
      const artifacts = await getArtifacts();
      const summary = buildOccupationSummaries(artifacts).find((o) => o.code === code);
      if (!summary) return notFound(`unknown occupation: ${code}`);
      return json(summary);
    }
    if (path === "/api/recommend") {
      const source = url.searchParams.get("source");
      if (!source) return notFound("missing source param");
      const topN = Number(url.searchParams.get("topN") ?? "5");
      const artifacts = await getArtifacts();
      const recs = recommend(artifacts, source, { topN });
      return json({ source, recommendations: recs });
    }
    if (path === "/api/wage-radar") {
      const artifacts = await getArtifacts();
      return json(computeWageRadar(artifacts));
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
      const safe = normalize(join(WEB_ROOT, "src", tail));
      if (!safe.startsWith(WEB_ROOT)) return notFound("forbidden");
      const file = Bun.file(safe);
      if (await file.exists()) {
        const ct = safe.endsWith(".css")
          ? "text/css"
          : safe.endsWith(".ts") || safe.endsWith(".js")
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
