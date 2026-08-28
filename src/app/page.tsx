import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ArchitectureCard } from "@/components/architecture-card";
import { Features } from "@/components/features";
import { Hero } from "@/components/hero";
import { TestimonialStrip } from "@/components/testimonial-strip";
import { Button } from "@/components/ui/button";
import { WageRadarCard } from "@/components/wage-radar-card";
import { getArtifacts } from "@/lib/data.server";

export default function HomePage() {
  const { stats, wageRadar } = getArtifacts();
  return (
    <div className="flex flex-col">
      <Hero stats={stats} />
      <section className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Live wage radar
            </span>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Eighteen occupations. One regression line. Red is the only color that means anything.
            </h2>
            <p className="text-balance text-muted-foreground">
              Each dot is a Thai occupation. The dashed line is the OLS fit of median wage on degree
              centrality — what the network predicts each job should pay. Dots below the line are
              paid less than their network position predicts.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/recommend">
                  Try the recommender <ArrowRight />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/wage-radar">Open the full radar</Link>
              </Button>
            </div>
          </div>
          <WageRadarCard data={wageRadar} compact />
        </div>
      </section>
      <ArchitectureCard />
      <Features />
      <TestimonialStrip />
    </div>
  );
}
