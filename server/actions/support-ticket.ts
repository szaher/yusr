"use server";

import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  createTicket,
  addReply,
  assignTicket,
  changeTicketStatus,
  escalateTicket,
} from "@/server/services/support-ticket";
import {
  createTicketSchema,
  addReplySchema,
  assignTicketSchema,
  changeTicketStatusSchema,
  escalateTicketSchema,
} from "@/lib/validations/support-ticket";
import { db } from "@/server/db/client";
import { revalidatePath } from "next/cache";

function revalidateTicketPaths() {
  revalidatePath("/ar/student/tickets");
  revalidatePath("/en/student/tickets");
  revalidatePath("/ar/support/tickets");
  revalidatePath("/en/support/tickets");
  revalidatePath("/ar/admin/tickets");
  revalidatePath("/en/admin/tickets");
}

export async function createTicketAction(formData: FormData) {
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createTicketSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!studentProfile) {
    return { error: "noStudentProfile" };
  }

  try {
    await createTicket(parsed.data, studentProfile.id, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateTicketPaths();
  return { success: true };
}

export async function addReplyAction(formData: FormData) {
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = addReplySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await addReply(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateTicketPaths();
  return { success: true };
}

export async function assignTicketAction(formData: FormData) {
  await requirePermission(PERMISSIONS.SUPPORT_TICKETS_VIEW_ALL);
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = assignTicketSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await assignTicket(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateTicketPaths();
  return { success: true };
}

export async function changeTicketStatusAction(formData: FormData) {
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = changeTicketStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await changeTicketStatus(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateTicketPaths();
  return { success: true };
}

export async function escalateTicketAction(formData: FormData) {
  await requirePermission(PERMISSIONS.SUPPORT_TICKETS_ESCALATE);
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = escalateTicketSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await escalateTicket(parsed.data.ticketId, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateTicketPaths();
  return { success: true };
}
