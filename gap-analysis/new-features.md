# New Feature Opportunities — Yusr Gap Analysis

Last updated: 2026-06-02 23:52

## FEAT-001: Parent accounts

**Area:** Student engagement
**Description:** Parents can view their child's progress, attendance, grades, and memorization journey. Read-only access tied to a student account.
**User Impact:** High — parents are the primary stakeholders in Quran education decisions.
**Complexity:** L — new role, new pages, new permissions, schema changes.

## FEAT-002: Audio recording for recitation review

**Area:** Core workflow
**Description:** Students record recitation audio during assignments or sessions. Moderators review recordings asynchronously.
**User Impact:** High — enables remote/asynchronous Quran education.
**Complexity:** XL — audio capture, storage, playback, review UI, file management.

## FEAT-003: Accessibility audit and remediation

**Area:** UX/Compliance
**Description:** Keyboard navigation, ARIA labels, color contrast, screen reader support across all pages.
**User Impact:** Medium — required for inclusive access, potential legal compliance.
**Complexity:** M — systematic audit + remediation across all components.

## FEAT-004: Calendar view for sessions and assignments

**Area:** UX
**Description:** Visual calendar showing upcoming sessions, assignment due dates, exam schedules.
**User Impact:** Medium — replaces list-based scheduling with intuitive visual interface.
**Complexity:** M — calendar component, data aggregation, date range queries.

## FEAT-005: Notification preferences

**Area:** User control
**Description:** Users can configure which notification types they receive (push, in-app) and their frequency.
**User Impact:** Medium — prevents notification fatigue.
**Complexity:** S — preferences model, notification service filter.

## FEAT-006: Bulk operations for admin

**Area:** Admin efficiency
**Description:** Bulk assign students to groups, bulk grade, bulk send notifications, bulk manage enrollments.
**User Impact:** Medium — critical for schools with 100+ students.
**Complexity:** M — batch processing, transaction handling, progress indication.

## FEAT-007: Data export (CSV/PDF reports)

**Area:** Admin/Reporting
**Description:** Export student progress, attendance records, exam results, and group statistics as CSV or PDF.
**User Impact:** High — required for institutional reporting and parent communication.
**Complexity:** S-M — server-side CSV generation, PDF template.

## FEAT-008: Offline-first data sync

**Area:** PWA
**Description:** Cache critical data (student schedule, assignments, memorization plan) for offline access. Sync mutations when back online.
**User Impact:** Medium — important for users with intermittent connectivity.
**Complexity:** XL — offline storage, sync queue, conflict resolution.
