import { auth } from "@/server/auth/config";
import { hasPermission } from "./check";

export class PermissionDeniedError extends Error {
  constructor(permission: string) {
    super(`Permission denied: ${permission}`);
    this.name = "PermissionDeniedError";
  }
}

export async function requirePermission(permissionKey: string): Promise<void> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new PermissionDeniedError(permissionKey);
  }

  const accountStatus = session.user.accountStatus;
  if (accountStatus && accountStatus !== "ACTIVE") {
    throw new PermissionDeniedError(permissionKey);
  }

  const allowed = await hasPermission(session.user.id, permissionKey);

  if (!allowed) {
    throw new PermissionDeniedError(permissionKey);
  }
}
