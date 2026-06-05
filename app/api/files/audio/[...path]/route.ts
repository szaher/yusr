import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav",
  ".ogg": "audio/ogg", ".webm": "audio/webm",
};

export async function GET(_request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params;
  const baseDir = path.resolve(process.env.UPLOAD_DIR || "./uploads", "audio");
  const filePath = path.resolve(baseDir, ...segments);
  if (!filePath.startsWith(baseDir)) return new NextResponse("Forbidden", { status: 403 });

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return new NextResponse(data, {
      headers: {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
