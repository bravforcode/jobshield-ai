import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Mechanism",
  description:
    "Six layers: PPMI skill graph → occupation distance → transition → Dijkstra L1 → Rank L2 → centrality/OLS.",
};

const SECTIONS = [
  {
    label: "Spec §3.2",
    title: "Skill graph · PPMI",
    body: "Build a PPMI-weighted co-occurrence graph from job postings. PMI = log P(a,b) / (P(a) · P(b)). Drop edges where PMI ≤ 0. The edge key is the sorted tuple of skill names, so the same pair queried in either order hits the same entry.",
    formula: "ppmi = max(0, log(p_ab / (p_a * p_b)))",
  },
  {
    label: "Spec §4.2",
    title: "Occupation distance",
    body: "Distance is 1 minus a clamped similarity. Similarity = direct overlap (sum of min) + indirect PPMI bridge (0.4 hop decay). Output is always in [0, 1]. The top-5 shared skills, ranked by min, come back as the explainable output.",
    formula: "distance = 1 - clamp01(direct + indirect)",
  },
  {
    label: "Spec §5.3",
    title: "Transition graph",
    body: "All-pairs skill distance, keep edges where distance ≤ 0.85. Each surviving pair produces two directed edges with mirrored source/target and the same shared_skills list. The graph is unweighted for BFS, weighted for Dijkstra.",
    formula: "edge.skill_distance ∈ [0, 1]",
  },
  {
    label: "Spec §5.3",
    title: "Layer 1 · Dijkstra",
    body: "Single-source min-cost path. Edge cost = α · dist_norm + γ · risk_norm. Both factors non-negative, so the standard binary-heap Dijkstra is correct. Alpha = 0.6, gamma = 0.4 by default.",
    formula: "edge_cost = α * dist_norm + γ * risk_norm",
  },
  {
    label: "Spec §5.3",
    title: "Layer 2 · Rank",
    body: "Once the path is fixed, score targets by β · wage_norm − path_cost − γ₂ · risk. Wage never appears in the path cost, so it can't telescope. Top N returned, sorted by score descending. Beta = 0.5, gamma2 = 0.3 by default.",
    formula: "score = β * wage_norm − path_cost − γ₂ * risk",
  },
  {
    label: "Spec §6.2",
    title: "Centrality + Wage radar",
    body: "Brandes' BFS for betweenness, trivial max-deg-normalized for degree. OLS regression of median wage on degree centrality. Gap = (predicted − actual) / predicted; positive gap flags underpayment. The only red on the page.",
    formula: "gap = (predicted - actual) / predicted",
  },
];

export default function MechanismPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6">
      <div className="mb-10 flex flex-col gap-3">
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Mechanism
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          The math, in six steps.
        </h1>
        <p className="max-w-3xl text-balance text-muted-foreground">
          The spec separates the pipeline into six explicit layers. Every decision is auditable,
          every formula is testable, and every output carries its provenance back to the source
          data.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {SECTIONS.map((s, i) => (
          <Card key={s.label}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-[10px]">
                  {s.label}
                </Badge>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <CardTitle className="text-lg">{s.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
              <p>{s.body}</p>
              <code className="rounded bg-muted px-3 py-2 font-mono text-xs">{s.formula}</code>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
