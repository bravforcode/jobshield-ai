"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WageRadar } from "@/components/wage-radar";
import type { WageRadarRow } from "@/lib/types";

interface Props {
  data: WageRadarRow[];
  compact?: boolean;
}

export function WageRadarCard({ data, compact = false }: Props) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Wage radar</CardTitle>
          <CardDescription>
            Centrality × median wage. Red = underpaid relative to the OLS model.
          </CardDescription>
        </div>
        {!compact && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/wage-radar">
              Full view <ArrowRight />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-2 sm:px-4">
        <WageRadar data={data} height={compact ? 320 : 460} />
        <div className="flex flex-wrap items-center gap-3 px-2 pt-2 text-[11px] text-muted-foreground sm:px-0">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-primary" />
            underpaid
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-foreground/60" />
            at or above model
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-px w-4 border-t border-dashed border-foreground/40" />
            OLS fit
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
