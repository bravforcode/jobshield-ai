/**
 * Server-only data loader.
 *
 * Reads `data/artifacts.json` (built by the Python pipeline at
 * `py/src/jobshield/cli/build.py`) and exposes typed views for the UI.
 *
 * IMPORTANT: Do not import this file from a client component — it uses
 * node:fs and is not safe to bundle into the browser. Import from
 * `lib/types.ts` for shared types instead.
 */

import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type CorpusStats,
  categoryFor,
  labelFor,
  type Occupation,
  type Recommendation,
  type WageRadarRow,
} from "@/lib/types";

const ARTIFACT_CANDIDATES = [
  join(process.cwd(), "data", "artifacts.json"),
  join(process.cwd(), "..", "..", "data", "artifacts.json"),
  join(process.cwd(), "..", "data", "artifacts.json"),
  join(process.cwd(), "apps", "web", "data", "artifacts.json"),
];

let cached: Artifacts | null = null;

// biome-ignore lint/suspicious/noExplicitAny: JSON.parse returns unknown
function loadRaw(): any {
  for (const path of ARTIFACT_CANDIDATES) {
    try {
      const raw = readFileSync(path, "utf-8");
      return JSON.parse(raw);
    } catch {}
  }
  throw new Error(`[jobshield] artifacts.json not found. Tried: ${ARTIFACT_CANDIDATES.join(", ")}`);
}

interface Artifacts {
  occupations: Occupation[];
  stats: CorpusStats;
  recommendations: Record<string, Recommendation[]>;
  wageRadar: WageRadarRow[];
}

// biome-ignore lint/suspicious/noExplicitAny: raw pipeline output is intentionally untyped
function buildViews(raw: any): Artifacts {
  const tnodes: string[] = raw.transition_graph.nodes;
  const tedges: Array<{
    source: string;
    target: string;
    skill_distance: number;
    shared_skills: string[];
  }> = raw.transition_graph.edges;
  const degree: Record<string, number> = raw.centrality.degree;
  const betweenness: Record<string, number> = raw.centrality.betweenness;
  const wageData: Record<
    string,
    { median: number; p25: number; p75: number; sample_count: number }
  > = raw.wage_data;
  const risk: Record<string, number> = raw.risk_scores;

  const xs = tnodes.map((c) => degree[c] ?? 0);
  const ys = tnodes.map((c) => wageData[c]?.median ?? 0);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] ?? 0) - meanX;
    sxx += dx * dx;
    sxy += dx * ((ys[i] ?? 0) - meanY);
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = meanY - slope * meanX;
  const predict = (x: number) => slope * x + intercept;

  const occupations: Occupation[] = tnodes.map((code) => {
    const w = wageData[code] ?? { median: 0, p25: 0, p75: 0, sample_count: 0 };
    const d = degree[code] ?? 0;
    const predicted = predict(d);
    const gap = predicted > 0 ? (predicted - w.median) / predicted : 0;
    return {
      code,
      label: labelFor(code),
      category: categoryFor(code),
      wage: w,
      risk: risk[code] ?? 0,
      degree_centrality: d,
      betweenness_centrality: betweenness[code] ?? 0,
      underpayment_gap: gap,
      predicted_wage: predicted,
    };
  });
  occupations.sort((a, b) => a.code.localeCompare(b.code));

  const wageRadar: WageRadarRow[] = occupations
    .map((o) => ({
      occ: o.code,
      label: o.label,
      centrality: o.degree_centrality,
      wage: o.wage.median,
      predicted: o.predicted_wage,
      underpaid: o.underpayment_gap > 0.05,
      gap_ratio: o.underpayment_gap,
    }))
    .sort((a, b) => b.centrality - a.centrality);

  const skillNodes = raw.skill_graph.nodes;
  const stats: CorpusStats = {
    occupations: occupations.length,
    skills: Array.isArray(skillNodes) ? skillNodes.length : Object.keys(skillNodes).length,
    edges: tedges.length / 2,
    sources: Object.keys(raw.recommendations ?? {}).length,
  };

  const recs: Record<string, Recommendation[]> = raw.recommendations ?? {};

  return { occupations, stats, recommendations: recs, wageRadar };
}

export function getArtifacts(): Artifacts {
  if (cached) return cached;
  const raw = loadRaw();
  cached = buildViews(raw);
  return cached;
}

export function getOccupation(code: string): Occupation | undefined {
  return getArtifacts().occupations.find((o) => o.code === code);
}

export function getRecommendations(source: string, topN = 5): Recommendation[] {
  const all = getArtifacts().recommendations[source] ?? [];
  return all.slice(0, Math.max(1, Math.min(50, topN)));
}
