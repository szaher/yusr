import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { getStorage } from "@/server/lib/storage";
import { randomBytes } from "crypto";

const MAX_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm", "audio/x-m4a"];

function getExtension(filename: string, contentType: string): string {
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  if ([".mp3", ".m4a", ".wav", ".ogg", ".webm"].includes(ext)) return ext;
  const map: Record<string, string> = {
    "audio/mpeg": ".mp3", "audio/mp4": ".m4a", "audio/wav": ".wav",
    "audio/ogg": ".ogg", "audio/webm": ".webm", "audio/x-m4a": ".m4a",
  };
  return map[contentType] || ".webm";
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type) && ![".mp3", ".m4a", ".wav", ".ogg", ".webm"].some(ext => file.name.toLowerCase().endsWith(ext))) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const ext = getExtension(file.name, file.type);
  const random = randomBytes(8).toString("hex");
  const key = `audio/${session.user.id}/${Date.now()}-${random}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorage();
  const url = await storage.upload(key, buffer, file.type);

  return NextResponse.json({ url });
}
