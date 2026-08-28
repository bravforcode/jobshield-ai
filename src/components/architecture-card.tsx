"use client";

import { BarChart3, Calculator, Database, Route as RouteIcon } from "lucide-react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    icon: Database,
    name: "Skill graph",
    formula: "PPMI(co_occurrence)",
    detail: "153 postings → 46 skills → 129 edges. Edges with PMI ≤ 0 are dropped.",
  },
  {
    icon: Calculator,
    name: "Distance",
    formula: "1 − clamp(direct + indirect)",
    detail: "Direct overlap (min) + indirect PPMI bridge (0.4 hop decay). Output ∈ [0, 1].",
  },
  {
    icon: RouteIcon,
    name: "Layer 1 (Dijkstra)",
    formula: "α·dist_norm + γ·risk_norm",
    detail: "Single-source min-cost path. Non-negative weights keep the algorithm correct.",
  },
  {
    icon: BarChart3,
    name: "Layer 2 (Rank)",
    formula: "β·wage_norm − path_cost − γ₂·risk",
    detail: "Score targets by wage gain, penalised by path cost and target risk. Top N returned.",
  },
];

export function ArchitectureCard() {
  return (
    <section className="border-t border-border/60 bg-muted/20">
      <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6">
        <div className="mb-8 flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Architecture
          </span>
          <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            The path from a posting to a recommendation.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-center justify-between">
                    <s.icon className="size-4 text-primary" />
                    <span className="font-mono text-[10px] text-muted-foreground">0{i + 1}</span>
                  </div>
                  <h3 className="text-sm font-semibold">{s.name}</h3>
                  <code className="rounded bg-muted px-2 py-1 font-mono text-[11px]">
                    {s.formula}
                  </code>
                  <p className="text-xs text-muted-foreground">{s.detail}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
