// Bun entry point.
import { handleRequest } from "./server.js";

const port = Number(process.env.PORT ?? 3000);
const server = Bun.serve({
  port,
  hostname: "0.0.0.0",
  fetch: handleRequest,
});
console.log(`[jobshield-api] listening on http://0.0.0.0:${server.port}`);
