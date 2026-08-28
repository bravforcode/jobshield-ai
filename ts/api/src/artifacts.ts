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
  let raw: unknown;
  // Bun runtime (local dev): use Bun.file for speed.
  // Vercel Node runtime: Bun is undefined, fallback to fs.
  const bunFile = (globalThis as unknown as { Bun?: { file: (p: string) => { exists: () => Promise<boolean>; json: () => Promise<unknown> } } }).Bun?.file(path);
  if (bunFile) {
    if (!(await bunFile.exists())) {
      throw new ArtifactsLoadError(`artifacts file not found: ${path}`);
    }
    try {
      raw = await bunFile.json();
    } catch (err) {
      throw new ArtifactsLoadError(`artifacts file is not valid JSON: ${(err as Error).message}`);
    }
  } else {
    // Node fallback (Vercel)
    const { readFile, access } = await import("node:fs/promises");
    try {
      await access(path);
    } catch {
      throw new ArtifactsLoadError(`artifacts file not found: ${path}`);
    }
    try {
      const text = await readFile(path, "utf-8");
      raw = JSON.parse(text);
    } catch (err) {
      throw new ArtifactsLoadError(`artifacts file is not valid JSON: ${(err as Error).message}`);
    }
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
