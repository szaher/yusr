import { requirePermission } from "@/server/permissions";
import { requireApprovedUser } from "@/server/auth/session";
import { auth } from "@/server/auth/config";
import { logger } from "./logger";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { error: string; details?: unknown };

export function createSafeAction<TInput>(
  config: {
    auth: "permission" | "approved";
    permission?: string;
  },
  handler: (input: TInput, userId: string) => Promise<ActionResult>
) {
  return async (input: TInput): Promise<ActionResult> => {
    // 1. Auth check based on config.auth
    let userId: string;
    try {
      if (config.auth === "permission" && config.permission) {
        await requirePermission(config.permission);
        const session = await auth();
        if (!session?.user) return { error: "notAuthenticated" };
        userId = session.user.id;
      } else {
        const session = await requireApprovedUser();
        userId = session.user.id;
      }
    } catch {
      return { error: "notAuthorized" };
    }

    // 2. Call handler in try/catch
    try {
      return await handler(input, userId);
    } catch (e) {
      // 3. Log errors
      logger.error(
        { err: e instanceof Error ? e.message : String(e) },
        "Action failed"
      );
      // 4. Return generic error on catch
      return { error: "unknownError" };
    }
  };
}
