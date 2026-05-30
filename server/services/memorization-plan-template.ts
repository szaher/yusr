import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import type { CreateTemplateInput, UpdateTemplateInput } from "@/lib/validations/memorization";

export async function listTemplates() {
  return db.memorizationPlanTemplate.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { plans: true } },
    },
  });
}

export async function createTemplate(input: CreateTemplateInput, actorId: string) {
  const template = await db.memorizationPlanTemplate.create({
    data: {
      name: input.name,
      nameAr: input.nameAr,
      paceUnit: input.paceUnit,
      paceValue: input.paceValue,
      description: input.description || null,
      createdById: actorId,
    },
  });

  await createAuditLog({
    actorId,
    action: "plan_template.create",
    entityType: "MemorizationPlanTemplate",
    entityId: template.id,
    metadata: { name: input.name, paceUnit: input.paceUnit, paceValue: input.paceValue },
  });

  return template;
}

export async function updateTemplate(input: UpdateTemplateInput, actorId: string) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.nameAr !== undefined) data.nameAr = input.nameAr;
  if (input.paceUnit !== undefined) data.paceUnit = input.paceUnit;
  if (input.paceValue !== undefined) data.paceValue = input.paceValue;
  if (input.description !== undefined) data.description = input.description;

  const template = await db.memorizationPlanTemplate.update({
    where: { id: input.id },
    data,
  });

  await createAuditLog({
    actorId,
    action: "plan_template.update",
    entityType: "MemorizationPlanTemplate",
    entityId: input.id,
    metadata: data,
  });

  return template;
}

export async function deleteTemplate(id: string, actorId: string) {
  const template = await db.memorizationPlanTemplate.findUnique({
    where: { id },
    select: { isDefault: true },
  });

  if (!template) throw new Error("Template not found");
  if (template.isDefault) throw new Error("Cannot delete default template");

  await db.memorizationPlanTemplate.delete({ where: { id } });

  await createAuditLog({
    actorId,
    action: "plan_template.delete",
    entityType: "MemorizationPlanTemplate",
    entityId: id,
    metadata: {},
  });
}
