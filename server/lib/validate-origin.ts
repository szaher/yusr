import { headers } from "next/headers";

export async function validateOrigin(): Promise<boolean> {
  const headersList = await headers();
  const origin = headersList.get("origin");
  const host = headersList.get("host");
  if (!origin || !host) return false;
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}
