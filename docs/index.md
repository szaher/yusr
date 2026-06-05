---
title: Home
nav_order: 1
---

# Yusr Academy

**Bilingual Quran Memorization School Management Platform**

Yusr Academy is an open-source, production-ready platform for managing Quran memorization schools. Built as a Progressive Web App (PWA) with full Arabic and English support.

## Key Features

- **Student Management** — Enrollment, group assignment, progress tracking
- **Session & Attendance** — Weekly session scheduling, attendance recording, absence alerts  
- **Memorization Plans** — Customizable pace, daily targets, milestone tracking
- **Assignments** — Quran memorization, revision, tajweed, and homework
- **Exams** — Multiple question types, auto-grading, retakes, time limits
- **Gamification** — Badges, leaderboards, achievement milestones
- **Audio Recording** — Browser-based recitation recording for async review
- **Calendar** — Month view with color-coded sessions, assignments, and exams
- **Reporting** — Admin dashboards, CSV export, attendance analytics
- **Notifications** — In-app + push notifications with user preferences
- **PWA** — Installable, offline fallback, responsive mobile design
- **Bilingual** — Full Arabic (RTL) and English (LTR) support
- **RBAC** — Admin, moderator, student, and support roles

## Quick Links

| Section | Description |
|---------|-------------|
| [Requirements](requirements) | Server specs, dependencies, environment variables |
| [Installation](installation) | Docker, manual setup, and deployment |
| [Features](features) | Complete feature inventory |
| [Technical Docs](technical/) | Architecture, database, API, auth |
| [User Guide (EN)](guide/en/) | English user documentation |
| [User Guide (AR)](guide/ar/) | Arabic user documentation |

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: PostgreSQL 16 + Prisma ORM
- **Auth**: NextAuth v5 (JWT, credentials)
- **i18n**: next-intl (Arabic + English)
- **UI**: Tailwind CSS + Base UI components
- **PWA**: Serwist (service worker)
- **Testing**: Playwright (E2E) + Vitest
