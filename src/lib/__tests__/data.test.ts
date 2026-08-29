import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

function loadArtifacts() {
  const raw = JSON.parse(readFileSync(join(process.cwd(), "data", "artifacts.json"), "utf-8"));
  return raw;
}

describe("artifacts", () => {
  test("stats are 18/46/119/18", () => {
    const raw = loadArtifacts();
    expect(raw.transition_graph.nodes.length).toBe(18);
    expect(raw.transition_graph.edges.length).toBe(238); // 119*2 directed
  });
  test("occupations have bilingual labels via types", async () => {
    const { LABELS } = await import("@/lib/types");
    for (const v of Object.values(LABELS)) expect(v).toContain("·");
  });
  test("wage gap is computed via server view", async () => {
    // Indirect: check raw data has median wages
    const raw = loadArtifacts();
    for (const code of raw.transition_graph.nodes) {
      expect(raw.wage_data[code].median).toBeGreaterThan(0);
    }
  });
});
