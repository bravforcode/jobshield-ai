import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://jobsume.vercel.app";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/recommend`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/wage-radar`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/mechanism`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];
}
