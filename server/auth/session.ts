import { auth } from "./config";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

async function getLocale(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get("NEXT_LOCALE")?.value || "ar";
}

export async function getSession() {
  return auth();
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }
  return session;
}

export async function requireApprovedUser() {
  const session = await requireAuth();
  if (session.user.accountStatus !== "ACTIVE") {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }
  return session;
}
