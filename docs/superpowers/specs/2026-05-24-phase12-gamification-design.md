# Phase 12: Gamification — Design Spec

## Goal

Add a badge/achievement system and group leaderboards to Yusr Academy, building on the milestone and streak infrastructure from Phase 11b. Badges are earned automatically through memorization milestones, review streaks, and review counts, or awarded manually by moderators for subjective recognition. Leaderboards rank students within their group using existing metrics — no new points or XP currency.

## Background

Phase 11b introduced `StudentMilestone` (JUZ_COMPLETE, HIZB_COMPLETE, SURAH_COMPLETE, CUSTOM_GOAL), review streak calculation, and progress pages for all three roles. The `checkMilestones` function fires after each review and creates milestone records + notifications. `getReviewStreak` computes current and longest streaks from `MemorizationReview` dates grouped by ISO week.

What's missing: badge definitions, badge earning logic, manual badge awards, leaderboard queries, and UI for displaying badges and rankings.

## Data Model

### New: BadgeDefinition

The catalog of available badges. Seeded at deploy time — not created by users.

```prisma
model BadgeDefinition {
  id            String         @id @default(cuid())
  key           String         @unique
  icon          String
  color         String
  category      String
  trigger       Json?
  sortOrder     Int            @default(0)
  studentBadges StudentBadge[]

  @@index([category])
}
```

- `key`: unique slug used for i18n lookup — e.g., `first_juz`. Display name comes from `t("gamification.badge_first_juz")`, not from the database.
- `icon`: lucide-react icon name — e.g., `"trophy"`, `"flame"`, `"star"`, `"award"`
- `color`: hex color for badge display — e.g., `"#f59e0b"` (gold), `"#22c55e"` (green)
- `category`: one of `MILESTONE`, `STREAK`, `REVIEW`, `SPECIAL`
  - `MILESTONE`: earned by reaching milestone counts (juz, surah, hizb)
  - `STREAK`: earned by maintaining review streaks
  - `REVIEW`: earned by accumulating total review count
  - `SPECIAL`: manual-only, awarded by moderators
- `trigger`: JSON object defining auto-earn criteria (null for manual/SPECIAL badges):
  - Milestone triggers: `{"type": "JUZ_COMPLETE", "count": 1}` — earned when student has >= `count` milestones of `type`
  - Streak triggers: `{"type": "STREAK", "weeks": 10}` — earned when current streak >= `weeks`
  - Review triggers: `{"type": "REVIEW_COUNT", "count": 100}` — earned when total reviews >= `count`
- `sortOrder`: controls display order within a category

### New: StudentBadge

Records earned/awarded badges per student.

```prisma
model StudentBadge {
  id          String          @id @default(cuid())
  studentId   String
  student     StudentProfile  @relation(fields: [studentId], references: [id])
  badgeId     String
  badge       BadgeDefinition @relation(fields: [badgeId], references: [id])
  awardedAt   DateTime        @default(now())
  awardedById String?
  awardedBy   User?           @relation("badgeAwarder", fields: [awardedById], references: [id])
  note        String?

  @@unique([studentId, badgeId])
  @@index([studentId])
  @@index([badgeId])
}
```

- `awardedById`: null for auto-earned badges, set to the moderator's userId for manual awards
- `note`: optional moderator comment explaining the award (only for manual badges)
- Unique constraint on `[studentId, badgeId]` prevents duplicate awards

### Reverse Relations

Add to `StudentProfile`:
```prisma
badges StudentBadge[]
```

Add to `User`:
```prisma
awardedBadges StudentBadge[] @relation("badgeAwarder")
```

### Existing Models (no changes)

- `StudentMilestone` — source data for milestone-based badge triggers
- `MemorizationReview` — source data for review count and streak triggers
- `Notification` — used for badge-earned notifications
- `AuditLog` — used for manual badge award/revoke logging

## Feature Flag

Key: `gamification`. Seed default: `enabled: true`.

Gates badge sections and leaderboard sections on progress pages. No new sidebar nav entries — badges and leaderboards appear within existing progress pages.

## Badge Catalog

### Milestone Badges

| Key | Icon | Color | Trigger | Category |
|-----|------|-------|---------|----------|
| `first_juz` | trophy | #f59e0b | `{"type":"JUZ_COMPLETE","count":1}` | MILESTONE |
| `five_juz` | trophy | #f59e0b | `{"type":"JUZ_COMPLETE","count":5}` | MILESTONE |
| `ten_juz` | trophy | #f59e0b | `{"type":"JUZ_COMPLETE","count":10}` | MILESTONE |
| `fifteen_juz` | trophy | #eab308 | `{"type":"JUZ_COMPLETE","count":15}` | MILESTONE |
| `twenty_juz` | trophy | #eab308 | `{"type":"JUZ_COMPLETE","count":20}` | MILESTONE |
| `half_quran` | crown | #a855f7 | `{"type":"JUZ_COMPLETE","count":15}` | MILESTONE |
| `full_quran` | crown | #a855f7 | `{"type":"JUZ_COMPLETE","count":30}` | MILESTONE |
| `first_surah` | star | #22c55e | `{"type":"SURAH_COMPLETE","count":1}` | MILESTONE |
| `ten_surahs` | star | #22c55e | `{"type":"SURAH_COMPLETE","count":10}` | MILESTONE |
| `fifty_surahs` | star | #22c55e | `{"type":"SURAH_COMPLETE","count":50}` | MILESTONE |
| `all_surahs` | star | #16a34a | `{"type":"SURAH_COMPLETE","count":114}` | MILESTONE |

### Streak Badges

| Key | Icon | Color | Trigger | Category |
|-----|------|-------|---------|----------|
| `streak_4` | flame | #ef4444 | `{"type":"STREAK","weeks":4}` | STREAK |
| `streak_10` | flame | #ef4444 | `{"type":"STREAK","weeks":10}` | STREAK |
| `streak_26` | flame | #dc2626 | `{"type":"STREAK","weeks":26}` | STREAK |
| `streak_52` | flame | #dc2626 | `{"type":"STREAK","weeks":52}` | STREAK |

### Review Badges

| Key | Icon | Color | Trigger | Category |
|-----|------|-------|---------|----------|
| `reviews_100` | book-open | #3b82f6 | `{"type":"REVIEW_COUNT","count":100}` | REVIEW |
| `reviews_500` | book-open | #3b82f6 | `{"type":"REVIEW_COUNT","count":500}` | REVIEW |
| `reviews_1000` | book-open | #2563eb | `{"type":"REVIEW_COUNT","count":1000}` | REVIEW |

### Special Badges (Manual)

| Key | Icon | Color | Trigger | Category |
|-----|------|-------|---------|----------|
| `excellent_tajweed` | mic | #8b5cf6 | null | SPECIAL |
| `most_improved` | trending-up | #10b981 | null | SPECIAL |
| `peer_helper` | users | #06b6d4 | null | SPECIAL |
| `outstanding_dedication` | heart | #ec4899 | null | SPECIAL |

Total: 22 badges (18 auto + 4 manual).

## Service Layer

### server/services/gamification.ts

#### Badge Detection

- `checkBadges(studentProfileId)` — called after milestone creation and after review creation. Logic:
  1. Fetch all badge definitions with non-null triggers
  2. Fetch student's already-earned badge IDs (Set for O(1) lookup)
  3. For each unearned auto badge, evaluate its trigger:
     - `JUZ_COMPLETE` / `SURAH_COMPLETE` / `HIZB_COMPLETE`: count milestones of that type for the student, compare to trigger `count`
     - `STREAK`: call `getReviewStreak(studentProfileId)`, compare `currentStreak` to trigger `weeks`
     - `REVIEW_COUNT`: count all `MemorizationReview` records for the student's active plans, compare to trigger `count`
  4. For each newly qualified badge: create `StudentBadge` record, send notification
  5. Catch P2002 (unique constraint violation) and skip — same pattern as milestone creation

- `awardBadge(studentId, badgeId, actorId, note?)` — moderator awards a manual badge:
  1. Fetch badge definition, verify `trigger === null` (SPECIAL category)
  2. Create `StudentBadge` with `awardedById = actorId` and optional `note`
  3. Send notification to student
  4. Create audit log: `BADGE_AWARD_MANUAL`

- `revokeBadge(studentBadgeId, actorId)` — moderator revokes a manually-awarded badge:
  1. Fetch the `StudentBadge`, verify it has `awardedById !== null` (only manual badges can be revoked)
  2. Delete the record
  3. Create audit log: `BADGE_REVOKE`

#### Query Functions

- `getStudentBadges(studentProfileId)` — all earned badges with badge definition details, ordered by `awardedAt` desc
- `getBadgeCatalog()` — all badge definitions ordered by category then sortOrder. Used to show earned vs locked state.
- `getRecentBadges(studentProfileId, limit?)` — latest N badges, default 3. For dashboard display.

#### Leaderboard Functions

- `getGroupLeaderboard(groupId)` — for each student in the group: name, milestone count, Quran %, current streak, badge count, computed rank. Ranked by milestone count (desc), then Quran % (desc), then current streak (desc).
- `getSchoolLeaderboard(limit?)` — same shape across all students, default top 10. Admin-only.
- `getBadgesAwardedThisMonth()` — count of badges awarded in last 30 days. For admin stats card.

### server/actions/gamification.ts

Server actions for:
- `awardBadgeAction(studentId, badgeId, note?)` — moderator awards a manual badge. Validates moderator manages the student's group.
- `revokeBadgeAction(studentBadgeId)` — moderator revokes a manual badge. Validates ownership.

### Hook into checkMilestones

In `server/services/progress.ts`, after creating a new milestone in `checkMilestones`:
- Call `checkBadges(studentProfileId)` fire-and-forget with `.catch(() => {})`

### Hook into createReview

In `server/services/memorization-review.ts`, after the existing `checkMilestones` / `checkCustomGoals` calls:
- Call `checkBadges(studentProfileId)` fire-and-forget (covers streak and review count badges)

Note: `checkBadges` may be called twice per review (once from milestone hook, once from review hook). This is safe because the unique constraint prevents duplicates, and the function short-circuits quickly when no new badges qualify.

## Pages

### Student: /student/progress (extended)

Add two new sections below existing content, gated by `isFeatureEnabled("gamification")`:

1. **My Badges** (after KPI cards):
   - Grid of all badge definitions
   - Earned badges: full color icon + name + earned date
   - Unearned badges: greyed out icon + name + locked indicator
   - Grouped by category: Milestone, Streak, Review, Special

2. **Group Leaderboard** (at bottom):
   - Table: Rank, Student Name, Milestones, Quran %, Streak, Badges
   - Current student's row highlighted with accent background
   - Shows all students in the group

### Student: /student/dashboard (extended)

Add below existing stats cards, gated by `isFeatureEnabled("gamification")`:

- **Recent Badges** row: last 3 earned badges as small icon + name chips, with "View all" link to progress page
- If no badges yet, show nothing (no empty state on dashboard)

### Moderator: /moderator/progress (extended)

Add to existing group view, gated by `isFeatureEnabled("gamification")`:

1. **Group Leaderboard** section — same table as student view but with "Award Badge" button per student row
2. **Award Badge** interaction: clicking opens `AwardBadgeDialog` — select from SPECIAL category badges, optional note, submit calls `awardBadgeAction`

### Moderator: /moderator/progress/[studentId] (extended)

Add section, gated by `isFeatureEnabled("gamification")`:

1. **Badges** section — all earned badges with dates. Manual badges show "Awarded by [name]" and note if present. Revoke button on manual badges.

### Admin: /admin/progress (extended)

Add to existing page, gated by `isFeatureEnabled("gamification")`:

1. **Badges This Month** stats card — count from `getBadgesAwardedThisMonth()`
2. **School Leaderboard** table — top 10 students school-wide: Rank, Name, Group, Milestones, Quran %, Streak, Badges

## Components

### components/gamification/badge-grid.tsx (client)

Props:
- `catalog`: all badge definitions
- `earned`: Set of earned badge IDs
- `studentBadges`: earned badge details (for dates)
- `locale`: for i18n

Renders a responsive grid grouped by category. Each badge cell shows:
- Icon (from lucide-react, dynamically resolved by name)
- Badge name from i18n: `t("gamification.badge_{key}")`
- Earned: colored icon, date below
- Locked: grey icon, lock overlay

### components/gamification/award-badge-dialog.tsx (client)

Props:
- `studentId`, `studentName`
- `manualBadges`: SPECIAL category badge definitions
- `earnedBadgeIds`: to disable already-earned badges

Renders a dialog with:
- Badge selector (radio buttons or grid of SPECIAL badges)
- Note textarea (optional)
- Submit button calling `awardBadgeAction`
- Uses `useTransition` for pending state

## i18n Keys

Namespace: `gamification`

```
myBadges, earnedBadges, lockedBadges, badgeEarned, noBadges,
awardBadge, awardNote, badgeAwarded, revokeBadge, confirmRevoke, badgeRevoked,
leaderboard, groupLeaderboard, schoolLeaderboard, rank, noRankings,
badgesThisMonth, totalBadges, recentBadges, viewAll,
category_MILESTONE, category_STREAK, category_REVIEW, category_SPECIAL,
badge_first_juz, badge_first_juz_desc,
badge_five_juz, badge_five_juz_desc,
badge_ten_juz, badge_ten_juz_desc,
badge_fifteen_juz, badge_fifteen_juz_desc,
badge_twenty_juz, badge_twenty_juz_desc,
badge_half_quran, badge_half_quran_desc,
badge_full_quran, badge_full_quran_desc,
badge_first_surah, badge_first_surah_desc,
badge_ten_surahs, badge_ten_surahs_desc,
badge_fifty_surahs, badge_fifty_surahs_desc,
badge_all_surahs, badge_all_surahs_desc,
badge_streak_4, badge_streak_4_desc,
badge_streak_10, badge_streak_10_desc,
badge_streak_26, badge_streak_26_desc,
badge_streak_52, badge_streak_52_desc,
badge_reviews_100, badge_reviews_100_desc,
badge_reviews_500, badge_reviews_500_desc,
badge_reviews_1000, badge_reviews_1000_desc,
badge_excellent_tajweed, badge_excellent_tajweed_desc,
badge_most_improved, badge_most_improved_desc,
badge_peer_helper, badge_peer_helper_desc,
badge_outstanding_dedication, badge_outstanding_dedication_desc,
awardedBy, awardedOn, manualBadge
```

Arabic translations follow existing app patterns.

## Notification Flow

When `checkBadges` awards a new auto badge:
1. Notify the student: type `BADGE_EARNED`, title from i18n badge name

When moderator awards a manual badge:
1. Notify the student: type `BADGE_EARNED`, title includes badge name, body includes note if provided

When moderator revokes a manual badge:
1. No notification — silent removal

## Audit Logging

- `BADGE_AWARD_MANUAL` — moderator awards a badge (metadata: studentId, badgeKey, note)
- `BADGE_REVOKE` — moderator revokes a badge (metadata: studentId, badgeKey)

## Constraints & Edge Cases

- Auto badges are permanent — they cannot be revoked even if the student's metrics later drop below the threshold (e.g., streak resets)
- Manual badges can be revoked by any moderator who manages the student's group (not limited to the original awarder)
- `checkBadges` is idempotent — calling it multiple times for the same student produces the same result due to the unique constraint
- Badge definitions are immutable after seeding — changing trigger criteria doesn't retroactively award/revoke badges
- A student with no active plan sees an empty badge grid (all locked) and no leaderboard position
- Leaderboard ranking is computed on each page load — no stale cache issues
- The `half_quran` badge uses `JUZ_COMPLETE count >= 15` — same trigger as `fifteen_juz`. Both are awarded simultaneously, which is intentional (one celebrates the count, the other the symbolic halfway point)
- Icon resolution: `badge-grid.tsx` maps icon name strings to lucide-react components via a lookup object, not dynamic imports

## Out of Scope

- Points/XP system and numeric levels
- School-wide student leaderboards visible to students
- Badge trading or gifting between students
- Seasonal/time-limited challenges
- Social sharing of badges
- Badge certificates or printable reports
- Animated badge unlock effects
- Parent visibility of badges (Phase 11c)
