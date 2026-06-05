export const NOTIFICATION_TYPES = {
  SESSION_SCHEDULED: "SESSION_SCHEDULED",
  ATTENDANCE_ALERT: "ATTENDANCE_ALERT",
  ASSIGNMENT_CREATED: "ASSIGNMENT_CREATED",
  EXAM_PUBLISHED: "EXAM_PUBLISHED",
  EXAM_GRADED: "EXAM_GRADED",
  LEAVE_REQUEST_REVIEWED: "LEAVE_REQUEST_REVIEWED",
  MILESTONE_ACHIEVED: "MILESTONE_ACHIEVED",
  BADGE_AWARDED: "BADGE_AWARDED",
  TICKET_REPLY: "TICKET_REPLY",
  ANNOUNCEMENT: "ANNOUNCEMENT",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const NOTIFICATION_TYPE_LABELS: Record<
  string,
  { en: string; ar: string }
> = {
  SESSION_SCHEDULED: { en: "Session Scheduled", ar: "جلسة مجدولة" },
  ATTENDANCE_ALERT: { en: "Attendance Alert", ar: "تنبيه حضور" },
  ASSIGNMENT_CREATED: { en: "New Assignment", ar: "واجب جديد" },
  EXAM_PUBLISHED: { en: "Exam Published", ar: "اختبار منشور" },
  EXAM_GRADED: { en: "Exam Graded", ar: "تم تصحيح الاختبار" },
  LEAVE_REQUEST_REVIEWED: { en: "Leave Request", ar: "طلب إجازة" },
  MILESTONE_ACHIEVED: { en: "Milestone", ar: "إنجاز" },
  BADGE_AWARDED: { en: "Badge", ar: "شارة" },
  TICKET_REPLY: { en: "Ticket Reply", ar: "رد على التذكرة" },
  ANNOUNCEMENT: { en: "Announcement", ar: "إعلان" },
};
