// Tests for the artifacts loader.

import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ArtifactsLoadError, validateArtifacts } from "./artifacts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FIXTURE = resolve(__dirname, "../testdata/artifacts.json");

describe("validateArtifacts", () => {
  it("accepts a minimal valid payload", async () => {
    const fixture = await Bun.file(FIXTURE).json();
    const out = validateArtifacts(fixture);
    expect(out.transition_graph.edges.length).toBe(4);
  });

  it("rejects non-object root", () => {
    expect(() => validateArtifacts("nope")).toThrow(ArtifactsLoadError);
    expect(() => validateArtifacts(null)).toThrow(ArtifactsLoadError);
  });

  it("rejects when required key is missing", () => {
    const bad = { skill_graph: {}, transition_graph: { nodes: [], edges: [] } };
    expect(() => validateArtifacts(bad)).toThrow(/missing required key/);
  });

  it("rejects when transition_graph.edges is not an array", () => {
    const bad = {
      skill_graph: {},
      transition_graph: { nodes: [], edges: "oops" },
      centrality: {},
      wage_data: {},
      risk_scores: {},
      recommendations: {},
    };
    expect(() => validateArtifacts(bad)).toThrow(/edges/);
  });
});
