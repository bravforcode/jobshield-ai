import { Suspense } from "react";
import { getArtifacts } from "@/lib/data.server";
import { RecommenderClient } from "./recommender-client";

export const dynamic = "force-dynamic";

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
