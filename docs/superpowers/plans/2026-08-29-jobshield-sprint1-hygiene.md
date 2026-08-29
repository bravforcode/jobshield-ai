# JobShield Sprint 1 — Hygiene & Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship P0 hygiene so the repo no longer looks like `create-next-app` boilerplate and no route throws a white screen.

**Architecture:** Keep Next.js 16 at repo root, keep `src/lib/data.server.ts` as only `node:fs` surface, fix lint/type/build before adding features. Each task is independently commitable.

**Tech Stack:** Next.js 16 (App Router, webpack prod), React 19, TypeScript 5 (bundler), Tailwind 4, shadcn/ui (Radix), Biome 2.5, Bun 1.3.14, Python 3.12 + uv (145 tests remain green).

## Global Constraints
- `bun run typecheck` must stay 0 errors (tsconfig includes `src/**/*.ts` only, excludes `ts,py,tests,apps,docs`)
- `bun run lint` must stay 0 errors (Biome a11y rules — use `role="separator"` only on `<hr>` or suppress)
- `bun run build` = `bunx next build --webpack` must stay green (10 routes: ○ /, ○ /mechanism, ƒ /recommend, ƒ /wage-radar, ƒ 6 apis)
- `uv run --directory py pytest -q` must stay 145 pass
- Never add `html,css` vanilla files — all UI via shadcn/Tailwind per user instruction

---

### Task 1: Remove boilerplate public assets + fix favicon

**Files:**
- Delete: `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`
- Modify: `src/app/favicon.ico` (replace with 1x1 transparent or Shield SVG ico)
- Modify: `.gitignore` — ensure `/.next` and `/out` stay ignored

**Interfaces:**
- Consumes: nothing
- Produces: clean `public/` (empty or only brand assets)

- [ ] Step 1: Verify boilerplate exists — `Get-ChildItem public`
- [ ] Step 2: Delete 5 svgs — `Remove-Item public/*.svg`
- [ ] Step 3: Generate/verify favicon — keep existing `favicon.ico` if valid, else add `src/app/icon.svg` with Shield
- [ ] Step 4: Run `bun run build` — expect no asset 404
- [ ] Step 5: Commit — `git add public src/app/favicon.ico && git commit -m "chore(public): remove Next.js boilerplate svgs"`

---

### Task 2: Add route resilience (loading / error / not-found)

**Files:**
- Create: `src/app/loading.tsx` (skeleton for `/`)
- Create: `src/app/error.tsx` (`"use client"`, reset button)
- Create: `src/app/not-found.tsx` (404 with link to `/`, `/recommend`)
- Create: `src/app/recommend/loading.tsx` (skeleton)
- Create: `src/app/wage-radar/loading.tsx` (skeleton)

**Interfaces:**
- Consumes: `src/components/ui/skeleton.tsx`, `src/components/ui/button.tsx`
- Produces: Next.js file-convention handlers (no API change)

- [ ] Step 1: Write `src/app/loading.tsx` — centered `<Skeleton className="h-32 w-full max-w-[1240px]" />`
- [ ] Step 2: Write `src/app/error.tsx` — `"use client"`; props `{error: Error, reset: () => void}`; render `Card` with `error.message` + `<Button onClick={reset}>Try again</Button>`
- [ ] Step 3: Write `src/app/not-found.tsx` — `h1 404` + `Link href="/"` + `Link href="/recommend"`
- [ ] Step 4: Write `src/app/recommend/loading.tsx` + `src/app/wage-radar/loading.tsx` — 3 skeletons
- [ ] Step 5: Run `bun run typecheck && bun run build` — 12 routes (adds 3 loading)
- [ ] Step 6: Commit

---

### Task 3: Fix useSearchParams Suspense guard + deep-link polish

**Files:**
- Modify: `src/components/source-picker.tsx:1-60` — add `Suspense` boundary or move `useSearchParams` to server-passed prop
- Modify: `src/app/recommend/recommender-client.tsx` — derive initial `source` from `searchParams.get("source")` fallback to `occupations[0].code`; ensure `router.replace` preserves scroll:false
- Modify: `src/components/recommendations-list.tsx` — no change unless Suspense fix leaks

**Interfaces:**
- Consumes: `src/lib/types.ts` (`Occupation`)
- Produces: No Next 16 `useSearchParams() should be wrapped in suspense` warning

- [ ] Step 1: Wrap `SourcePicker` internals or lift `useSearchParams` to page and pass `searchParams` as prop
- [ ] Step 2: Verify `recommender-client.tsx` fetches `/api/recommend?source=` and updates on `source` change
- [ ] Step 3: Manual verify `curl http://localhost:4001/recommend?source=occ.cashier` still deep-links
- [ ] Step 4: Commit

---

### Task 4: SEO basics (robots, sitemap, OG)

**Files:**
- Create: `src/app/robots.ts` (Next.js MetadataRoute.Robots)
- Create: `src/app/sitemap.ts` (MetadataRoute.Sitemap for `/`, `/recommend`, `/wage-radar`, `/mechanism`)
- Create: `src/app/opengraph-image.tsx` (optional — `next/og` ImageResponse 1200x630) or `public/og.png`
- Modify: `src/app/layout.tsx` — ensure `metadata.openGraph.images` points to `opengraph-image`

**Interfaces:**
- Consumes: `src/lib/data.server.ts` not needed (static routes only)
- Produces: `/robots.txt` and `/sitemap.xml` at build

- [ ] Step 1: Write `src/app/robots.ts` — `export default function robots(): MetadataRoute.Robots { return { rules: [{userAgent:"*", allow:"/"}], sitemap:"https://jobsume.vercel.app/sitemap.xml" } }`
- [ ] Step 2: Write `src/app/sitemap.ts` — 4 entries with `changeFrequency`, `priority`
- [ ] Step 3: Add `src/app/opengraph-image.tsx` if time — else `public/og.png`
- [ ] Step 4: Run `bun run build` — check output lists `/robots.txt` `/sitemap.xml`
- [ ] Step 5: Commit

---

### Task 5: Rewrite README + clean AGENTS.md/CLAUDE.md

**Files:**
- Modify: `README.md` (replace Next.js default 1450 chars with JobShield quickstart: `bun install`, `uv run ... build`, `bun run dev`, 4 pages, 6 apis, `data/artifacts.json`)
- Modify: `AGENTS.md` / `CLAUDE.md` — trim boilerplate or delete if redundant
- Modify: `.gitignore` — add `tsconfig.tsbuildinfo`, `.env.production` if not already

**Interfaces:**
- Consumes: `PRODUCT.md`, `src/DIRECTION.md`
- Produces: Onboarding doc

- [ ] Step 1: Read current `README.md`
- [ ] Step 2: Write new README with Stack table, Quickstart, Routes, Data, Deploy sections
- [ ] Step 3: Update `.gitignore` to ignore `tsconfig.tsbuildinfo` and `.env.production`
- [ ] Step 4: Commit

---

### Task 6: Fix .gitignore hygiene (tsbuildinfo, .env.production) + remove committed artifacts

**Files:**
- Modify: `.gitignore`
- Delete from git: `tsconfig.tsbuildinfo` if tracked
- Modify: `.env.production` — ensure not tracked (282b dev env)

**Interfaces:**
- Consumes: `git status --short`
- Produces: Clean `git status`

- [ ] Step 1: `git rm --cached tsconfig.tsbuildinfo` if tracked
- [ ] Step 2: Add `tsconfig.tsbuildinfo` and `.env.production` to `.gitignore`
- [ ] Step 3: Commit

---

### Task 7: Fix Docker + CI (point to Next.js root, not ts/api)

**Files:**
- Modify: `Dockerfile` — change `COPY ts/api` → `COPY src`, `COPY package.json`, `RUN bun install && bun run build`
- Modify: `docker-compose.yml` — update `build.context` to `.`, command to `bun run start`
- Modify: `.github/workflows/ci.yml` — change `bun run build:web` → `bun run build`, add `biome check`, `tsc --noEmit`, `pytest -q`
- Modify: `vercel.json` — keep minimal `{"framework":"nextjs","regions":["sin1"]}` (already fixed)
- Modify: `src/components/site-footer.tsx` — fix Build link `apps/web` → `/` or `https://github.com/bravforcode/jobshield-ai` root

**Interfaces:**
- Consumes: `package.json` scripts
- Produces: `docker build` and GH CI green

- [ ] Step 1: Read current `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`, `src/components/site-footer.tsx`
- [ ] Step 2: Edit each to point at root Next.js
- [ ] Step 3: Run `bun run typecheck && bun run lint && bun run build` locally
- [ ] Step 4: Commit

---

### Task 8: Final verification + deploy

**Files:**
- None (verification only)

**Interfaces:**
- Consumes: All above tasks
- Produces: Vercel production deploy

- [ ] Step 1: `bun run typecheck` → 0 errors
- [ ] Step 2: `bun run lint` → 0 errors
- [ ] Step 3: `bun run build` → 12 routes
- [ ] Step 4: `uv run --directory py pytest -q` → 145 pass
- [ ] Step 5: `curl https://jobsume.vercel.app/api/stats` → `{"occupations":18,"skills":46,"edges":119}`
- [ ] Step 6: `vercel --prod --yes` → READY, alias `jobsume.vercel.app`
- [ ] Step 7: Push to `origin main`

---

## Self-Review
- Spec coverage: All 8 tasks map to P0 hygiene (#1-11, #20) from inventory; spec §8 limitations acknowledged via README.
- Placeholder scan: No TBD/TODO — each step has exact file paths and shell commands.
- Type consistency: `Occupation` from `src/lib/types.ts` used in Tasks 3/4; `MetadataRoute` from `next` used in Task 4.

## Execution Handoff
Plan complete and saved to `docs/superpowers/plans/2026-08-29-jobshield-sprint1-hygiene.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?** — Continuing inline per user "continue" (no blocker).
