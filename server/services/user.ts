import { db } from "@/server/db/client";
import { hashPassword } from "@/server/auth/password";
import { createAuditLog } from "./audit-log";
import type { CreateModeratorInput } from "@/lib/validations/user";

export async function getAllUsers(
  page = 1,
  limit = 50,
  search?: string,
  role?: string,
  status?: string
) {
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role) {
    where.role = { name: role };
  }
  if (status) {
    where.accountStatus = status;
  }

  const [items, total] = await Promise.all([
    db.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        role: { select: { name: true, nameAr: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.user.count({ where }),
  ]);
  return { items, total, page, totalPages: Math.ceil(total / limit) };
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

export async function promoteToModerator(userId: string, actorId: string) {
  const moderatorRole = await db.role.findUnique({
    where: { name: "moderator" },
  });
  if (!moderatorRole) throw new Error("Moderator role not found");

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { role: true, moderatorProfile: true },
  });
  if (!user) throw new Error("User not found");
  if (user.role.name === "moderator") throw new Error("Already a moderator");

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { roleId: moderatorRole.id },
    });
    if (!user.moderatorProfile) {
      await tx.moderatorProfile.create({ data: { userId } });
    }
  });

  await createAuditLog({
    actorId,
    action: "user.promoted_to_moderator",
    entityType: "User",
    entityId: userId,
  });
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
