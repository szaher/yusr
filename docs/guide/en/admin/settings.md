# System Settings & Configuration

Configure platform features, manage templates, set system preferences, and review audit logs.

## General Settings

Navigate to **Settings** to access system configuration.

### System Information

**Academy Details:**
- **Academy Name** — Display name (Arabic and English)
- **Logo** — Upload academy logo
- **Contact Email** — Public contact address
- **Support Email** — Support ticket address
- **Phone Number** — Contact phone
- **Address** — Physical address (if applicable)
- **Timezone** — Default system timezone

### Platform Settings

**General Configuration:**
- **Default Language** — Arabic or English
- **Date Format** — Format for dates (DD/MM/YYYY, MM/DD/YYYY, etc.)
- **Time Format** — 12-hour or 24-hour
- **First Day of Week** — Saturday, Sunday, or Monday
- **Academic Calendar** — Term start/end dates

**User Settings:**
- **Default User Timezone** — Fallback timezone
- **Password Policy** — Minimum length, complexity requirements
- **Session Timeout** — Auto-logout after inactivity (minutes)
- **Email Verification** — Require email verification on signup

## Feature Flags

### Enabling/Disabling Features

Control which features are available:

**Memorization Features:**
- ☑ **Memorization Plans** — Structured progression system
- ☑ **Tajweed Scoring** — Detailed Tajweed evaluation
- ☑ **Review Logging** — Track memorization reviews
- ☑ **Milestone Tracking** — Automatic milestone detection

**Assignment Features:**
- ☑ **Assignments** — Enable assignment system
- ☑ **File Uploads** — Allow student file submissions
- ☑ **Audio Assignments** — Recording submissions
- ☑ **Assignment Templates** — Moderator templates

**Exam Features:**
- ☑ **Exams** — Enable exam system
- ☑ **Multiple Choice** — MCQ questions
- ☑ **Short Answer** — Text response questions
- ☑ **Recitation Questions** — Audio recitation
- ☑ **Question Pools** — Randomized question selection
- ☑ **Exam Retakes** — Allow retake attempts

**Gamification Features:**
- ☑ **Badges** — Achievement badge system
- ☑ **Leaderboards** — Group rankings
- ☑ **Streaks** — Attendance/activity streaks
- ☑ **Points System** — Point rewards (if implemented)
- ☑ **Milestones** — Automatic milestone celebration

**Communication Features:**
- ☑ **Announcements** — System announcements
- ☑ **Support Tickets** — Student support system
- ☑ **Leave Requests** — Absence request system
- ☑ **Direct Messaging** — Student-moderator messaging (optional)
- ☑ **Push Notifications** — PWA push notifications

**Reporting Features:**
- ☑ **Progress Reports** — Student/group reports
- ☑ **Analytics Dashboard** — Admin analytics
- ☑ **Attendance Reports** — Attendance tracking
- ☑ **Export Data** — Data export functionality

### Feature Configuration

Some features have additional settings:

**Memorization Plans:**
- Require plans for all students (On/Off)
- Allow pace overrides (On/Off)
- Auto-suggest next range (On/Off)

**Leaderboards:**
- Anonymous mode available (On/Off)
- Show only to students (On/Off)
- Update frequency (real-time, daily, weekly)

**Support Tickets:**
- Auto-assign to moderators (On/Off)
- SLA response times (hours)
- Priority levels (Normal, High, Urgent)

## Memorization Plan Templates

### Managing Templates

Templates define standard memorization paces:

Navigate to **Settings** > **Memorization Templates**

### Default Templates

**System Templates:**

| Template Name | Amount per Session | Description |
|---------------|-------------------|-------------|
| 1/4 Hizb | ~1.5 pages | Beginner pace (~8 years) |
| 1/2 Hizb | ~3 pages | Intermediate pace (~4 years) |
| 1 Hizb | ~6 pages | Advanced pace (~2 years) |
| 1.5 Pages | 1.5 pages | Custom beginner pace |

### Creating Templates

To create a new template:

1. Click **Create Template**
2. Fill in template details:
   - **Name (English)** — Template name (e.g., "Ramadan Intensive")
   - **Name (Arabic)** — Arabic name
   - **Description** — When to use this template
   - **Pace Type** — Pages, Verses, or Hizb fraction
   - **Amount** — Numeric amount per session
   - **Recommended For** — Skill level
3. Click **Create Template**

**Example Custom Templates:**
- **Ramadan Intensive:** 2 Hizb (12 pages) — for motivated students during Ramadan
- **Slow & Steady:** 1 page — for very young or part-time students
- **Review Focus:** 0.5 pages — during revision periods

### Editing Templates

To modify a template:

1. Navigate to templates list
2. Click template to edit
3. Update name, description, or pace
4. Save changes

**Effects:**
- Existing plans using this template are updated
- Students on this pace see updated homework amounts
- Historical data shows which template was active when

### Setting Default Template

Set which template is used by default:

1. Navigate to template list
2. Click **Set as Default** next to preferred template
3. Confirm selection

**Default Template:**
- Auto-selected when creating new plans
- Moderators can override
- Recommended starting point

### Deleting Templates

To remove a template:

1. Ensure no active plans use this template
2. Click **Delete Template**
3. Confirm deletion

> **Note:** Cannot delete templates currently in use. Change plans to different template first.

## Tajweed Categories

### Managing Tajweed Evaluation Categories

Configure which Tajweed aspects moderators evaluate:

Navigate to **Settings** > **Tajweed Categories**

### Default Categories

**Standard Categories:**

| Category (English) | Category (Arabic) | Description |
|-------------------|------------------|-------------|
| Makharij | مخارج الحروف | Pronunciation points |
| Sifaat | صفات الحروف | Letter characteristics |
| Ahkam | أحكام التجويد | Tajweed rules |
| Mad | المد | Elongation rules |
| Ghunnah | الغنة | Nasalization |
| Qalqalah | القلقلة | Echo/vibration |

### Adding Categories

To create a new Tajweed category:

1. Click **Add Category**
2. Fill in details:
   - **Name (English)** — English name
   - **Name (Arabic)** — Arabic name
   - **Description** — What this evaluates
   - **Order** — Display order
   - **Active** — Enable/disable
3. Save category

**Example Additional Categories:**
- Waqf (Stopping rules)
- Idgham (Merging rules)
- Isti'adhah (Seeking refuge)

### Editing Categories

Modify existing categories:

1. Click category to edit
2. Update name, description, or order
3. Save changes

**Editing Effects:**
- Appears in moderator review forms
- Historical data preserved with old name
- Display updated system-wide

### Disabling Categories

Temporarily disable a category:

1. Click category
2. Toggle **Active** to OFF
3. Save

**Disabled Categories:**
- Hidden from review forms
- Not scored by moderators
- Historical data preserved
- Can be re-enabled later

## Notification Settings

### System Notifications

Configure platform-wide notifications:

**Email Settings:**
- SMTP server configuration
- Sender name and address
- Email templates
- Footer and signature

**Push Notification Settings:**
- Service provider configuration
- Notification icons and badges
- Default notification behavior

**Notification Preferences:**
- Default student notification settings
- Moderator notification defaults
- Admin alerts
- Frequency limits (avoid spam)

### Notification Templates

Customize email and notification text:

**Templates Available:**
- Welcome email
- Enrollment approval/rejection
- Password reset
- Session reminders
- Assignment notifications
- Exam notifications
- Achievement notifications

**Template Editing:**
1. Select template
2. Edit subject and body
3. Use variables ({{name}}, {{date}}, etc.)
4. Preview
5. Save template

## Audit Logs

### Viewing Audit Logs

Navigate to **Settings** > **Audit Logs**

### Log Entries

Audit logs record system events:

| Timestamp | User | Action | Resource | Details |
|-----------|------|--------|----------|---------|
| May 30 14:32 | Admin Ali | Created | User | New student: Ahmad Khan |
| May 30 14:15 | Moderator Fatima | Updated | Grade | Session 123, Student 456 |
| May 30 13:20 | Admin Ali | Deleted | Group | Group L1-C2-G5 |

**Logged Actions:**
- User creation/modification/deletion
- Group/class/level changes
- Grade modifications
- Assignment creation/editing
- Exam administration
- System setting changes
- Login/logout events
- Failed login attempts
- Data exports

### Filtering Logs

**Filter Options:**
- **Date Range** — Specific time period
- **User** — Actions by specific user
- **Action Type** — Create, Update, Delete, Login, etc.
- **Resource Type** — Users, Groups, Grades, etc.
- **Event Level** — Info, Warning, Error, Critical

### Exporting Logs

Export audit logs for analysis:

1. Apply desired filters
2. Click **Export Logs**
3. Choose format (CSV, Excel, JSON)
4. Download file

**Use Cases:**
- Security audits
- Compliance reporting
- Troubleshooting
- Analytics

### Log Retention

**Retention Policy:**
- Configure how long logs are kept
- Default: 1 year
- Critical security logs: 3 years
- Automatic archival or deletion

## Security Settings

### Authentication

**Login Security:**
- **Two-Factor Authentication** — Require 2FA for admins (On/Off)
- **Password Expiration** — Force password change after X days
- **Login Attempt Limit** — Max failed attempts before lockout
- **Lockout Duration** — How long account is locked (minutes)

**Session Security:**
- **Concurrent Sessions** — Allow multiple logins (On/Off)
- **Session Timeout** — Auto-logout after inactivity
- **Secure Cookies** — HTTPS-only cookies

### Data Privacy

**Privacy Settings:**
- **Data Retention** — How long to keep inactive user data
- **Data Export** — Allow users to export their data (GDPR)
- **Data Deletion** — User right to request deletion
- **Anonymization** — Anonymize deleted user data

## Backup and Maintenance

### System Backup

**Backup Configuration:**
- **Automatic Backups** — Enable/disable
- **Backup Frequency** — Daily, weekly
- **Backup Retention** — How many backups to keep
- **Backup Location** — Cloud or local storage

**Manual Backup:**
1. Navigate to **Settings** > **Backup**
2. Click **Create Backup Now**
3. Wait for completion
4. Download backup file (optional)

### Maintenance Mode

**Enable Maintenance Mode:**
1. Navigate to **Settings** > **Maintenance**
2. Toggle **Maintenance Mode** ON
3. Set message to display to users
4. Set estimated duration
5. Save settings

**Maintenance Effects:**
- Users see maintenance page
- No login allowed (except admins)
- Scheduled sessions postponed
- Notifications delayed

**Disable Maintenance Mode:**
- Toggle OFF when maintenance complete
- Users regain access immediately

## Advanced Settings

### API Access (if available)

**API Configuration:**
- Enable/disable API
- Generate API keys
- Set rate limits
- Configure webhooks

### Integrations (if available)

**Third-Party Integrations:**
- Video conferencing (Zoom, Google Meet)
- Email service providers
- Analytics platforms
- Payment gateways (if fees collected)

**Integration Setup:**
1. Navigate to **Settings** > **Integrations**
2. Select integration
3. Enter credentials/API keys
4. Test connection
5. Save and enable

## Best Practices

### Regular Review

**Settings Audits:**
- Review settings quarterly
- Update contact information
- Review feature flags
- Optimize notification settings
- Check security policies

### Documentation

**Document Changes:**
- Note why settings were changed
- Keep changelog
- Communicate major changes to users
- Train staff on new features

### Testing

**Before Deploying:**
- Test settings in staging environment (if available)
- Verify email templates
- Check notification delivery
- Validate integrations

---

**System settings control how your academy operates. Configure thoughtfully, review regularly, and document all changes for accountability and troubleshooting.**
