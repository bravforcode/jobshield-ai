import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No custom webpack or turbopack config needed.
  // The fs.readFileSync call in lib/data.server.ts is server-only and
  // Turbopack handles it via the /* turbopackIgnore: true */ hint.
};

export default nextConfig;
