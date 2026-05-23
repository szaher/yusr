import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";

export async function getAllFeatureFlags() {
  return db.featureFlag.findMany({ orderBy: { key: "asc" } });
}

export async function getEnabledFeatureFlags(): Promise<Set<string>> {
  const flags = await db.featureFlag.findMany({
    where: { enabled: true },
    select: { key: true },
  });
  return new Set(flags.map((f) => f.key));
}

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flag = await db.featureFlag.findUnique({ where: { key } });
  return flag?.enabled ?? false;
}

export async function toggleFeatureFlag(
  key: string,
  enabled: boolean,
  actorId: string
) {
  const flag = await db.featureFlag.update({
    where: { key },
    data: { enabled },
  });

  await createAuditLog({
    actorId,
    action: "feature_flag.toggled",
    entityType: "FeatureFlag",
    entityId: key,
    metadata: { enabled },
  });

  return flag;
}
