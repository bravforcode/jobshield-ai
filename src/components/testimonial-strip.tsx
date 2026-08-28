"use client";

import { Quote } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const QUOTES = [
  {
    body: "The naive formula α·dist − β·wage + γ·risk has two bugs. The two-layer split avoids both.",
    tag: "Spec §5.1",
  },
  {
    body: "Edge cost is non-negative (α·dist_norm + γ·risk_norm). That's the invariant that makes Dijkstra safe.",
    tag: "Spec §5.3",
  },
  {
    body: "PPMI = max(0, log P(a,b) / (P(a)·P(b))). Drop sub-independence pairs.",
    tag: "Spec §3.2",
  },
  {
    body: "Wage gap = (predicted − actual) / predicted. Positive gap = underpaid signal.",
    tag: "Spec §6.2",
  },
];

export function TestimonialStrip() {
  return (
    <section className="border-t border-border/60">
      <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6">
        <div className="mb-8 flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            From the spec
          </span>
          <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            The math, in plain sentences.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUOTES.map((q, i) => (
            <motion.div
              key={q.tag}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-4 p-5">
                  <Quote className="size-4 text-primary" />
                  <p className="text-sm leading-relaxed text-foreground/90">
                    &ldquo;{q.body}&rdquo;
                  </p>
                  <Badge variant="outline" className="mt-auto self-start font-mono text-[10px]">
                    {q.tag}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
