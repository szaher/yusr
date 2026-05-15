/**
 * Permission key constants for type-safe permission checks.
 * These keys must match the `key` field in the Permission table.
 */
export const Permissions = {
  // User management
  USERS_APPROVE: "users.approve",
  USERS_LIST: "users.list",
  USERS_VIEW: "users.view",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",

  // Student management
  STUDENTS_LIST: "students.list",
  STUDENTS_VIEW: "students.view",
  STUDENTS_ASSIGN: "students.assign",

  // Teacher management
  TEACHERS_LIST: "teachers.list",
  TEACHERS_VIEW: "teachers.view",

  // Session management
  SESSIONS_CREATE: "sessions.create",
  SESSIONS_VIEW: "sessions.view",
  SESSIONS_LIST: "sessions.list",

  // Progress tracking
  PROGRESS_VIEW: "progress.view",
  PROGRESS_RECORD: "progress.record",

  // Reports
  REPORTS_VIEW: "reports.view",

  // Settings / admin
  SETTINGS_MANAGE: "settings.manage",
  ROLES_MANAGE: "roles.manage",
} as const;

export type PermissionKey = (typeof Permissions)[keyof typeof Permissions];
