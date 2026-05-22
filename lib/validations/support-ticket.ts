import { z } from "zod";

export const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const addReplySchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().min(1).max(2000),
});

export type AddReplyInput = z.infer<typeof addReplySchema>;

export const assignTicketSchema = z.object({
  ticketId: z.string().min(1),
  assignedToId: z.string().min(1),
});

export type AssignTicketInput = z.infer<typeof assignTicketSchema>;

export const changeTicketStatusSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

export type ChangeTicketStatusInput = z.infer<typeof changeTicketStatusSchema>;

export const escalateTicketSchema = z.object({
  ticketId: z.string().min(1),
});

export type EscalateTicketInput = z.infer<typeof escalateTicketSchema>;
