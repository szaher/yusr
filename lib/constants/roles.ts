export const ROLES = {
  ADMIN: "admin",
  MODERATOR: "moderator",
  STUDENT: "student",
  SUPPORT: "support",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
