import { auth } from "./config";
import { redirect } from "next/navigation";

export async function getSession() {
  return auth();
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/ar/login");
  }
  return session;
}

export async function requireApprovedUser() {
  const session = await requireAuth();
  if (session.user.accountStatus !== "ACTIVE") {
    redirect("/ar/login");
  }
  return session;
}
