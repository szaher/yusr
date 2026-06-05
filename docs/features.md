---
title: Features
nav_order: 4
---

# Feature Overview

## Roles

| Role | Access |
|------|--------|
| **Admin** | Full system — users, organization, settings, analytics |
| **Moderator** | Assigned groups — sessions, grading, memorization, attendance |
| **Student** | Own data — schedule, assignments, exams, progress |
| **Support** | Support tickets |

## Authentication & Security

- Email/password login with bcrypt hashing (12 rounds)
- JWT sessions with 24h expiry and 5-minute periodic refresh
- Role-based access control with per-user permission overrides
- Account lockout after 5 failed login attempts (15 min cooldown)
- Rate limiting on login (5/min), registration (3/hr), password reset (3/hr)
- Auth middleware protecting all dashboard routes
- CSRF protection on API routes via origin validation
- Session invalidation on password change

## Student Lifecycle

- Online registration with consent
- Admin approval workflow (approve, reject, waitlist)
- Enrollment states: open, closed, paused, waitlist_only
- Organization hierarchy: Level → Class → Group
- Group assignment with moderator linkage

## Sessions & Attendance

- Weekly session scheduling with configurable cadence
- Meeting link management
- Quick attendance marking (present, absent, late, excused)
- Per-student grading with recitation results and tajweed notes
- Attendance alerts when consecutive absence threshold exceeded
- Leave request workflow with moderator approval

## Memorization Plans

- Customizable pace: rub, hizb, or page count per session
- Plan templates for standardized tracks
- Progress tracking at surah/ayah granularity
- Moderator review with tajweed category scoring and mistake tracking
- Next-range computation with manual override
- Custom goals with deadline tracking
- Automatic milestone detection (juz, surah, hizb completion)

## Assignments

- Four types: Quran memorization, revision, tajweed, homework
- Target by group, class, or level
- Due dates and required repetitions
- Listening confirmation flow with count tracking
- Material attachments (audio, video, iframe)

## Exams

- Question types: multiple choice, true/false, short answer, recitation
- Auto-grading for MCQ and true/false
- Manual grading for short answer and recitation
- Time limits, question pools with tag-based filtering, shuffling
- Retake support with configurable max attempts
- Group assignment with date scheduling

## Gamification

- Badge definitions with icons, colors, and categories
- Automatic badge awards based on triggers (milestones, streaks)
- Manual badge awards by moderators
- Group and school leaderboards
- Achievement milestones (first review, juz complete, streak records)

## Audio Recording

- Browser-based recording via MediaRecorder API (WebM/Opus)
- File upload as alternative to recording
- Configurable storage: local filesystem or S3
- Playback in student session detail view
- 50MB max file size

## Calendar

- Month-view CSS grid calendar
- Color-coded events: sessions (blue), assignments (amber), exams (red)
- RTL-aware: Saturday-first for Arabic, Monday-first for English
- Day selection with event detail panel
- Previous/next month navigation with "Today" shortcut

## Reporting & Analytics

- Admin KPI dashboard: active students, attendance rate, exam pass rate
- Attendance trends (weekly/monthly), group comparison
- At-risk student identification
- Exam score distribution histogram
- Memorization progress by group
- CSV export for users, attendance, and progress data

## Notifications

- In-app notification center with read/unread tracking
- Web Push notifications via VAPID
- Per-type notification preferences (in-app + push toggles)
- Bulk notifications for announcements
- Notification types: session, attendance, assignment, exam, milestone, badge, ticket, announcement

## Quran Explorer

- Full Quran text: 114 surahs, 6,236 ayahs (Arabic + English)
- Surah reader with proper Bismillah handling
- Mushaf page view
- Navigation by juz, hizb, quarter, page
- Seeded from authoritative source data

## PWA

- Installable on mobile and desktop
- Offline fallback page
- Push notification subscription with permission prompt
- Responsive bottom navigation for mobile
- Service worker with runtime caching

## Internationalization

- Full Arabic (RTL) and English (LTR) support
- 26 translation namespaces, role-based bundle splitting
- Locale-aware date/number formatting via Intl API
- Bilingual user documentation (42 guide pages)

## Administration

- User management: create moderators, promote, ban, deactivate
- Organization CRUD: levels, classes, groups (create, edit, delete)
- Feature flags for gradual rollout (18 flags)
- System settings (enrollment state, max file size)
- Audit logging for all mutations
- Confirmation dialogs for destructive actions
- Search and filter on user/session/student lists

## Accessibility

- Skip-to-main-content link
- ARIA landmarks on all navigation elements
- aria-current="page" on active nav links
- role="alert" on error boundaries
- role="search" on search inputs
- aria-hidden on decorative icons
- Focus-visible styles on all interactive elements
