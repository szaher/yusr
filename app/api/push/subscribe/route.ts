import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { subscribe } from "@/server/services/push-notification";
import { validateOrigin } from "@/server/lib/validate-origin";

export async function POST(request: NextRequest) {
  if (!(await validateOrigin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await subscribe(session.user.id, {
    endpoint: body.endpoint,
    keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
  });

  return NextResponse.json({ success: true });
}
