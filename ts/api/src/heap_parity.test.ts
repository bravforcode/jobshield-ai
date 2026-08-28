// Cross-language heap parity: read the Python-generated expected pop
// order and the input sequence, replay through our heap, assert equality.

import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DijkstraHeap } from "./recommend";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FIXTURE = resolve(__dirname, "../../../py/tests/data/heap_parity.json");

interface ParityFixture {
  input: Array<{ cost: number; counter: number; name: string }>;
  expected_pop_order: Array<{ cost: number; name: string }>;
}

let fixture: ParityFixture | null = null;
async function loadFixture(): Promise<ParityFixture> {
  if (fixture) return fixture;
  fixture = (await Bun.file(FIXTURE).json()) as ParityFixture;
  return fixture;
}

describe("DijkstraHeap cross-language parity with Python heapq", () => {
  it("pop order matches Python heapq for the same input", async () => {
    const f = await loadFixture();
    const heap = new DijkstraHeap();
    for (const item of f.input) {
      heap.push(item.cost, item.counter, item.name);
    }
    const actual: Array<{ cost: number; name: string }> = [];
    while (heap.size > 0) {
      const e = heap.pop();
      if (e) actual.push({ cost: Math.round(e[0] * 1e6) / 1e6, name: e[2] });
    }
    expect(actual.length).toBe(f.expected_pop_order.length);
    for (let i = 0; i < actual.length; i++) {
      const a = actual[i];
      const e = f.expected_pop_order[i];
      if (!a || !e) throw new Error("index out of range in parity assertion");
      expect(a.cost).toBeCloseTo(e.cost, 5);
      expect(a.name).toBe(e.name);
    }
  });
});
