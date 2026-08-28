// Shared TypeScript contracts mirroring the Python PipelineArtifacts.to_dict() shape.
// Keep in sync with py/src/jobshield/types.py (PipelineArtifacts).

export interface SkillGraphPayload {
  nodes: string[];
  freq: Record<string, number>;
  edges: Array<{ a: string; b: string; ppmi: number }>;
}

export interface TransitionEdgePayload {
  source: string;
  target: string;
  skill_distance: number;
  shared_skills: string[];
}

export interface TransitionGraphPayload {
  nodes: string[];
  edges: TransitionEdgePayload[];
}

export interface CentralityPayload {
  degree: Record<string, number>;
  betweenness: Record<string, number>;
}

export interface WageStatsPayload {
  median: number;
  p25: number;
  p75: number;
  sample_count: number;
}

export interface HopExplanation {
  from: string;
  to: string;
  shared_skills: string[];
}

export interface RecommendationPayload {
  target: string;
  target_label: string;
  score: number;
  wage_delta: number;
  path_cost: number;
  target_risk: number;
  path: string[];
  path_explanation: HopExplanation[];
}

export interface PipelineArtifacts {
  skill_graph: SkillGraphPayload;
  transition_graph: TransitionGraphPayload;
  centrality: CentralityPayload;
  wage_data: Record<string, WageStatsPayload>;
  risk_scores: Record<string, number>;
  recommendations: Record<string, RecommendationPayload[]>;
}

export interface OccupationSummary {
  code: string;
  label: string;
  wage_median: number;
  risk: number;
  degree_centrality: number;
  betweenness_centrality: number;
  underpayment_gap: number; // (predicted - actual) / predicted; positive = underpaid
  predicted_wage: number;
  actual_wage: number;
}

export interface WageRadarRow {
  occ: string;
  label: string;
  centrality: number;
  wage: number;
  underpaid: boolean;
  gap_ratio: number;
}
