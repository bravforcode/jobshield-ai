// Web UI: vanilla TS, no framework. Calls the API at /api/*.

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

const fmtThb = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} THB`;
const fmtScore = (n: number) => n.toFixed(3);
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

const sourceEl = document.getElementById("source") as HTMLSelectElement;
const sourceMetaEl = document.getElementById("source-meta") as HTMLElement;
const recsEl = document.getElementById("recs") as HTMLElement;
const radarCanvas = document.getElementById("radar") as HTMLCanvasElement;
const radarDetailEl = document.getElementById("radar-detail") as HTMLElement;

let occupations: OccupationSummary[] = [];
let radarRows: WageRadarRow[] = [];

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return (await res.json()) as T;
}

function renderSourceOptions() {
  sourceEl.innerHTML = "";
  for (const o of occupations) {
    const opt = document.createElement("option");
    opt.value = o.code;
    opt.textContent = `${o.code} — ${fmtThb(o.wage_median)} (risk ${(o.risk * 100).toFixed(0)}%)`;
    sourceEl.appendChild(opt);
  }
  sourceEl.disabled = false;
}

function renderRecommendations(recs: Recommendation[]) {
  recsEl.innerHTML = "";
  if (recs.length === 0) {
    recsEl.innerHTML = `<div class="muted">No reachable targets in the graph.</div>`;
    return;
  }
  for (const r of recs) {
    const card = document.createElement("div");
    card.className = "card";

    const head = document.createElement("div");
    head.className = "card-head";
    const target = document.createElement("div");
    target.className = "card-target";
    target.textContent = `${r.target}`;
    const meta = document.createElement("div");
    meta.className = "card-meta";
    const wageSign = r.wage_delta >= 0 ? "+" : "";
    meta.textContent = `wage Δ ${wageSign}${fmtThb(r.wage_delta)} · risk ${fmtPct(r.target_risk)}`;
    head.append(target, meta);
    card.appendChild(head);

    const path = document.createElement("div");
    path.className = "path";
    path.textContent = r.path.join(" → ");
    card.appendChild(path);

    for (const hop of r.path_explanation) {
      const h = document.createElement("div");
      h.className = "hop";
      const from = hop.from;
      const to = hop.to;
      const tags = hop.shared_skills.length
        ? hop.shared_skills.map((s) => `<span class="skill-tag">${s}</span>`).join(" ")
        : `<span class="muted">no direct skill overlap (bridged via PPMI)</span>`;
      h.innerHTML = `<div><strong>${from} → ${to}</strong></div><div>${tags}</div>`;
      card.appendChild(h);
    }

    const scoreLine = document.createElement("div");
    scoreLine.className = "score-line";
    scoreLine.innerHTML = `score = <b>${fmtScore(r.score)}</b> · path_cost = <b>${r.path_cost.toFixed(3)}</b>`;
    card.appendChild(scoreLine);

    recsEl.appendChild(card);
  }
}

function renderRadar() {
  const ctx = radarCanvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const cssW = radarCanvas.clientWidth || 640;
  const cssH = 360;
  radarCanvas.width = cssW * dpr;
  radarCanvas.height = cssH * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, cssW, cssH);
  const pad = { l: 50, r: 12, t: 16, b: 32 };
  const plotW = cssW - pad.l - pad.r;
  const plotH = cssH - pad.t - pad.b;

  if (radarRows.length === 0) return;
  const xs = radarRows.map((r) => r.centrality);
  const ys = radarRows.map((r) => r.wage);
  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);
  const ymin = Math.min(...ys);
  const ymax = Math.max(...ys);
  const xrange = xmax - xmin || 1;
  const yrange = ymax - ymin || 1;

  // Axes.
  ctx.strokeStyle = "#2a3142";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, pad.t + plotH);
  ctx.lineTo(pad.l + plotW, pad.t + plotH);
  ctx.stroke();

  // Labels.
  ctx.fillStyle = "#8b91a1";
  ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("degree centrality →", pad.l, pad.t + plotH + 24);
  ctx.save();
  ctx.translate(14, pad.t + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("median wage (THB) →", 0, 0);
  ctx.restore();

  // Points.
  for (const r of radarRows) {
    const px = pad.l + ((r.centrality - xmin) / xrange) * plotW;
    const py = pad.t + plotH - ((r.wage - ymin) / yrange) * plotH;
    ctx.fillStyle = r.underpaid ? "#ff6e6e" : "#4cc2ff";
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Click → show details.
  radarCanvas.onclick = (ev) => {
    const rect = radarCanvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (cssW / rect.width);
    const y = (ev.clientY - rect.top) * (cssH / rect.height);
    let nearest: WageRadarRow | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    for (const r of radarRows) {
      const px = pad.l + ((r.centrality - xmin) / xrange) * plotW;
      const py = pad.t + plotH - ((r.wage - ymin) / yrange) * plotH;
      const d = Math.hypot(px - x, py - y);
      if (d < bestD) {
        bestD = d;
        nearest = r;
      }
    }
    if (nearest && bestD < 20) {
      const r = nearest as WageRadarRow;
      radarDetailEl.textContent = `${r.occ} — centrality ${r.centrality.toFixed(3)}, wage ${fmtThb(r.wage)}, underpaid gap ${fmtPct(r.gap_ratio)}`;
    }
  };
}

async function loadOccupations() {
  occupations = await fetchJSON<OccupationSummary[]>("/api/occupations");
  occupations.sort((a, b) => a.code.localeCompare(b.code));
  renderSourceOptions();
}

async function loadRadar() {
  radarRows = await fetchJSON<WageRadarRow[]>("/api/wage-radar");
  renderRadar();
}

async function loadRecommendations() {
  const source = sourceEl.value;
  const url = `/api/recommend?source=${encodeURIComponent(source)}&topN=5`;
  const data = await fetchJSON<{ source: string; recommendations: Recommendation[] }>(url);
  const src = occupations.find((o) => o.code === source);
  if (src) {
    sourceMetaEl.textContent = `wage ${fmtThb(src.wage_median)} · risk ${(src.risk * 100).toFixed(0)}% · centrality ${src.degree_centrality.toFixed(2)}`;
  }
  renderRecommendations(data.recommendations);
}

async function main() {
  try {
    await loadOccupations();
    await loadRadar();
    await loadRecommendations();
  } catch (err) {
    recsEl.innerHTML = `<div class="muted">API error: ${(err as Error).message}</div>`;
  }
  sourceEl.addEventListener("change", () => {
    loadRecommendations().catch((err) => {
      recsEl.innerHTML = `<div class="muted">API error: ${(err as Error).message}</div>`;
    });
  });
}

main();
