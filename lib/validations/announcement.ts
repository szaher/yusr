import { z } from "zod";

export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  priority: z.enum(["normal", "high", "urgent"]).default("normal"),
  targetType: z.enum(["ALL", "ROLE", "GROUP"]).default("ALL"),
  targetId: z.string().optional(),
  publishDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const updateAnnouncementSchema = createAnnouncementSchema.extend({
  announcementId: z.string().min(1),
});

export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
