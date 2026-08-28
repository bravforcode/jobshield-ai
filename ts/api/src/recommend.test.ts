// Tests for the in-TS Dijkstra + Layer-2 ranking.

import { describe, expect, it } from "bun:test";
import type { PipelineArtifacts } from "@jobshield/shared/contracts";
import { recommend } from "./recommend";

const fixture: PipelineArtifacts = {
  skill_graph: { nodes: ["a"], freq: {}, edges: [] },
  transition_graph: {
    nodes: ["x", "y", "z", "w"],
    edges: [
      { source: "x", target: "y", skill_distance: 0.4, shared_skills: ["a"] },
      { source: "y", target: "x", skill_distance: 0.4, shared_skills: ["a"] },
      { source: "x", target: "z", skill_distance: 0.4, shared_skills: ["a"] },
      { source: "z", target: "x", skill_distance: 0.4, shared_skills: ["a"] },
      { source: "y", target: "w", skill_distance: 0.4, shared_skills: ["a"] },
      { source: "w", target: "y", skill_distance: 0.4, shared_skills: ["a"] },
    ],
  },
  centrality: { degree: {}, betweenness: {} },
  wage_data: {
    x: { median: 10_000, p25: 0, p75: 0, sample_count: 1 },
    y: { median: 11_000, p25: 0, p75: 0, sample_count: 1 },
    z: { median: 20_000, p25: 0, p75: 0, sample_count: 1 },
    w: { median: 30_000, p25: 0, p75: 0, sample_count: 1 },
  },
  risk_scores: { x: 0.5, y: 0.5, z: 0.3, w: 0.1 },
  recommendations: {},
};

describe("recommend", () => {
  it("returns up to topN recommendations with score sorted desc", () => {
    const recs = recommend(fixture, "x", { topN: 3 });
    expect(recs.length).toBe(3);
    const scores = recs.map((r) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});
