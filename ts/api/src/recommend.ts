// Dijkstra + Layer-2 ranking in TypeScript. Mirrors spec §5.3 + Python
// implementation in py/src/jobshield/path/{dijkstra,recommend}.ts so the API
// can serve requests without round-tripping to Python.

import type {
  HopExplanation,
  PipelineArtifacts,
  RecommendationPayload,
  TransitionEdgePayload,
} from "@jobshield/shared/contracts";

interface EdgeInternal {
  source: string;
  target: string;
  skill_distance: number;
  shared_skills: string[];
  dist_norm: number;
  risk_norm: number;
  cost: number;
}

function buildInternalGraph(
  artifacts: PipelineArtifacts,
  alpha: number,
  gamma: number,
): Map<string, EdgeInternal[]> {
  const edges = artifacts.transition_graph.edges;
  if (edges.length === 0) {
    return new Map();
  }
  const dists = edges.map((e) => e.skill_distance);
  const dmin = Math.min(...dists);
  const dmax = Math.max(...dists);
  const spread = dmax - dmin + 1e-9;

  const adj = new Map<string, EdgeInternal[]>();
  for (const e of edges) {
    const dist_norm = (e.skill_distance - dmin) / spread;
    const risk_norm = artifacts.risk_scores[e.target] ?? 0.0;
    const cost = alpha * dist_norm + gamma * risk_norm;
    const internal: EdgeInternal = {
      source: e.source,
      target: e.target,
      skill_distance: e.skill_distance,
      shared_skills: e.shared_skills,
      dist_norm,
      risk_norm,
      cost,
    };
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)?.push(internal);
  }
  return adj;
}

function dijkstra(
  adj: Map<string, EdgeInternal[]>,
  source: string,
): { dist: Map<string, number>; prev: Map<string, { parent: string; edge: EdgeInternal }> } {
  const dist = new Map<string, number>();
  const prev = new Map<string, { parent: string; edge: EdgeInternal }>();
  // Initialize dist to +inf for all known nodes.
  for (const [node, edges] of adj) {
    if (!dist.has(node)) dist.set(node, Number.POSITIVE_INFINITY);
    for (const e of edges) {
      if (!dist.has(e.target)) dist.set(e.target, Number.POSITIVE_INFINITY);
    }
  }
  dist.set(source, 0);
  const visited = new Set<string>();
  // Binary heap: (cost, counter, node) — counter breaks ties deterministically.
  const pq: Array<[number, number, string]> = [[0, 0, source]];
  let counter = 1;
  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const head = pq.shift();
    if (!head) break;
    const [d, _c, u] = head;
    if (visited.has(u)) continue;
    visited.add(u);
    const edges = adj.get(u) ?? [];
    for (const e of edges) {
      const v = e.target;
      if (visited.has(v)) continue;
      const nd = d + e.cost;
      if (nd < (dist.get(v) ?? Number.POSITIVE_INFINITY)) {
        dist.set(v, nd);
        prev.set(v, { parent: u, edge: e });
        pq.push([nd, counter++, v]);
      }
    }
  }
  return { dist, prev };
}

function reconstruct(
  prev: Map<string, { parent: string; edge: EdgeInternal }>,
  source: string,
  target: string,
): { path: string[]; explanations: HopExplanation[] } | null {
  if (source === target) return { path: [source], explanations: [] };
  const path: string[] = [];
  const explanations: HopExplanation[] = [];
  let node: string | undefined = target;
  while (node && node !== source) {
    const entry = prev.get(node);
    if (!entry) return null;
    path.push(node);
    explanations.push({
      from: entry.parent,
      to: node,
      shared_skills: entry.edge.shared_skills,
    });
    node = entry.parent;
  }
  if (node !== source) return null;
  path.push(source);
  return { path: path.reverse(), explanations: explanations.reverse() };
}

export interface RecommendOptions {
  alpha?: number;
  gamma?: number;
  beta?: number;
  gamma2?: number;
  topN?: number;
}

export function recommend(
  artifacts: PipelineArtifacts,
  source: string,
  options: RecommendOptions = {},
): RecommendationPayload[] {
  const alpha = options.alpha ?? 0.6;
  const gamma = options.gamma ?? 0.4;
  const beta = options.beta ?? 0.5;
  const gamma2 = options.gamma2 ?? 0.3;
  const topN = options.topN ?? 5;

  const adj = buildInternalGraph(artifacts, alpha, gamma);
  const { dist, prev } = dijkstra(adj, source);

  const wageSource = artifacts.wage_data[source]?.median ?? 0;
  const finiteDeltas: number[] = [];
  for (const [occ, d] of dist) {
    if (occ === source || !Number.isFinite(d)) continue;
    const w = artifacts.wage_data[occ]?.median;
    if (typeof w === "number") finiteDeltas.push(w - wageSource);
  }
  if (finiteDeltas.length === 0) return [];
  const wmin = Math.min(...finiteDeltas);
  const wmax = Math.max(...finiteDeltas);
  const wSpread = wmax - wmin + 1e-9;

  const scored: Array<{ occ: string; score: number; wageDelta: number; pathCost: number }> = [];
  for (const [occ, pathCost] of dist) {
    if (occ === source || !Number.isFinite(pathCost)) continue;
    const wageDelta = (artifacts.wage_data[occ]?.median ?? 0) - wageSource;
    const wageNorm = (wageDelta - wmin) / wSpread;
    const risk = artifacts.risk_scores[occ] ?? 0;
    const score = beta * wageNorm - pathCost - gamma2 * risk;
    scored.push({ occ, score, wageDelta, pathCost });
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.max(0, Math.floor(topN)));

  return top.map(({ occ, score, wageDelta, pathCost }) => {
    const rec = reconstruct(prev, source, occ);
    // `rec` is null only when the prev map cannot reach target — should not
    // happen because `dist` filter eliminated inf-cost targets. Be loud
    // rather than fabricating a path.
    if (!rec) {
      throw new Error(
        `reconstruct returned null for ${occ} (source=${source}); this indicates a graph-consistency bug, not a benign miss`,
      );
    }
    return {
      target: occ,
      target_label: occ, // The artifacts payload doesn't carry labels per-occ; UI can fall back to code.
      score,
      wage_delta: wageDelta,
      path_cost: pathCost,
      target_risk: artifacts.risk_scores[occ] ?? 0,
      path: rec.path,
      path_explanation: rec.explanations,
    };
  });
}
