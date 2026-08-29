export function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "JobShield AI",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Career mobility recommender for the Thai labour market — PPMI skill graph, Dijkstra L1, rank L2, wage radar.",
    url: "https://jobsume.vercel.app",
    offers: { "@type": "Offer", price: "0", priceCurrency: "THB" },
  };
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires inline script
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
