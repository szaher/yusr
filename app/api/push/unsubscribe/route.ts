import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth/config";
import { unsubscribeByUser, unsubscribeAll } from "@/server/services/push-notification";
import { validateOrigin } from "@/server/lib/validate-origin";

export async function DELETE(request: NextRequest) {
  if (!(await validateOrigin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (body.all) {
    await unsubscribeAll(session.user.id);
  } else if (body.endpoint) {
    await unsubscribeByUser(body.endpoint, session.user.id);
  } else {
    return NextResponse.json({ error: "Missing endpoint or all flag" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
