# Direction

**This is NOT a research paper. It's a working product.** Replaces v1.

## Why v1 failed
v1 was a research-paper surface. The user asked for a production
enterprise product with shadcn/MagicUI/Footer.design aesthetic. v1
read like an essay about a tool. v2 *is* the tool.

## Subject, audience, job
- **Subject:** JobShield AI — PPMI skill graph + Dijkstra Layer-1 +
  rank Layer-2 + centrality-based Wage Radar (per spec v2).
- **Audience:** A Thai job-seeker evaluating career transitions.
  Single user, one screen, one decision per visit.
- **Page job:** pick a starting occupation → see the top N ranked
  next-step occupations with the wage gap and the skill bridges.

## Aesthetic direction — modern enterprise dashboard

| Axis | Choice | Rejected |
|---|---|---|
| Theme | **Dark default + light toggle** (shadcn convention) | dark-only or light-only |
| Layout | **12-col CSS grid**, 1240px max, 24px gutter | single column (essay) |
| Type (UI) | **Inter Variable** (400, 500, 600, 700) | Geist (overused), Plex Sans (paper feel) |
| Type (data) | **JetBrains Mono Variable** for numbers, codes, badges, paths | Geist Mono, system mono |
| Type scale | 12 / 14 / 16 / 20 / 28 / 44 / 64 | too few or too many stops |
| Color (dark) | `#0a0c10` ground · `#11141b` surface · `#1c2030` elevated · `#e8e3d6` ink · `#9b9ea8` muted · `#ff5b3e` signal | pure black, pure white, violet accent |
| Color (light) | `#fafaf7` ground · `#ffffff` surface · `#f1efe8` elevated · `#0a0c10` ink · `#5c5d65` muted · `#c43820` signal | warm cream (v1 default trap) |
| Signal | **Red `#ff5b3e`** — underpaid points + underpaid recommendations only | multi-color palette, gradient accent |
| Border radius | 4 / 8 / 12 / 16 (component-level) | all 8px (boring) or all 24px (cartoonish) |

## Component primitives (shadcn model)
Button · Card · Badge · Tabs · Select · Command palette · Tooltip ·
Toast · Skeleton · Theme toggle. All from shadcn/ui / Radix.

## Layout — 4 sections, each with a real job
1. **Hero (12-col, 1 viewport)** — left col 7: thesis + 4 corpus stats
   + 3 buttons. Right col 5: **live wage radar** with the 18 occupations
   plotted, OLS fit, halos, hover tooltip, click-to-pick.
2. **Source picker (full width, 12-col)** — large combobox with 18
   occupations, current wage + risk + degree + gap shown as chips.
3. **Tabs (3 tabs, content fills 12-col)** —
   - **Recommendations** (default): ranked list as numbered cards
     (1-5), each shows target · wage delta · risk · path · skill bridges.
     Click to expand.
   - **Wage radar**: large canvas with axes, axis ticks, fit line,
     point halos, accessible data table.
   - **Mechanism**: collapsible explainer of the 4 math layers.
4. **Footer (4-col, hairline above)** — Product / Data / Spec / Build.
   Hairline rule above, sparse 14px text.

## Signature risk (the one ornament that earns its keep)
**The wage radar renders on first paint, before any user input.**
The 18 occupations are plotted, the OLS fit line is visible, and
the underpaid points have halos. The signal color answers the
question "who's underpaid?" without the user doing anything.

Justification: every other section is a tool to be used; the radar
is the proof that the math works, on first paint. It's not
decoration — it IS the product.

## Motion budget
- **Entrance:** 6 cards stagger 60ms each. Radar renders immediately.
- **Hover:** 150ms scale 1.02 on cards, border-color shift.
- **Theme toggle:** 200ms cross-fade.
- **Reduced motion:** all entrance + transitions disabled.

## Content rules
- **Name things by what the user controls.** "Source", "Recommendations",
  "Wage radar" — not "graph root", "shortest paths", "OLS fit".
- **Active voice, sentence case, no filler.** "Pick a starting job",
  not "Please select an occupation".
- **Empty/error states direct, not moody.** "No reachable targets.
  Try a different starting occupation." Not "Oops!".
- **No AI / Powered-by badges.** This is a tool.

## What this is NOT
- Not a research paper. (v1 was. We moved on.)
- Not a marketing landing page.
- Not a feature grid.
- Not a single-column essay.
- Not light mode only.
- Not 3 sections. (Tool surface area: 4.)
- Not under 20 KB. (Real products are 30-50 KB. Acceptable.)
