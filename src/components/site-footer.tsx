import { Shield } from "lucide-react";
import Link from "next/link";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "/" },
      { label: "Recommender", href: "/recommend" },
      { label: "Mechanism", href: "/mechanism" },
      { label: "Wage radar", href: "/wage-radar" },
    ],
  },
  {
    title: "Data",
    links: [
      { label: "Corpus stats", href: "/api/stats" },
      { label: "Occupations", href: "/api/occupations" },
      { label: "Recommendations", href: "/api/recommend?source=occ.data_entry" },
      { label: "Wage radar", href: "/api/wage-radar" },
    ],
  },
  {
    title: "Spec",
    links: [
      {
        label: "Spec v2",
        href: "https://github.com/bravforcode/jobshield-ai/blob/main/docs/jobshield-ai-spec-v2.md",
      },
      {
        label: "Q&A prep",
        href: "https://github.com/bravforcode/jobshield-ai/blob/main/docs/QNA.md",
      },
      { label: "Plan", href: "https://github.com/bravforcode/jobshield-ai/blob/main/docs/plan.md" },
    ],
  },
  {
    title: "Build",
    links: [
      { label: "Pipeline (Py)", href: "https://github.com/bravforcode/jobshield-ai/tree/main/py" },
      {
        label: "Tests (145 Py)",
        href: "https://github.com/bravforcode/jobshield-ai/tree/main/py/tests",
      },
      {
        label: "App (Next.js)",
        href: "https://github.com/bravforcode/jobshield-ai/tree/main/src",
      },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        {COLS.map((col) => (
          <div key={col.title}>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {col.title}
            </h4>
            <ul className="space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-2">
            <Shield className="size-3.5" />
            <span>JobShield AI · v2.0.0</span>
          </div>
          <p className="text-balance">
            Prototype. Skill graph built from hand-authored postings, not real Thai labour-market
            data. See <span className="font-mono">/mechanism</span> for what this is and isn&apos;t.
          </p>
        </div>
      </div>
    </footer>
  );
}
