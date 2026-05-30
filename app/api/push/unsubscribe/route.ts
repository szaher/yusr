import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { unsubscribe, unsubscribeAll } from "@/server/services/push-notification";

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (body.all) {
    await unsubscribeAll(session.user.id);
  } else if (body.endpoint) {
    await unsubscribe(body.endpoint);
  } else {
    return NextResponse.json({ error: "Missing endpoint or all flag" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
