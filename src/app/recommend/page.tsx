import type { Metadata } from "next";
import { Suspense } from "react";
import { getArtifacts } from "@/lib/data.server";
import { RecommenderClient } from "./recommender-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recommender",
  description: "Pick a starting job and see top 5 next moves with wage gaps and skill bridges.",
};

export default function RecommendPage() {
  const { occupations, recommendations, wageRadar } = getArtifacts();
  return (
    <Suspense fallback={null}>
      <RecommenderClient
        occupations={occupations}
        initialRecommendations={recommendations}
        wageRadar={wageRadar}
      />
    </Suspense>
  );
}
