import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "JobShield AI — Career mobility for the Thai labour market";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 64,
        background: "#0a0c10",
        color: "#e8e3d6",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "#ff5b3e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
          }}
        >
          ◆
        </div>
        <span style={{ fontWeight: 600 }}>JobShield AI</span>
        <span style={{ opacity: 0.6, fontSize: 20 }}>v2</span>
      </div>
      <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.1, marginTop: 24, maxWidth: 900 }}>
        Where you can go next in the Thai labour market, and why.
      </div>
      <div style={{ fontSize: 20, opacity: 0.7, marginTop: 16 }}>
        PPMI skill graph · Dijkstra Layer-1 · Rank Layer-2 · Wage Radar
      </div>
    </div>,
    { ...size },
  );
}
