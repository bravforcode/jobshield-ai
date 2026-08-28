// HTTP server. Bun.serve, zero deps. Endpoints:
//   GET /api/occupations            -> list with wage + risk
//   GET /api/occupations/:code      -> single + centrality + underpayment
//   GET /api/recommend?source=...   -> top-N recommendations
//   GET /api/wage-radar             -> centrality vs wage table
//   GET /                           -> static web/

import { join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { PipelineArtifacts } from "../../shared/src/contracts.js";
import { ArtifactsLoadError, loadArtifacts } from "./artifacts.js";
import { computeWageRadar } from "./radar.js";
import { charge as rateLimitCharge, clientKey as rateLimitKey } from "./rate_limit.js";
import { recommend } from "./recommend.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = process.cwd();
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

function tooManyRequests(resetMs: number): Response {
  return new Response(JSON.stringify({ error: "rate limit exceeded" }), {
    status: 429,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "retry-after": String(Math.ceil(resetMs / 1000)),
    },
  });
}

async function serveStaticFile(candidate: string, contentType: string): Promise<Response | null> {
  // Try Bun.file first (local dev), fallback to Node fs (Vercel).
  const bunFile = (globalThis as unknown as { Bun?: { file: (p: string) => { exists: () => Promise<boolean> } } }).Bun?.file(candidate);
  if (bunFile) {
    if (await bunFile.exists()) {
      const file = (globalThis as unknown as { Bun: { file: (p: string) => Blob } }).Bun.file(candidate);
      return new Response(file as unknown as BodyInit, { headers: { "content-type": contentType } });
    }
    return null;
  }
  // Node fallback (Vercel)
  const { readFile, access } = await import("node:fs/promises");
  try {
    await access(candidate);
    const buf = await readFile(candidate);
    return new Response(buf as unknown as BodyInit, { headers: { "content-type": contentType } });
  } catch {
    return null;
  }
}

const SOURCE_CODE_MAX = 64; // arbitrary; longest known occ code is 26 chars.
const PATH_CODE_MAX = 256; // /api/occupations/<code> — same cap as source.

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

  // Per-client rate limit. Applied before any work so a flooding client
  // can't waste CPU on /api/recommend's Dijkstra.
  const rl = rateLimitCharge(rateLimitKey(req));
  if (!rl.ok) {
    return tooManyRequests(rl.resetMs);
  }

  try {
    if (path === "/api/occupations") {
      await getArtifacts();
      return json(buildOccupationSummaries(getCached(), getRadarRows()));
    }
    if (path.startsWith("/api/occupations/")) {
      const code = decodeURIComponent(path.slice("/api/occupations/".length));
      if (code.length > PATH_CODE_MAX) return notFound("code too long");
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
      if (source.length > SOURCE_CODE_MAX) return notFound("source too long");
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
    if (path === "/api/stats") {
      await getArtifacts();
      // Skill count: distinct skill_graph nodes. Edge count: undirected
      // pairs (transition_graph.edges has 2 entries per pair).
      const a = getCached();
      const skills = a.skill_graph.nodes.length;
      const undirected = a.transition_graph.edges.length / 2;
      return json({
        occupations: Object.keys(a.wage_data).length,
        skills,
        edges: undirected,
      });
    }
    if (path === "/api/health") {
      return json({ ok: true, artifacts_path: ARTIFACTS_PATH });
    }
    // Static web assets (best-effort).
    // HTML index is at ts/web/index.html; CSS/JS are in ts/web/dist after build.
    if (path === "/" || path === "/index.html") {
      const candidate = join(WEB_ROOT, "index.html");
      const ct = "text/html";
      // Try dist/index.html first (Vercel build output), then src location.
      for (const cand of [join(WEB_ROOT, "dist", "index.html"), candidate]) {
        const rel = relative(WEB_ROOT, normalize(cand));
        if (rel.startsWith("..") || rel.startsWith(sep)) continue;
        const resp = await serveStaticFile(cand, ct);
        if (resp) return resp;
      }
    }
    if (path.startsWith("/web/")) {
      const tail = path.slice("/web/".length);
      // Built assets are in ts/web/dist (main.js, styles.css). Fall back to
      // ts/web/src for dev without a build step. Check dist first.
      const candidates = [
        normalize(join(WEB_ROOT, "dist", tail)),
        normalize(join(WEB_ROOT, "src", tail)),
      ];
      for (const candidate of candidates) {
        // Use path.relative + startsWith('..') check to defeat "../.." escapes.
        // startsWith(WEB_ROOT) alone is unsafe (prefix match — /jobsume/web-evil/
        // would pass).
        const rel = relative(WEB_ROOT, candidate);
        if (rel.startsWith("..") || rel.startsWith(sep) || rel === "..") {
          return notFound("forbidden");
        }
        const ct = candidate.endsWith(".css")
          ? "text/css"
          : candidate.endsWith(".ts") || candidate.endsWith(".js")
            ? "application/javascript"
            : "application/octet-stream";
        const resp = await serveStaticFile(candidate, ct);
        if (resp) return resp;
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
