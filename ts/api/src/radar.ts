// Compute per-occupation underpayment signal (matches Python radar.py).

import type {
  CentralityPayload,
  PipelineArtifacts,
  WageRadarRow,
} from "@jobshield/shared/contracts";

function regressionPredict(x: number, allX: number[], allY: number[]): number {
  const n = allX.length;
  if (n === 0 || allX.length !== allY.length) return 0;
  if (n < 2) {
    return allY.reduce((a, b) => a + b, 0) / n;
  }
  const meanX = allX.reduce((a, b) => a + b, 0) / n;
  const meanY = allY.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = (allX[i] ?? 0) - meanX;
    sxx += dx * dx;
    sxy += dx * ((allY[i] ?? 0) - meanY);
  }
  if (sxx === 0) return meanY;
  const slope = sxy / sxx;
  return slope * (x - meanX) + meanY;
}

export function computeWageRadar(artifacts: PipelineArtifacts): WageRadarRow[] {
  const occs = Object.keys(artifacts.wage_data);
  const xs = occs.map((o) => artifacts.centrality.degree[o] ?? 0);
  const ys = occs.map((o) => artifacts.wage_data[o]?.median ?? 0);
  return occs.map((occ) => {
    const x = artifacts.centrality.degree[occ] ?? 0;
    const y = artifacts.wage_data[occ]?.median ?? 0;
    const predicted = regressionPredict(x, xs, ys);
    const gap = predicted !== 0 ? (predicted - y) / predicted : 0;
    return {
      occ,
      label: occ,
      centrality: x,
      wage: y,
      underpaid: gap > 0.05, // >5% gap = underpaid signal (positive gap = underpaid)
      gap_ratio: gap,
    };
  });
}
