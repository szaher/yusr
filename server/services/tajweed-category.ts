import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import type { TajweedCategoryInput } from "@/lib/validations/memorization";

export async function listTajweedCategories(includeInactive = false) {
  return db.tajweedCategory.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createTajweedCategory(
  input: TajweedCategoryInput,
  actorId: string
) {
  const category = await db.tajweedCategory.create({
    data: {
      nameEn: input.nameEn,
      nameAr: input.nameAr,
      sortOrder: input.sortOrder,
      isCore: false,
      active: true,
    },
  });

  await createAuditLog({
    actorId,
    action: "tajweed_category.create",
    entityType: "TajweedCategory",
    entityId: category.id,
    metadata: { nameEn: input.nameEn, nameAr: input.nameAr },
  });

  return category;
}

export async function updateTajweedCategory(
  id: string,
  input: TajweedCategoryInput,
  actorId: string
) {
  const category = await db.tajweedCategory.update({
    where: { id },
    data: {
      nameEn: input.nameEn,
      nameAr: input.nameAr,
      sortOrder: input.sortOrder,
    },
  });

  await createAuditLog({
    actorId,
    action: "tajweed_category.update",
    entityType: "TajweedCategory",
    entityId: id,
    metadata: { nameEn: input.nameEn, nameAr: input.nameAr },
  });

  return category;
}

export async function toggleTajweedCategoryActive(
  id: string,
  actorId: string
) {
  const existing = await db.tajweedCategory.findUnique({ where: { id } });
  if (!existing) throw new Error("Category not found");

  const updated = await db.tajweedCategory.update({
    where: { id },
    data: { active: !existing.active },
  });

  await createAuditLog({
    actorId,
    action: existing.active ? "tajweed_category.deactivate" : "tajweed_category.activate",
    entityType: "TajweedCategory",
    entityId: id,
    metadata: { active: updated.active },
  });

  return updated;
}
