"use client";

import { BookOpen, ChartLine, Route as RouteIcon } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { RecommendationsList } from "@/components/recommendations-list";
import { SourcePicker } from "@/components/source-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WageRadar } from "@/components/wage-radar";
import type { Occupation, Recommendation, WageRadarRow } from "@/lib/types";
import { formatThb } from "@/lib/utils";

interface Props {
  occupations: Occupation[];
  initialRecommendations: Record<string, Recommendation[]>;
  wageRadar: WageRadarRow[];
}

export function RecommenderClient({ occupations, initialRecommendations, wageRadar }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const sourceParam = search.get("source") ?? occupations[0]?.code ?? "";
  const [source, setSource] = React.useState(sourceParam);
  const [recommendations, setRecommendations] = React.useState<Recommendation[]>(
    initialRecommendations[sourceParam] ?? [],
  );
  const [loading, setLoading] = React.useState(false);
  const [highlightedTarget, setHighlightedTarget] = React.useState<string | null>(null);

  // wageRadar passed in as a prop (server-side)

  React.useEffect(() => {
    if (source !== sourceParam) {
      const params = new URLSearchParams(search);
      params.set("source", source);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [source, sourceParam, search, router]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/recommend?source=${encodeURIComponent(source)}&topN=5`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setRecommendations(data.recommendations ?? []);
        setLoading(false);
      })
      .catch(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [source]);

  const occMap = React.useMemo(() => new Map(occupations.map((o) => [o.code, o])), [occupations]);
  const sourceOcc = occMap.get(source);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Recommender
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Pick a starting job. See ranked next moves.
          </h1>
        </div>
        <SourcePicker occupations={occupations} selected={source} onChange={setSource} />
      </div>

      <Tabs defaultValue="recommendations" className="flex flex-col gap-6">
        <TabsList>
          <TabsTrigger value="recommendations">
            <RouteIcon /> Recommendations
          </TabsTrigger>
          <TabsTrigger value="radar">
            <ChartLine /> Wage radar
          </TabsTrigger>
          <TabsTrigger value="mechanism">
            <BookOpen /> Mechanism
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="flex flex-col gap-6">
          {sourceOcc && (
            <Card>
              <CardContent className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
                <Stat label="Median wage" value={formatThb(sourceOcc.wage.median)} />
                <Stat
                  label="Wage gap"
                  value={`${sourceOcc.underpayment_gap > 0 ? "+" : ""}${(sourceOcc.underpayment_gap * 100).toFixed(1)}%`}
                  highlight={sourceOcc.underpayment_gap > 0.05}
                />
                <Stat label="Degree" value={sourceOcc.degree_centrality.toFixed(2)} />
                <Stat label="AI risk" value={`${(sourceOcc.risk * 100).toFixed(0)}%`} />
              </CardContent>
            </Card>
          )}
          <motion.div
            key={source}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <RecommendationsList
              recommendations={recommendations}
              occupationByCode={occMap}
              loading={loading}
              onTargetClick={(t) => setHighlightedTarget(t)}
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="radar">
          <Card>
            <CardHeader>
              <CardTitle>Wage radar · live</CardTitle>
              <CardDescription>
                {highlightedTarget
                  ? `Highlighted: ${occMap.get(highlightedTarget)?.label ?? highlightedTarget}`
                  : "Hover a point to see the gap. Click to copy its code."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WageRadar
                data={wageRadar}
                highlightOcc={highlightedTarget ?? undefined}
                height={460}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mechanism">
          <MechanismExplainer />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`font-mono text-base font-semibold ${highlight ? "text-primary" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function MechanismExplainer() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <Badge variant="outline" className="self-start font-mono text-[10px]">
            Layer 1
          </Badge>
          <CardTitle>Dijkstra on α·dist + γ·risk</CardTitle>
          <CardDescription>
            Min-cost path from your starting occupation to every other.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            Both factors are normalised to <span className="font-mono">[0, 1]</span>, so the cost is
            non-negative. That&apos;s the invariant that makes Dijkstra safe — the spec&apos;s
            anti-formula α·dist − β·wage + γ·risk has a negative-edge bug we avoid by construction.
          </p>
          <code className="rounded bg-muted px-3 py-2 font-mono text-xs">
            edge_cost = α * dist_norm + γ * risk_norm
          </code>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Badge variant="outline" className="self-start font-mono text-[10px]">
            Layer 2
          </Badge>
          <CardTitle>Rank by β·wage_norm − path − γ₂·risk</CardTitle>
          <CardDescription>
            Score targets by wage gain, penalised by the path that got you there.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            Wage never enters the path cost — it would otherwise telescope to (wage(target) −
            wage(source)) and have no effect on path choice. So the two layers must be split: path
            first, target second.
          </p>
          <code className="rounded bg-muted px-3 py-2 font-mono text-xs">
            score = β * wage_norm − path_cost − γ₂ * target_risk
          </code>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Why two layers, not one</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          <div>
            <h4 className="mb-1 text-foreground">Bug 1: negative edges</h4>
            <p>
              The naive formula includes <span className="font-mono">−β·wage</span>, which can
              produce negative single-hop costs. Dijkstra is only correct on non-negative graphs;
              the spec forbids this.
            </p>
          </div>
          <div>
            <h4 className="mb-1 text-foreground">Bug 2: wage telescopes</h4>
            <p>
              A wage term summed over a path collapses to
              <span className="font-mono"> (wage(target) − wage(source))</span>, independent of the
              path. It can&apos;t influence which route is chosen — only which target.
            </p>
          </div>
        </CardContent>
      </Card>
      <div className="lg:col-span-2">
        <Button variant="outline" asChild>
          <Link href="/mechanism">Read the full spec breakdown →</Link>
        </Button>
      </div>
    </div>
  );
}
