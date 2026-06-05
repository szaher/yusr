import { NextResponse } from "next/server";
import { db } from "@/server/db/client";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { status: "down", timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
