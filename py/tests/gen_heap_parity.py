"""Cross-language heap parity test.

Pythons `heapq` and the TS `DijkstraHeap` must produce the same pop order
for the same input. We compute a deterministic test sequence in Python
and dump it; the TS test reads the same file and asserts equality.

This guards against a future change in either side silently breaking
the algorithm while still passing within-language tests.
"""
from __future__ import annotations

import heapq
import json
import random
from pathlib import Path


def main() -> None:
    rng = random.Random(42)
    items: list[tuple[float, int, str]] = []
    for i in range(500):
        cost = rng.uniform(0, 100)
        items.append((cost, i, f"n{i}"))

    # Python heapq pop order (uses (cost, counter, name) — same as TS).
    heap: list[tuple[float, int, str]] = []
    for cost, counter, name in items:
        heapq.heappush(heap, (cost, counter, name))
    popped: list[tuple[float, str]] = []
    while heap:
        cost, _counter, name = heapq.heappop(heap)
        popped.append((round(cost, 6), name))

    out = {
        "input": [
            {"cost": round(c, 6), "counter": i, "name": n}
            for c, i, n in items
        ],
        "expected_pop_order": [{"cost": c, "name": n} for c, n in popped],
    }
    target = Path(__file__).parent / "data" / "heap_parity.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"wrote {target}")


if __name__ == "__main__":
    main()
