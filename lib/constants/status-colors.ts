export const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  OPEN: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  COMPLETED: "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  CLOSED: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
  PUBLISHED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
  ESCALATED: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

export const RESULT_COLORS: Record<string, string> = {
  EXCELLENT: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  GOOD: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  ACCEPTABLE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  NEEDS_REVIEW: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  NEEDS_IMPROVEMENT: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  INCOMPLETE: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  NOT_RECITED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  NOT_GRADED: "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-300",
};

export const PRIORITY_COLORS: Record<string, string> = {
  normal: "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-300",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export const QUESTION_TYPE_COLORS: Record<string, string> = {
  MULTIPLE_CHOICE: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  TRUE_FALSE: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  SHORT_ANSWER: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  RECITATION: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};

export const BOOLEAN_COLORS = {
  true: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  false: "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-300",
};

export const BADGE_COLORS = {
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  green: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  gray: "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-300",
};

export const SUBMISSION_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  SUBMITTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  GRADED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
};
