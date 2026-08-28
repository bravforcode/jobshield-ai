// Load + validate the artifacts JSON produced by the Python CLI.

import type { PipelineArtifacts } from "@jobshield/shared/contracts";

const REQUIRED_KEYS: Array<keyof PipelineArtifacts> = [
  "skill_graph",
  "transition_graph",
  "centrality",
  "wage_data",
  "risk_scores",
  "recommendations",
];

export class ArtifactsLoadError extends Error {}

export async function loadArtifacts(path: string): Promise<PipelineArtifacts> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new ArtifactsLoadError(`artifacts file not found: ${path}`);
  }
  let raw: unknown;
  try {
    raw = await file.json();
  } catch (err) {
    throw new ArtifactsLoadError(`artifacts file is not valid JSON: ${(err as Error).message}`);
  }
  return validateArtifacts(raw);
}

export function validateArtifacts(raw: unknown): PipelineArtifacts {
  if (typeof raw !== "object" || raw === null) {
    throw new ArtifactsLoadError("artifacts root must be an object");
  }
  const obj = raw as Record<string, unknown>;
  for (const k of REQUIRED_KEYS) {
    if (!(k in obj)) {
      throw new ArtifactsLoadError(`artifacts missing required key: ${k}`);
    }
  }
  // Light shape checks. Full schema validation is a follow-up.
  if (!Array.isArray(obj.transition_graph)) {
    const tg = obj.transition_graph as { nodes?: unknown; edges?: unknown };
    if (!Array.isArray(tg.nodes) || !Array.isArray(tg.edges)) {
      throw new ArtifactsLoadError("transition_graph.nodes/edges must be arrays");
    }
  }
  if (typeof obj.centrality !== "object" || obj.centrality === null) {
    throw new ArtifactsLoadError("centrality must be an object");
  }
  if (typeof obj.wage_data !== "object" || obj.wage_data === null) {
    throw new ArtifactsLoadError("wage_data must be an object");
  }
  return obj as unknown as PipelineArtifacts;
}
