# JobShield All-Remaining — S2+S3+S4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish everything: S2 UX polish, S3 spec compliance, S4 long-term infra — ship enterprise PWA with rate-limit, OpenAPI, Yen API, i18n, 30-seed, Vitest.

**Architecture:** Keep Next.js at root, split work into 5 parallel domains (no file overlap): A=UX components, B=SEO, C=API hardening, D=Quality/docs, E=Infra. Each domain owns its files; mock data enrich is additive.

**Tech Stack:** Next.js 16 (webpack), React 19, TS5, Tailwind4, shadcn, Biome, Bun1.3, Python3.12 uv, Vitest, next-intl (or lightweight toggle), PWA (next-pwa or manual manifest).

## Global Constraints
- `bun run typecheck` 0, `bun run lint` 0, `bunx next build --webpack` 12+ routes, `uv run -k "not e2e"` 142 pass
- No `ts/api` resurrection — all APIs are `src/app/api/*`
- Keep `src/lib/data.server.ts` as only fs surface
- Dark/light signal red only

---

### Task A1: Mobile nav + cmdk palette

**Files:**
- Create: `src/components/mobile-nav.tsx`
- Create: `src/components/command-palette.tsx`
- Modify: `src/components/site-header.tsx:12-45` (add hamburger + Cmd+K button)

**Interfaces:**
- Consumes: `src/components/ui/button.tsx`, `src/components/ui/command.tsx`, `src/lib/types.ts`
- Produces: Mobile drawer + Cmd+K that lists 18 occupations → `router.push(/recommend?source=occ.xxx)`

- [ ] Step 1: Write `mobile-nav.tsx` — Sheet/drawer with links /, /recommend, /wage-radar, /mechanism
- [ ] Step 2: Write `command-palette.tsx` — `useEffect` for `cmdk` open on `Cmd+K`, list `occupations` prop, onSelect `router.push`
- [ ] Step 3: Wire into `site-header.tsx` — hamburger visible `<md`, Cmd+K button `hidden md:flex`
- [ ] Step 4: `bun run typecheck && bun run lint`

---

### Task A2: Deep-link copy + skeletons + radar compare + print + citations

**Files:**
- Modify: `src/app/recommend/recommender-client.tsx` — add CopyLink button (`navigator.clipboard.writeText(location.href)`), toast
- Modify: `src/components/wage-radar.tsx` — onPointClick → `onPick` already exists, ensure hero radar `onPick` navigates
- Modify: `src/app/wage-radar/page.tsx:20-60` — add Export SVG/PNG button (`canvas.toDataURL` via recharts ref)
- Create: `src/app/print.css` or add `@media print` to `globals.css`
- Modify: `src/components/recommendations-list.tsx` — add citation tooltip `spec §5.3` on score hover

**Interfaces:**
- Consumes: `sonner`, `recharts` ref
- Produces: Shareable URLs, printable page

- [ ] Step 1: Add CopyLink
- [ ] Step 2: Add Export
- [ ] Step 3: Add print styles
- [ ] Step 4: Add citation tooltips

---

### Task B1: Static OG + dynamic SEO per page

**Files:**
- Create: `public/og.png` (or `public/og.svg` 1200x630, Shield + title)
- Modify: `src/app/layout.tsx` — `metadata.openGraph.images = [{url:"/og.png", width:1200, height:630}]`
- Modify: `src/app/recommend/page.tsx`, `src/app/wage-radar/page.tsx`, `src/app/mechanism/page.tsx` — export `metadata` with title/description
- Modify: `src/app/robots.ts`, `src/app/sitemap.ts` already done — verify
- Modify: `src/components/site-header.tsx` — ensure no duplicate OG

**Interfaces:**
- Consumes: nothing
- Produces: Share preview

- [ ] Step 1: Add `public/og.png` (simple placeholder)
- [ ] Step 2: Export per-page `metadata`
- [ ] Step 3: Verify `curl /robots.txt` `/sitemap.xml`

---

### Task B2: JSON-LD + entrance animation

**Files:**
- Create: `src/components/json-ld.tsx`
- Modify: `src/app/layout.tsx` — inject `<script type="application/ld+json">` for WebApplication
- Modify: `src/components/hero.tsx`, `src/components/features.tsx` — `motion` whileInView stagger already exists, ensure reduced-motion

**Interfaces:**
- Consumes: `motion`
- Produces: SEO structured data

- [ ] Step 1: Write `json-ld.tsx`
- [ ] Step 2: Inject in layout

---

### Task C1: Rate limit (per-IP token bucket) + topN docs

**Files:**
- Create: `src/lib/rate-limit.ts` — `Map<ip, {count, reset}>`, 60/min, returns 429 + `Retry-After`
- Modify: `src/app/api/recommend/route.ts:6-25` — call `checkRateLimit(req)` before logic
- Modify: `src/app/api/recommend/route.ts` — document clamp 1..50 in JSDoc
- Create: `src/lib/openapi.ts` or `public/openapi.json` later

**Interfaces:**
- Consumes: `next/server` NextRequest `ip` or `x-forwarded-for`
- Produces: 429 protection

- [ ] Step 1: Write `rate-limit.ts` — 60 req/min, in-memory
- [ ] Step 2: Wire into `recommend` route
- [ ] Step 3: Test `curl` 61st 429

---

### Task C2: Yen K=3 API + Validation API

**Files:**
- Create: `src/app/api/yen/route.ts` — `GET ?source=&target=&k=3` → call `yenKShortest` port or precomputed
- Create: `src/lib/yen.ts` — TS port of `py/src/jobshield/path/yen.py` or reuse `data/artifacts.json` if yen precomputed
- Create: `src/app/api/validation/route.ts` — returns threshold constants from spec §7

**Interfaces:**
- Consumes: `src/lib/data.server.ts` `getArtifacts()`
- Produces: `/api/yen` and `/api/validation`

- [ ] Step 1: Port Yen or use precomputed
- [ ] Step 2: Write route with validation
- [ ] Step 3: Verify `curl /api/yen?source=occ.data_entry&target=occ.junior_data_analyst&k=3`

---

### Task C3: OpenAPI spec

**Files:**
- Create: `public/openapi.json` — 6 existing + 2 new endpoints, schemas for Occupation/Recommendation/WageRadar
- Create: `src/app/api/openapi/route.ts` — serve JSON or static
- Modify: `README.md` — link to `/openapi.json`

**Interfaces:**
- Consumes: API route signatures
- Produces: DX doc

---

### Task D1: Vitest + CHANGELOG/CONTRIBUTING + formulas visual

**Files:**
- Create: `vitest.config.ts` + `src/lib/__tests__/data.test.ts` (stats 18/46/119, gap calc)
- Create: `CHANGELOG.md` (v2.0.0 sprint1, v2.1.0 all-remaining)
- Create: `CONTRIBUTING.md` (bun + uv quickstart)
- Modify: `src/app/mechanism/page.tsx` — render formulas with `katex` or `<code>` + citations link to spec §

**Interfaces:**
- Consumes: `vitest`, `jsdom`
- Produces: `bun run test` now runs

---

### Task E1: Node pin + PWA + i18n toggle + top-30 seed

**Files:**
- Create: `.nvmrc` (`24`), Modify: `package.json` `engines.node = ">=20"`
- Create: `public/manifest.json` + `public/sw.js` or `next-pwa` config, Modify: `src/app/layout.tsx` manifest link
- Create: `src/lib/i18n.ts` + `src/components/lang-toggle.tsx` (EN/TH toggle, stores in `localStorage`, uses `LABELS` bilingual)
- Modify: `data/mock/job_postings.json` — enrich/add 12 occupations to reach 30 (ESCO-style) OR keep 18 and add labels only if time
- Modify: `src/app/layout.tsx` — add `<link rel="manifest">`

**Interfaces:**
- Consumes: `LABELS` bilingual
- Produces: PWA installable, pinned Node

---

### Task F: Final verification + deploy

**Files:** none

- [ ] Step 1: `bun run typecheck`
- [ ] Step 2: `bun run lint`
- [ ] Step 3: `bun run build` → 14+ routes
- [ ] Step 4: `uv run --directory py pytest -k "not e2e" -q` → 142
- [ ] Step 5: `bun run test` (vitest) → pass
- [ ] Step 6: `vercel --prod --yes` → READY, check `/robots.txt` `/sitemap.xml` `/api/yen` `/api/validation` `/openapi.json`
