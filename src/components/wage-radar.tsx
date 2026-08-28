"use client";

import * as React from "react";
import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import type { WageRadarRow } from "@/lib/types";
import { formatThb } from "@/lib/utils";

interface Props {
  data: WageRadarRow[];
  highlightOcc?: string;
  onPick?: (occ: string) => void;
  height?: number;
  showAxes?: boolean;
}

interface Point {
  x: number;
  y: number;
  occ: string;
  label: string;
  underpaid: boolean;
  gap: number;
}

export function WageRadar({ data, highlightOcc, onPick, height = 360, showAxes = true }: Props) {
  const points: Point[] = React.useMemo(
    () =>
      data.map((d) => ({
        x: d.centrality,
        y: d.wage,
        occ: d.occ,
        label: d.label,
        underpaid: d.underpaid,
        gap: d.gap_ratio,
      })),
    [data],
  );

  const { slope, intercept, xMin, xMax, yMin, yMax } = React.useMemo(
    () =>
      fitLine(
        points.map((p) => p.x),
        points.map((p) => p.y),
      ),
    [points],
  );

  const fitStart = clamp(slope * xMin + intercept, yMin, yMax);
  const fitEnd = clamp(slope * xMax + intercept, yMin, yMax);

  return (
    <div className="relative w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart
          margin={{ top: 16, right: 24, bottom: showAxes ? 36 : 16, left: showAxes ? 16 : 16 }}
        >
          <CartesianGrid stroke="currentColor" strokeOpacity={0.08} strokeDasharray="2 4" />
          {showAxes && (
            <>
              <XAxis
                type="number"
                dataKey="x"
                domain={[xMin, xMax]}
                tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
                stroke="currentColor"
                strokeOpacity={0.2}
                label={{
                  value: "degree centrality",
                  position: "insideBottom",
                  offset: -16,
                  fontSize: 11,
                  fill: "currentColor",
                  opacity: 0.5,
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[yMin, yMax]}
                tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                stroke="currentColor"
                strokeOpacity={0.2}
                width={48}
                label={{
                  value: "median wage (THB/mo)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 12,
                  style: { textAnchor: "middle" },
                  fontSize: 11,
                  fill: "currentColor",
                  opacity: 0.5,
                }}
              />
            </>
          )}
          {showAxes && (
            <ReferenceLine
              segment={[
                { x: xMin, y: fitStart },
                { x: xMax, y: fitEnd },
              ]}
              stroke="currentColor"
              strokeOpacity={0.25}
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            />
          )}
          <Tooltip
            cursor={{ strokeOpacity: 0.4 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload as Point;
              return (
                <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                  <div className="font-semibold">{p.label}</div>
                  <div className="mt-1 flex flex-col gap-0.5 text-muted-foreground">
                    <span>centrality {p.x.toFixed(2)}</span>
                    <span>{formatThb(p.y)}</span>
                    {p.underpaid ? (
                      <Badge variant="signal" className="mt-1 self-start">
                        underpaid {(p.gap * 100).toFixed(1)}%
                      </Badge>
                    ) : (
                      <span>paid {(p.gap * 100).toFixed(1)}% above model</span>
                    )}
                  </div>
                </div>
              );
            }}
          />
          <Scatter
            data={points}
            onClick={(p) => onPick?.((p as unknown as Point).occ)}
            style={{ cursor: onPick ? "pointer" : "default" }}
          >
            {points.map((p) => (
              <Cell
                key={p.occ}
                fill={p.underpaid ? "var(--primary)" : "currentColor"}
                fillOpacity={highlightOcc === p.occ ? 1 : p.underpaid ? 0.9 : 0.5}
                stroke={highlightOcc === p.occ ? "var(--primary)" : "transparent"}
                strokeWidth={highlightOcc === p.occ ? 2 : 0}
                r={highlightOcc === p.occ ? 8 : p.underpaid ? 5 : 3.5}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function fitLine(
  xs: number[],
  ys: number[],
): { slope: number; intercept: number; xMin: number; xMax: number; yMin: number; yMax: number } {
  if (xs.length < 2) {
    return { slope: 0, intercept: ys[0] ?? 0, xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  }
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = (xs[i] ?? 0) - meanX;
    sxx += dx * dx;
    sxy += dx * ((ys[i] ?? 0) - meanY);
  }
  if (sxx === 0) return { slope: 0, intercept: meanY, xMin, xMax, yMin, yMax };
  const slope = sxy / sxx;
  return { slope, intercept: meanY - slope * meanX, xMin, xMax, yMin, yMax };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
