// JobShield AI — Working-Paper front end
// Vanilla TS, no framework. Compiled to <7 KB of JS.

import type { PipelineArtifacts } from "../../shared/src/contracts.js";

// ----------------------------- Types -------------------------------------

interface OccupationSummary {
  code: string;
  label: string;
  wage_median: number;
  risk: number;
  degree_centrality: number;
  betweenness_centrality: number;
  underpayment_gap: number;
  predicted_wage: number;
  actual_wage: number;
}

interface HopExplanation {
  from: string;
  to: string;
  shared_skills: string[];
}

interface Recommendation {
  target: string;
  target_label: string;
  score: number;
  wage_delta: number;
  path_cost: number;
  target_risk: number;
  path: string[];
  path_explanation: HopExplanation[];
}

interface WageRadarRow {
  occ: string;
  label: string;
  centrality: number;
  wage: number;
  underpaid: boolean;
  gap_ratio: number;
}

// ----------------------------- Format ------------------------------------

const THB = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const fmtThb = (n: number) => `${THB.format(n)} THB`;
const fmtScore = (n: number) => n.toFixed(3);
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

// ----------------------------- DOM --------------------------------------

const sourceEl = document.getElementById("source") as HTMLSelectElement;
const sourceMetaEl = document.getElementById("source-meta") as HTMLElement;
const recsEl = document.getElementById("recs-list") as HTMLElement;
const radarCanvas = document.getElementById("radar") as HTMLCanvasElement;
const radarCaptionEl = document.getElementById("radar-caption") as HTMLElement;
const statOccEl = document.getElementById("stat-occ");
const statSkillEl = document.getElementById("stat-skill");
const statEdgeEl = document.getElementById("stat-edge");

let occupations: OccupationSummary[] = [];
let radarRows: WageRadarRow[] = [];
let selectedTarget: string | null = null;

// ----------------------------- Fetch ------------------------------------

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return (await res.json()) as T;
}

// ----------------------------- Corpus stats ------------------------------

async function loadCorpusStats(): Promise<void> {
  // The artifacts JSON has the truth: node count = occupations, edge count
  // (undirected) = transition_graph.edges.length / 2. We don't normally
  // ship the artifacts to the web; we hit the /api endpoints. But there
  // is no /api/stats yet, so we count from /api/occupations + the
  // /api/transition-graph endpoint we'll add. For now, derive from what
  // we already have.
  if (occupations.length > 0 && statOccEl) {
    statOccEl.textContent = String(occupations.length);
  }
  // Skill + edge counts are derived server-side; we expose a /api/stats
  // tiny endpoint below.
  try {
    const stats = await fetchJSON<{ skills: number; edges: number; occupations: number }>(
      "/api/stats",
    );
    if (statOccEl) statOccEl.textContent = String(stats.occupations);
    if (statSkillEl) statSkillEl.textContent = String(stats.skills);
    if (statEdgeEl) statEdgeEl.textContent = String(stats.edges);
  } catch {
    // /api/stats may not exist on older deploys; fall back to what we
    // know from the data we already loaded.
    if (statOccEl) statOccEl.textContent = String(occupations.length);
  }
}

// ----------------------------- Source picker ---------------------------

function renderSourceOptions(): void {
  sourceEl.innerHTML = "";
  // Sort by code (already alphabetical, but be defensive).
  const sorted = [...occupations].sort((a, b) => a.code.localeCompare(b.code));
  for (const o of sorted) {
    const opt = document.createElement("option");
    opt.value = o.code;
    opt.textContent = `${o.code}  ·  ${fmtThb(o.wage_median)}`;
    sourceEl.appendChild(opt);
  }
  sourceEl.disabled = false;
}

function renderSourceMeta(code: string): void {
  const o = occupations.find((x) => x.code === code);
  if (!o) {
    sourceMetaEl.textContent = "";
    return;
  }
  const riskPct = (o.risk * 100).toFixed(0);
  const centrality = o.degree_centrality.toFixed(2);
  const gapPct = (Math.abs(o.underpayment_gap) * 100).toFixed(1);
  const gapSign = o.underpayment_gap > 0.05 ? "+" : o.underpayment_gap < -0.05 ? "−" : "·";
  const gapWord =
    o.underpayment_gap > 0.05
      ? `underpaid ${gapPct}%`
      : o.underpayment_gap < -0.05
        ? `paid ${gapPct}% above model`
        : "on the model";
  sourceMetaEl.innerHTML =
    `<span class="num">${fmtThb(o.wage_median)}</span>` +
    `  ·  AI risk <span class="num">${riskPct}%</span>` +
    `  ·  degree centrality <span class="num">${centrality}</span>` +
    `  ·  wage gap <span class="num">${gapSign}${gapPct}%</span> (${gapWord})`;
}

// ----------------------------- Recommendations -------------------------

function renderRecommendations(recs: Recommendation[]): void {
  recsEl.innerHTML = "";
  if (recs.length === 0) {
    const empty = document.createElement("li");
    empty.innerHTML = `<div class="rec-empty">No reachable targets in the graph from this starting occupation.</div>`;
    recsEl.appendChild(empty);
    return;
  }

  // If a previous selection is no longer in the new list, drop it.
  if (selectedTarget && !recs.find((r) => r.target === selectedTarget)) {
    selectedTarget = null;
  }

  for (const r of recs) {
    const li = document.createElement("li");
    li.dataset.target = r.target;
    if (r.target === selectedTarget) li.classList.add("is-selected");

    const viaText = viaFor(r);
    const wageSign = r.wage_delta >= 0 ? "+" : "−";
    const riskPct = (r.target_risk * 100).toFixed(0);
    const detailId = `rec-detail-${cssEscape(r.target)}`;

    const row = document.createElement("div");
    row.className = "rec-row";

    const targetCol = document.createElement("div");
    const targetSpan = document.createElement("span");
    targetSpan.className = "rec-target";
    targetSpan.innerHTML = `${r.target}${viaText ? `  <span class="via">${viaText}</span>` : ""}`;
    targetCol.appendChild(targetSpan);

    const meta = document.createElement("div");
    meta.className = "rec-meta";
    const wageClass = r.wage_delta >= 0 ? "delta-pos" : "delta-neg";
    meta.innerHTML =
      `<span><span class="label">wage Δ</span> <span class="num ${wageClass}">${wageSign}${fmtThb(Math.abs(r.wage_delta))}</span></span>` +
      `<span><span class="label">score</span> <span class="num">${fmtScore(r.score)}</span></span>` +
      `<span><span class="label">risk</span> <span class="num">${riskPct}%</span></span>`;

    row.append(targetCol, meta);
    li.appendChild(row);

    const detail = document.createElement("div");
    detail.className = "rec-detail";
    detail.id = detailId;

    for (const hop of r.path_explanation) {
      const hopEl = document.createElement("div");
      hopEl.className = "rec-hop";

      const route = document.createElement("div");
      route.className = "hop-route";
      route.innerHTML = `${short(hop.from)} <span class="arrow">→</span> ${short(hop.to)}`;

      const skills = document.createElement("div");
      skills.className = "hop-skills";
      if (hop.shared_skills.length) {
        for (const s of hop.shared_skills) {
          const tag = document.createElement("span");
          tag.className = "skill";
          tag.textContent = s;
          skills.appendChild(tag);
        }
        // Bridge line: explain WHY this skill set connects them.
        const bridge = document.createElement("span");
        bridge.className = "hop-bridge";
        bridge.textContent = bridge_text(hop, r);
        skills.appendChild(bridge);
      } else {
        const note = document.createElement("span");
        note.className = "hop-bridge";
        note.textContent =
          "no direct skill overlap; bridge runs through PPMI co-occurrence in the skill graph";
        skills.appendChild(note);
      }

      hopEl.append(route, skills);
      detail.appendChild(hopEl);
    }

    // Score formula at the bottom of the open card.
    const formula = document.createElement("div");
    formula.className = "rec-formula";
    const pathCostStr = r.path_cost.toFixed(3);
    const scoreStr = fmtScore(r.score);
    formula.innerHTML =
      `<span class="label">score</span> = <b>${scoreStr}</b>` +
      `    <span class="label">path_cost</span> = <b>${pathCostStr}</b>` +
      `    <span class="label">target_risk</span> = <b>${riskPct}%</b>`;
    detail.appendChild(formula);

    li.appendChild(detail);
    recsEl.appendChild(li);
  }

  // If no selection yet, open the first card by default.
  if (!selectedTarget && recs.length > 0) {
    const first = recs[0];
    if (first) {
      selectedTarget = first.target;
      recsEl.firstElementChild?.classList.add("is-selected");
    }
  }

  // Click on a row toggles its selection.
  recsEl.addEventListener("click", onRecClick);
}

function onRecClick(ev: Event): void {
  const li = (ev.target as HTMLElement).closest("li");
  if (!li) return;
  const target = li.dataset.target;
  if (!target) return;
  selectedTarget = target;
  for (const el of Array.from(recsEl.querySelectorAll("li"))) el.classList.remove("is-selected");
  li.classList.add("is-selected");
}

function viaFor(r: Recommendation): string {
  // 0 hops means source == target (shouldn't happen, but be safe).
  if (r.path.length <= 1) return "";
  if (r.path.length === 2) return "";
  // 1 hop: show nothing extra (the path is just A → B).
  // 2+ hops: show "via X, Y".
  const intermediates = r.path.slice(1, -1);
  if (intermediates.length === 0) return "";
  return `via ${intermediates.map(short).join(", ")}`;
}

function short(code: string): string {
  return code.startsWith("occ.") ? code.slice(4) : code;
}

function bridge_text(hop: HopExplanation, _rec: Recommendation): string {
  // Quiet prose explaining what the shared skills are doing. The list
  // is already there; this is the headline.
  const n = hop.shared_skills.length;
  if (n === 0) return "";
  const w = n === 1 ? "1 shared skill" : `${n} shared skills`;
  // The user gets the raw tags already; this line just narrates.
  return `${w} carry the transition.`;
}

function cssEscape(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, "-");
}

// ----------------------------- Wage radar -----------------------------

function renderRadar(): void {
  const ctx = radarCanvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const cssW = radarCanvas.clientWidth || 960;
  const cssH = Math.round(cssW * (540 / 960));
  radarCanvas.width = cssW * dpr;
  radarCanvas.height = cssH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  if (radarRows.length === 0) {
    ctx.fillStyle = "#7a786e";
    ctx.font = 'italic 14px "IBM Plex Serif", Georgia, serif';
    ctx.fillText("No wage radar data.", 24, 32);
    return;
  }

  const pad = { l: 56, r: 24, t: 28, b: 40 };
  const plotW = cssW - pad.l - pad.r;
  const plotH = cssH - pad.t - pad.b;

  const xs = radarRows.map((r) => r.centrality);
  const ys = radarRows.map((r) => r.wage);
  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);
  const ymin = Math.min(...ys);
  const ymax = Math.max(...ys);
  const xrange = xmax - xmin || 1;
  const yrange = ymax - ymin || 1;

  const sx = (x: number) => pad.l + ((x - xmin) / xrange) * plotW;
  const sy = (y: number) => pad.t + plotH - ((y - ymin) / yrange) * plotH;

  // Frame.
  ctx.strokeStyle = "#1d2129";
  ctx.lineWidth = 1;
  ctx.strokeRect(pad.l, pad.t, plotW, plotH);

  // Ticks (4 per axis).
  ctx.fillStyle = "#7a786e";
  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let i = 0; i <= 4; i++) {
    const xv = xmin + (xrange * i) / 4;
    const px = sx(xv);
    ctx.fillText(xv.toFixed(2), px, pad.t + plotH + 6);
  }
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 4; i++) {
    const yv = ymin + (yrange * i) / 4;
    const py = sy(yv);
    ctx.fillText(THB.format(Math.round(yv)), pad.l - 6, py);
  }

  // Axis labels.
  ctx.font = 'italic 12px "IBM Plex Serif", Georgia, serif';
  ctx.fillStyle = "#b8b3a6";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("degree centrality (x)", pad.l + plotW / 2, pad.t + plotH + 20);
  ctx.save();
  ctx.translate(14, pad.t + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText("median wage (y)", 0, 0);
  ctx.restore();
  ctx.font = '11px "IBM Plex Mono", monospace';
  ctx.fillStyle = "#7a786e";

  // OLS fit line. Y on wage, X on centrality. Single-feature regression
  // computed in JS so it matches the server-side math.
  const { slope, intercept } = ols(xs, ys);
  // y = slope * x + intercept
  const yAtXMin = slope * xmin + intercept;
  const yAtXMax = slope * xmax + intercept;
  ctx.strokeStyle = "#2a2f3a";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(sx(xmin), sy(clamp(yAtXMin, ymin, ymax)));
  ctx.lineTo(sx(xmax), sy(clamp(yAtXMax, ymin, ymax)));
  ctx.stroke();
  ctx.setLineDash([]);

  // Points: underpaid in signal red, others in paper-ink.
  for (const r of radarRows) {
    const px = sx(r.centrality);
    const py = sy(r.wage);
    if (r.underpaid) {
      ctx.fillStyle = "#ff5b3e";
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fill();
      // halo
      ctx.strokeStyle = "rgba(255, 91, 62, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#e8e3d6";
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Code labels at the top performers (highest degree centrality).
  const top = [...radarRows].sort((a, b) => b.centrality - a.centrality).slice(0, 3);
  ctx.fillStyle = "#7a786e";
  ctx.font = '10px "IBM Plex Mono", monospace';
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  for (const r of top) {
    const px = sx(r.centrality);
    const py = sy(r.wage) - 8;
    ctx.fillText(short(r.occ), px + 6, py);
  }

  // Click / hover.
  radarCanvas.onmousemove = (ev) => {
    const rect = radarCanvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (cssW / rect.width);
    const y = (ev.clientY - rect.top) * (cssH / rect.height);
    const hit = nearest(x, y);
    if (hit && hit.d < 12) {
      renderRadarCaption(hit.r);
    } else {
      renderRadarCaption(null);
    }
  };
  radarCanvas.onmouseleave = () => renderRadarCaption(null);
  radarCanvas.onclick = (ev) => {
    const rect = radarCanvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (cssW / rect.width);
    const y = (ev.clientY - rect.top) * (cssH / rect.height);
    const hit = nearest(x, y);
    if (hit && hit.d < 12) {
      const summary = occupations.find((o) => o.code === hit.r.occ);
      if (summary) {
        sourceEl.value = hit.r.occ;
        loadRecommendations();
        sourceEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // Hidden accessible table for screen readers.
  renderRadarTable();

  function nearest(x: number, y: number): { r: WageRadarRow; d: number } | null {
    let best: { r: WageRadarRow; d: number } | null = null;
    for (const r of radarRows) {
      const px = sx(r.centrality);
      const py = sy(r.wage);
      const d = Math.hypot(px - x, py - y);
      if (best === null || d < best.d) best = { r, d };
    }
    return best;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function ols(xs: number[], ys: number[]): { slope: number; intercept: number } {
  const n = xs.length;
  if (n < 2) {
    return { slope: 0, intercept: n > 0 ? (ys[0] ?? 0) : 0 };
  }
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] ?? 0) - meanX;
    sxx += dx * dx;
    sxy += dx * ((ys[i] ?? 0) - meanY);
  }
  if (sxx === 0) return { slope: 0, intercept: meanY };
  const slope = sxy / sxx;
  return { slope, intercept: meanY - slope * meanX };
}

function renderRadarCaption(r: WageRadarRow | null): void {
  if (!r) {
    radarCaptionEl.innerHTML = "Hover or tap a point. Red = underpaid relative to the model.";
    return;
  }
  const pct = (r.gap_ratio * 100).toFixed(1);
  const verdict = r.underpaid
    ? `<span class="underpaid">underpaid ${pct}%</span> vs model`
    : `paid ${pct}% above model`;
  radarCaptionEl.innerHTML =
    `<b>${r.occ}</b>  ·  centrality ${r.centrality.toFixed(2)}` +
    `  ·  median wage ${fmtThb(r.wage)}` +
    `  ·  ${verdict}`;
}

function renderRadarTable(): void {
  // Off-screen accessible table mirroring the canvas.
  let table = document.getElementById("radar-table");
  if (!table) {
    table = document.createElement("table");
    table.id = "radar-table";
    table.className = "radar-table";
    document.body.appendChild(table);
  }
  const rows = [...radarRows]
    .sort((a, b) => b.centrality - a.centrality)
    .map(
      (r) =>
        `<tr><td>${r.occ}</td><td>${r.centrality.toFixed(3)}</td><td>${THB.format(r.wage)}</td><td>${(r.gap_ratio * 100).toFixed(1)}%</td></tr>`,
    )
    .join("");
  table.innerHTML = `<caption>Wage radar data, sorted by centrality</caption><thead><tr><th>Code</th><th>Centrality</th><th>Median wage (THB)</th><th>Gap vs model</th></tr></thead><tbody>${rows}</tbody>`;
}

// ----------------------------- Lifecycle ---------------------------------

async function loadOccupations(): Promise<void> {
  occupations = await fetchJSON<OccupationSummary[]>("/api/occupations");
  occupations.sort((a, b) => a.code.localeCompare(b.code));
  renderSourceOptions();
}

async function loadRadar(): Promise<void> {
  radarRows = await fetchJSON<WageRadarRow[]>("/api/wage-radar");
  renderRadar();
}

async function loadRecommendations(): Promise<void> {
  const source = sourceEl.value;
  renderSourceMeta(source);
  const url = `/api/recommend?source=${encodeURIComponent(source)}&topN=5`;
  const data = await fetchJSON<{ source: string; recommendations: Recommendation[] }>(url);
  renderRecommendations(data.recommendations);
}

async function main(): Promise<void> {
  try {
    await loadOccupations();
    await loadRadar();
    await loadRecommendations();
    await loadCorpusStats();
  } catch (err) {
    // Fail quiet: print to the dev console; show a single line in the
    // recommender section. The page never goes blank.
    // eslint-disable-next-line no-console
    console.error("[jobshield] init failed:", err);
    recsEl.innerHTML = `<li><div class="rec-empty">API unreachable: ${(err as Error).message}</div></li>`;
  }
  sourceEl.addEventListener("change", () => {
    loadRecommendations().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[jobshield] recommend failed:", err);
    });
  });
  // Redraw the radar when the canvas resizes (responsive layout).
  const ro = new ResizeObserver(() => renderRadar());
  ro.observe(radarCanvas);
}

main();
