"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    label: "01",
    title: "Skill graph from real postings",
    body: "PPMI co-occurrence over 153 hand-authored job postings yields 46 skills and 129 undirected transitions. Edges are dropped below zero PMI; skill distance uses direct overlap + indirect PPMI bridge.",
    to: "/mechanism",
    tag: "Layer 0",
  },
  {
    label: "02",
    title: "Two-layer ranking, not one",
    body: "Layer 1 = Dijkstra on α·dist_norm + γ·risk_norm (non-negative, safe). Layer 2 = β·wage_norm − path_cost − γ₂·risk. Wage never appears in the path cost, so it can't telescope.",
    to: "/mechanism",
    tag: "Layer 1 + 2",
  },
  {
    label: "03",
    title: "Skill bridges that explain",
    body: "Every hop is annotated by the actual shared skills between adjacent occupations. The recommendation comes with a why, not a score.",
    to: "/recommend",
    tag: "Explainability",
  },
  {
    label: "04",
    title: "Wage radar with regression",
    body: "OLS fit of median wage on degree centrality. Points below the fit line are flagged as underpaid — the only red on the page.",
    to: "/wage-radar",
    tag: "Layer 3",
  },
];

export function Features() {
  return (
    <section className="border-t border-border/60">
      <div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6">
        <div className="mb-10 flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            What it does
          </span>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Four layers, one workflow.
          </h2>
          <p className="max-w-2xl text-balance text-muted-foreground">
            The recommender is split into four explicit layers. Each one is auditable, testable, and
            shown in the UI so you can follow the numbers from the page back to the math.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <Link href={f.to} className="group block h-full">
                <Card className="h-full transition-all group-hover:border-primary/40 group-hover:shadow-md">
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground">{f.label}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {f.tag}
                      </Badge>
                    </div>
                    <h3 className="text-base font-semibold leading-tight">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.body}</p>
                    <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Open <ArrowRight className="size-3.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
