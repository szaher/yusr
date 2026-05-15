import { db } from "@/server/db/client";
import { hashPassword } from "@/server/auth/password";
import { createAuditLog } from "./audit-log";
import type { CreateModeratorInput } from "@/lib/validations/user";

export async function getAllUsers() {
  return db.user.findMany({
    include: {
      role: { select: { name: true, nameAr: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createModerator(
  input: CreateModeratorInput,
  actorId: string
) {
  const moderatorRole = await db.role.findUnique({
    where: { name: "moderator" },
  });
  if (!moderatorRole) throw new Error("Moderator role not found");

  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) throw new Error("Email already registered");

  const user = await db.user.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.password),
      name: input.name,
      nameAr: input.nameAr,
      roleId: moderatorRole.id,
      accountStatus: "ACTIVE",
      locale: "ar",
      moderatorProfile: { create: {} },
    },
    include: { moderatorProfile: true },
  });

  await createAuditLog({
    actorId,
    action: "user.moderator_created",
    entityType: "User",
    entityId: user.id,
  });

  return user;
}

export async function updateAccountStatus(
  userId: string,
  status: string,
  actorId: string
) {
  const user = await db.user.update({
    where: { id: userId },
    data: { accountStatus: status as any },
  });

  await createAuditLog({
    actorId,
    action: `user.${status.toLowerCase()}`,
    entityType: "User",
    entityId: userId,
  });

  return user;
}
