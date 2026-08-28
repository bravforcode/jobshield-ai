"use client";

import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Occupation, Recommendation } from "@/lib/types";
import { cn, formatThb } from "@/lib/utils";

interface Props {
  recommendations: Recommendation[];
  occupationByCode: Map<string, Occupation>;
  onTargetClick?: (code: string) => void;
  loading?: boolean;
}

export function RecommendationsList({
  recommendations,
  occupationByCode,
  onTargetClick,
  loading,
}: Props) {
  const [expanded, setExpanded] = React.useState<string | null>(null);

  if (loading) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <AlertTriangle className="size-6 text-muted-foreground" />
          <h3 className="font-semibold">No reachable targets from this starting point</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            The skill graph has no path forward at the current distance threshold. Try a different
            starting occupation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-2">
      {recommendations.map((rec, idx) => {
        const target = occupationByCode.get(rec.target);
        const isOpen = expanded === rec.target;
        const wagePos = rec.wage_delta >= 0;
        return (
          <Card
            key={rec.target}
            className={cn(
              "group overflow-hidden transition-all",
              isOpen && "ring-1 ring-primary/40",
            )}
          >
            <button
              type="button"
              onClick={() => {
                setExpanded(isOpen ? null : rec.target);
                if (!isOpen) onTargetClick?.(rec.target);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-md bg-muted font-mono text-xs text-muted-foreground">
                {String(idx + 1).padStart(2, "0")}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">
                    {target?.label ?? rec.target_label}
                  </span>
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-90 text-foreground",
                    )}
                  />
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <span>
                    via {rec.path.length - 1} hop{rec.path.length > 2 ? "s" : ""}
                  </span>
                  <span>·</span>
                  <span>path cost {rec.path_cost.toFixed(3)}</span>
                  <span>·</span>
                  <span>target risk {(rec.target_risk * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="hidden flex-col items-end gap-1 sm:flex">
                <div className="flex items-center gap-1.5">
                  {wagePos ? (
                    <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <TrendingDown className="size-3.5 text-muted-foreground" />
                  )}
                  <span
                    className={cn(
                      "font-mono text-sm font-semibold",
                      wagePos ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                    )}
                  >
                    {wagePos ? "+" : ""}
                    {formatThb(rec.wage_delta)}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  score {rec.score.toFixed(3)}
                </span>
              </div>
            </button>
            {isOpen && (
              <div className="border-t border-border/60 bg-muted/30 px-4 py-4">
                <div className="flex flex-col gap-3">
                  {rec.path_explanation.map((hop, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: small fixed list
                    <div key={i} className="flex flex-col gap-1.5 text-sm">
                      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                        <span className="rounded bg-background px-1.5 py-0.5">
                          {occupationByCode.get(hop.from)?.label ?? hop.from}
                        </span>
                        <ArrowRight className="size-3" />
                        <span className="rounded bg-background px-1.5 py-0.5">
                          {occupationByCode.get(hop.to)?.label ?? hop.to}
                        </span>
                      </div>
                      {hop.shared_skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {hop.shared_skills.map((s) => (
                            <Badge key={s} variant="secondary" className="font-mono text-[10px]">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">
                          No direct skill overlap; bridge runs through PPMI co-occurrence.
                        </span>
                      )}
                    </div>
                  ))}
                  <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-primary" />
                      <span className="text-muted-foreground">Layer 2 score</span>
                      <span className="font-mono font-semibold">{rec.score.toFixed(3)}</span>
                    </div>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">path_cost</span>
                    <span className="font-mono">{rec.path_cost.toFixed(3)}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">target_risk</span>
                    <span className="font-mono">{(rec.target_risk * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
