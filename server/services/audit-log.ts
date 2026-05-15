import { db } from "@/server/db/client";
import type { Prisma } from "../../prisma/generated/prisma/client";

export async function createAuditLog(params: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  return db.auditLog.create({
    data: {
      ...params,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function getAuditLogs(params?: {
  page?: number;
  pageSize?: number;
  action?: string;
}) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where: params?.action ? { action: params.action } : undefined,
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.auditLog.count({
      where: params?.action ? { action: params.action } : undefined,
    }),
  ]);

  return { logs, total, page, pageSize };
}
