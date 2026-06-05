/**
 * i18n bundle-splitting utilities.
 *
 * Instead of sending every namespace to every page, we filter the message
 * object to only include the namespaces relevant to the current user's role.
 * Public pages (landing, auth) receive a small shared set; authenticated
 * dashboard pages receive shared + role-specific namespaces.
 */

/** Namespaces needed on every page (nav chrome, toasts, PWA prompts). */
export const SHARED_NAMESPACES = [
  "common",
  "nav",
  "pwa",
  "calendar",
  "audio",
  "notifications",
] as const;

/** Public pages: landing + auth. */
export const PUBLIC_NAMESPACES = [
  ...SHARED_NAMESPACES,
  "landing",
  "auth",
  "registration",
] as const;

/** Student dashboard. */
export const STUDENT_NAMESPACES = [
  ...SHARED_NAMESPACES,
  "student",
  "sessions",
  "assignments",
  "exams",
  "grades",
  "leaveRequests",
  "memorization",
  "announcements",
  "progress",
  "gamification",
  "attendance",
  "supportTickets",
  "quranExplorer",
  "quranReader",
] as const;

/** Moderator dashboard. */
export const MODERATOR_NAMESPACES = [
  ...SHARED_NAMESPACES,
  "moderator",
  "sessions",
  "assignments",
  "exams",
  "memorization",
  "announcements",
  "progress",
  "gamification",
  "attendance",
  "leaveRequests",
  "supportTickets",
  "grades",
] as const;

/** Admin dashboard. */
export const ADMIN_NAMESPACES = [
  ...SHARED_NAMESPACES,
  "admin",
  "sessions",
  "assignments",
  "exams",
  "memorization",
  "announcements",
  "progress",
  "gamification",
  "attendance",
  "analytics",
  "supportTickets",
  "leaveRequests",
  "grades",
] as const;

/** Support role. */
export const SUPPORT_NAMESPACES = [
  ...SHARED_NAMESPACES,
  "supportTickets",
] as const;

/** Map from role name to the namespaces that role requires. */
const ROLE_NAMESPACES: Record<string, readonly string[]> = {
  admin: ADMIN_NAMESPACES,
  moderator: MODERATOR_NAMESPACES,
  student: STUDENT_NAMESPACES,
  support: SUPPORT_NAMESPACES,
};

/**
 * Return a filtered copy of `messages` containing only the given namespaces.
 */
export function pickNamespaces(
  messages: Record<string, unknown>,
  namespaces: readonly string[],
): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const ns of namespaces) {
    if (ns in messages) {
      filtered[ns] = messages[ns];
    }
  }
  return filtered;
}

/**
 * Return the set of namespaces appropriate for a given user role.
 * When no role is provided (unauthenticated), returns public namespaces.
 */
export function namespacesForRole(role: string | undefined | null): readonly string[] {
  if (!role) return PUBLIC_NAMESPACES;
  return ROLE_NAMESPACES[role] ?? PUBLIC_NAMESPACES;
}
