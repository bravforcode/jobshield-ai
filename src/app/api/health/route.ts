import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "jobshield-ai",
    version: "2.0.0",
  });
}
