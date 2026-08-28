"use client";

import { ArrowRight, ChartLine, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { Github } from "@/components/icons/github";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CorpusStats } from "@/lib/types";
import { formatThb } from "@/lib/utils";

interface Props {
  stats: CorpusStats;
}

export function Hero({ stats }: Props) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg radial-fade" aria-hidden />
      <div
        className="absolute inset-x-0 top-0 -z-10 h-[480px] bg-gradient-to-b from-primary/5 to-transparent"
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-[1240px] flex-col gap-12 px-4 pb-20 pt-16 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:pt-24">
        <div className="flex flex-1 flex-col items-start gap-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Badge variant="signal" className="gap-1">
              <Sparkles className="size-3" /> v2 · two-layer architecture
            </Badge>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Where you can go next in the <span className="text-primary">Thai labour market</span>,
            and why.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-xl text-balance text-lg text-muted-foreground"
          >
            A career recommender built on a PPMI skill graph and a two-layer Dijkstra + rank split.
            The model is on the page. The numbers you see are the same numbers the algorithm saw.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-wrap items-center gap-3"
          >
            <Button size="lg" asChild>
              <Link href="/recommend">
                Try the recommender <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a
                href="https://github.com/bravforcode/jobshield-ai"
                target="_blank"
                rel="noreferrer"
              >
                <Github /> View source
              </a>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href="/wage-radar">
                <ChartLine /> Wage radar
              </Link>
            </Button>
          </motion.div>
          <motion.dl
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-2 grid w-full max-w-xl grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {[
              { label: "occupations", value: stats.occupations },
              { label: "skills", value: stats.skills },
              { label: "transitions", value: stats.edges },
              { label: "sources", value: stats.sources },
            ].map((s) => (
              <Card key={s.label} className="bg-card/60 backdrop-blur">
                <CardContent className="flex flex-col gap-1 px-4 py-3">
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </dt>
                  <dd className="font-mono text-2xl font-semibold tabular-nums">{s.value}</dd>
                </CardContent>
              </Card>
            ))}
          </motion.dl>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex-1"
        >
          <HeroDemoCard />
        </motion.div>
      </div>
    </section>
  );
}

function HeroDemoCard() {
  return (
    <Card className="overflow-hidden border-2">
      <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-red-500/80" />
          <span className="size-2.5 rounded-full bg-amber-500/80" />
          <span className="size-2.5 rounded-full bg-emerald-500/80" />
          <span className="ml-2 font-mono text-muted-foreground">jobshield.ai / recommend</span>
        </div>
        <Badge variant="outline" className="font-mono text-[10px]">
          live
        </Badge>
      </div>
      <div className="flex flex-col gap-4 p-5">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Starting from
          </p>
          <p className="text-base font-semibold">Data entry · เจ้าหน้าที่บันทึกข้อมูล</p>
          <p className="font-mono text-xs text-muted-foreground">
            {formatThb(15000)} · risk 95% · centrality 0.55
          </p>
        </div>
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="font-mono uppercase tracking-wider text-muted-foreground">
              Top recommendation
            </span>
            <span className="font-mono text-muted-foreground">score +0.395</span>
          </div>
          <p className="text-sm font-semibold">Junior data analyst</p>
          <p className="text-xs text-muted-foreground">
            <span className="text-emerald-600 dark:text-emerald-400">+20,000 THB</span> · 1 hop · 3
            shared skills
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <DemoMetric label="Layer 1 cost" value="0.060" />
          <DemoMetric label="Layer 2 score" value="+0.395" />
          <DemoMetric label="Path" value="data_entry → jda" />
          <DemoMetric label="Bridges" value="sql, excel, english" />
        </div>
      </div>
    </Card>
  );
}

function DemoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/40 p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}
