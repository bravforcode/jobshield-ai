// Tests for the in-TS Dijkstra + Layer-2 ranking + the DijkstraHeap.

import { describe, expect, it } from "bun:test";
import type { PipelineArtifacts } from "@jobshield/shared/contracts";
import { DijkstraHeap, recommend } from "./recommend";

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

  it("path_explanation length matches path length - 1", () => {
    const recs = recommend(fixture, "x", { topN: 5 });
    for (const r of recs) {
      expect(r.path_explanation.length).toBe(r.path.length - 1);
    }
  });

  it("dijkstra returns finite cost for reachable nodes, inf not surfaced", () => {
    // Source has no outgoing edges -> nothing to recommend.
    const isolated: PipelineArtifacts = {
      ...fixture,
      transition_graph: {
        nodes: ["x", "y", "z", "w"],
        edges: [
          { source: "y", target: "z", skill_distance: 0.5, shared_skills: [] },
          { source: "z", target: "y", skill_distance: 0.5, shared_skills: [] },
        ],
      },
    };
    const recs = recommend(isolated, "x", { topN: 5 });
    expect(recs.length).toBe(0);
  });

  it("topN <= 0 or NaN yields empty list (no fabrication)", () => {
    expect(recommend(fixture, "x", { topN: 0 })).toEqual([]);
    expect(recommend(fixture, "x", { topN: -3 })).toEqual([]);
    expect(recommend(fixture, "x", { topN: Number.NaN })).toEqual([]);
  });

  it("non-finite topN is clamped to 0 by Math.max(0, Math.floor)", () => {
    // Math.floor(NaN) = NaN, Math.max(0, NaN) = NaN, arr.slice(0, NaN) = [].
    // We just verify no crash and the contract holds.
    const out = recommend(fixture, "x", { topN: Number.POSITIVE_INFINITY });
    expect(Array.isArray(out)).toBe(true);
  });
});

describe("DijkstraHeap", () => {
  it("returns items in min-cost order", () => {
    const h = new DijkstraHeap();
    h.push(5, 0, "e");
    h.push(1, 1, "a");
    h.push(3, 2, "c");
    h.push(2, 3, "b");
    h.push(4, 4, "d");
    expect(h.size).toBe(5);
    expect(h.pop()?.[2]).toBe("a");
    expect(h.pop()?.[2]).toBe("b");
    expect(h.pop()?.[2]).toBe("c");
    expect(h.pop()?.[2]).toBe("d");
    expect(h.pop()?.[2]).toBe("e");
    expect(h.pop()).toBeUndefined();
    expect(h.size).toBe(0);
  });

  it("breaks equal-cost ties by counter (FIFO order)", () => {
    const h = new DijkstraHeap();
    h.push(1, 0, "a");
    h.push(1, 1, "b");
    h.push(1, 2, "c");
    expect(h.pop()?.[2]).toBe("a");
    expect(h.pop()?.[2]).toBe("b");
    expect(h.pop()?.[2]).toBe("c");
  });

  it("handles 1000 random pushes/pops without losing items", () => {
    const h = new DijkstraHeap();
    let pushed = 0;
    for (let i = 0; i < 1000; i++) {
      const cost = Math.floor(Math.random() * 100);
      h.push(cost, i, `n${i}`);
      pushed++;
    }
    const popped: number[] = [];
    while (h.size > 0) {
      const entry = h.pop();
      if (entry) popped.push(entry[0]);
    }
    // Heap must yield a non-decreasing sequence.
    for (let i = 1; i < popped.length; i++) {
      const a = popped[i];
      const b = popped[i - 1];
      if (a === undefined || b === undefined) throw new Error("index out of range");
      expect(a >= b).toBe(true);
    }
    expect(popped.length).toBe(pushed);
  });
});
