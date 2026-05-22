import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import { createNotification, createBulkNotifications } from "./notification";
import type {
  CreateTicketInput,
  AddReplyInput,
  AssignTicketInput,
  ChangeTicketStatusInput,
} from "@/lib/validations/support-ticket";

async function getAdminUserIds(): Promise<string[]> {
  const admins = await db.user.findMany({
    where: { accountStatus: "ACTIVE", role: { name: "admin" } },
    select: { id: true },
  });
  return admins.map((u) => u.id);
}

export async function createTicket(
  input: CreateTicketInput,
  studentProfileId: string,
  actorId: string
) {
  const ticket = await db.supportTicket.create({
    data: {
      subject: input.subject,
      body: input.body,
      studentId: studentProfileId,
    },
  });

  const adminIds = await getAdminUserIds();
  if (adminIds.length > 0) {
    await createBulkNotifications(
      adminIds,
      "TICKET_CREATED",
      `New support ticket: ${input.subject}`
    );
  }

  await createAuditLog({
    actorId,
    action: "support_ticket.create",
    entityType: "SupportTicket",
    entityId: ticket.id,
    metadata: { subject: input.subject },
  });

  return ticket;
}

export async function addReply(
  input: AddReplyInput,
  actorId: string
) {
  const ticket = await db.supportTicket.findUniqueOrThrow({
    where: { id: input.ticketId },
    include: {
      student: { include: { user: { select: { id: true } } } },
    },
  });

  const reply = await db.ticketReply.create({
    data: {
      ticketId: input.ticketId,
      authorId: actorId,
      body: input.body,
    },
  });

  const isStudentReplying = ticket.student.user.id === actorId;

  if (isStudentReplying && ticket.assignedToId) {
    await createNotification({
      recipientId: ticket.assignedToId,
      type: "TICKET_REPLY",
      title: `New reply on ticket: ${ticket.subject}`,
    });
  } else if (!isStudentReplying) {
    await createNotification({
      recipientId: ticket.student.user.id,
      type: "TICKET_REPLY",
      title: `New reply on your ticket: ${ticket.subject}`,
    });
  }

  await createAuditLog({
    actorId,
    action: "support_ticket.reply",
    entityType: "SupportTicket",
    entityId: input.ticketId,
    metadata: {},
  });

  return reply;
}

export async function assignTicket(
  input: AssignTicketInput,
  actorId: string
) {
  const ticket = await db.supportTicket.update({
    where: { id: input.ticketId },
    data: { assignedToId: input.assignedToId },
  });

  await createNotification({
    recipientId: input.assignedToId,
    type: "TICKET_ASSIGNED",
    title: `Ticket assigned to you: ${ticket.subject}`,
  });

  await createAuditLog({
    actorId,
    action: "support_ticket.assign",
    entityType: "SupportTicket",
    entityId: input.ticketId,
    metadata: { assignedToId: input.assignedToId },
  });

  return ticket;
}

export async function changeTicketStatus(
  input: ChangeTicketStatusInput,
  actorId: string
) {
  const ticket = await db.supportTicket.update({
    where: { id: input.ticketId },
    data: { status: input.status },
    include: {
      student: { include: { user: { select: { id: true } } } },
    },
  });

  if (input.status === "RESOLVED") {
    await createNotification({
      recipientId: ticket.student.user.id,
      type: "TICKET_RESOLVED",
      title: `Your ticket has been resolved: ${ticket.subject}`,
    });
  }

  await createAuditLog({
    actorId,
    action: `support_ticket.${input.status.toLowerCase()}`,
    entityType: "SupportTicket",
    entityId: input.ticketId,
    metadata: { status: input.status },
  });

  return ticket;
}

export async function escalateTicket(ticketId: string, actorId: string) {
  const ticket = await db.supportTicket.update({
    where: { id: ticketId },
    data: { escalated: true },
  });

  const adminIds = await getAdminUserIds();
  if (adminIds.length > 0) {
    await createBulkNotifications(
      adminIds,
      "TICKET_ESCALATED",
      `Ticket escalated: ${ticket.subject}`
    );
  }

  await createAuditLog({
    actorId,
    action: "support_ticket.escalate",
    entityType: "SupportTicket",
    entityId: ticketId,
    metadata: {},
  });

  return ticket;
}

export async function getStudentTickets(studentProfileId: string) {
  return db.supportTicket.findMany({
    where: { studentId: studentProfileId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getTicketWithReplies(ticketId: string) {
  return db.supportTicket.findUniqueOrThrow({
    where: { id: ticketId },
    include: {
      student: {
        include: { user: { select: { id: true, name: true, nameAr: true } } },
      },
      assignedTo: { select: { id: true, name: true, nameAr: true } },
      replies: {
        include: {
          author: { select: { id: true, name: true, nameAr: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function getAssignedTickets(
  userId: string,
  statusFilter?: "active" | "all"
) {
  return db.supportTicket.findMany({
    where: {
      assignedToId: userId,
      ...(statusFilter === "active" || !statusFilter
        ? { status: { in: ["OPEN", "IN_PROGRESS"] } }
        : {}),
    },
    include: {
      student: {
        include: { user: { select: { name: true, nameAr: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getAllTickets(statusFilter?: "active" | "all") {
  return db.supportTicket.findMany({
    where:
      statusFilter === "active" || !statusFilter
        ? { status: { not: "CLOSED" } }
        : {},
    include: {
      student: {
        include: { user: { select: { name: true, nameAr: true } } },
      },
      assignedTo: { select: { name: true, nameAr: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}
