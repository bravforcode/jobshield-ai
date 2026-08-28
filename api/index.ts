// Vercel entry — re-exports the Bun server's handleRequest as a Vercel Function.
// Supports both Web-standard `Request -> Response` (Edge) and Node
// `(IncomingMessage, ServerResponse)` (Node runtime) signatures.

import { handleRequest } from "../ts/api/src/server";

export default async function handler(req: Request, res?: unknown): Promise<Response | void> {
  // Node-style: (req: IncomingMessage, res: ServerResponse)
  if (res && typeof (res as { statusCode?: unknown }).statusCode !== "undefined") {
    const nodeReq = req as unknown as { url?: string; method?: string; headers: Record<string, string | string[] | undefined> };
    const nodeRes = res as unknown as {
      statusCode: number;
      setHeader: (k: string, v: string) => void;
      end: (b: string | Uint8Array) => void;
    };
    const host = (nodeReq.headers?.host as string) || "localhost";
    const url = `https://${host}${nodeReq.url ?? "/"}`;
    // Node headers may be string | string[] | undefined — normalize to string
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(nodeReq.headers ?? {})) {
      if (typeof v === "string") headers[k] = v;
      else if (Array.isArray(v)) headers[k] = v.join(", ");
    }
    const webReq = new Request(url, {
      method: nodeReq.method ?? "GET",
      headers,
    });
    const webRes = await handleRequest(webReq);
    nodeRes.statusCode = webRes.status;
    webRes.headers.forEach((value, key) => nodeRes.setHeader(key, value));
    const buf = Buffer.from(await webRes.arrayBuffer());
    nodeRes.end(buf);
    return;
  }
  // Web-standard: Request -> Response
  return handleRequest(req as Request);
}

// Vercel config for this function is in vercel.json `functions`.
