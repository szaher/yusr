export const ENROLLMENT_STATES = {
  OPEN: "open",
  CLOSED: "closed",
  PAUSED: "paused",
  WAITLIST_ONLY: "waitlist_only",
} as const;

export type EnrollmentState =
  (typeof ENROLLMENT_STATES)[keyof typeof ENROLLMENT_STATES];

export const REGISTRATION_STATUSES = {
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  WAITLISTED: "WAITLISTED",
} as const;
