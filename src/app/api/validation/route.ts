import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      spec: "v2",
      thresholds: {
        ppmi_min: 0,
        skill_distance_max: 0.85,
        topN_default: 5,
        topN_max: 50,
        rate_limit_per_min: 60,
        wage_gap_underpaid: 0.05,
        risk_alpha: 0.6,
        risk_gamma: 0.4,
        rank_beta: 0.5,
        rank_gamma2: 0.3,
        yen_k_default: 3,
        yen_k_max: 5,
      },
      invariants: [
        "edge_cost = alpha*dist_norm + gamma*risk_norm >= 0",
        "Layer-2 score = beta*wage_norm - path_cost - gamma2*risk",
        "PPMI = max(0, log P(a,b)/(P(a)*P(b)))",
      ],
      validation: {
        absolute_threshold: 0.3,
        q1_undirected: "computed from distribution",
        adversarial: "sabotage test catches broken graph",
      },
    },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}
