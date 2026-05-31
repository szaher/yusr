# User Management

Manage all users, approve enrollments, create moderator accounts, and handle account actions.

## User List

Navigate to **Users** to view all system users.

### Users Overview

**Filter by Role:**
- All Users
- Students
- Moderators
- Admins
- Support Staff

**Filter by Status:**
- Active
- Inactive
- Pending (enrollment applications)
- Banned

**Search Users:**
- By name
- By email
- By ID
- By group/class

### User Table

| Name | Email | Role | Status | Group | Created | Actions |
|------|-------|------|--------|-------|---------|---------|
| Ahmad K. | ahmad@example.com | Student | Active | L1-C2-G3 | Jan 15 | View/Edit |
| Fatima M. | fatima@example.com | Student | Active | L1-C2-G3 | Jan 12 | View/Edit |
| Ustadh Ali | ali@example.com | Moderator | Active | - | Dec 1 | View/Edit |

**Sort Options:**
- By name (alphabetical)
- By registration date
- By last active
- By role
- By status

## Viewing User Profiles

### User Details

Click any user to view complete profile:

**Basic Information:**
- Full name
- Email address
- Phone number
- Date of birth
- Gender
- Country
- Timezone

**Account Information:**
- User ID
- Role
- Status
- Created date
- Last login
- Login count

**Student-Specific:**
- Group assignment
- Quran level background
- Tajweed level
- Previous experience
- Parent/guardian contact
- Preferred schedule

**Moderator-Specific:**
- Assigned groups
- Total students
- Teaching since date
- Specializations

**Activity Summary:**
- Recent logins
- Recent actions
- Contributions

## Enrollment Applications

### Managing Applications

Navigate to **Users** > **Enrollment Applications**

### Application Review Process

**Application Card:**
```
Ahmad Khan
Email: ahmad@example.com
Age: 16
Quran Level: Intermediate (5-15 Juz)
Tajweed Level: Beginner
Preferred Day: Saturday
Applied: May 25, 2026
```

**Review Application:**
1. Click **Review** on application
2. Read applicant information:
   - Personal details
   - Quran background
   - Previous experience
   - Availability
   - Goals and motivations
3. Assess qualifications
4. Make decision: Approve or Reject

### Approving Applications

To approve an application:

1. Click **Approve**
2. Assign student to group:
   - Select level
   - Select class
   - Select group
   - Or leave unassigned for later
3. Optional: Send welcome message
4. Click **Confirm Approval**
5. Student receives:
   - Approval email with login credentials
   - Welcome instructions
   - Group assignment (if assigned)

**Approval Settings:**
- Auto-generate password or let student set
- Send credentials via email
- Activate account immediately or on specific date
- Include orientation materials

### Rejecting Applications

To reject an application:

1. Click **Reject**
2. Select rejection reason:
   - Age requirements not met
   - Prerequisites not satisfied
   - Capacity full
   - Application incomplete
   - Other (specify)
3. Optional: Add message to applicant
4. Click **Confirm Rejection**
5. Applicant receives rejection email with reason

**Professional Rejection:**
- Be respectful and kind
- Explain reason clearly
- Offer alternatives if appropriate
- Invite to reapply if applicable

### Bulk Application Actions

Process multiple applications at once:

1. Select applications (checkboxes)
2. Choose bulk action:
   - Approve all
   - Reject all
   - Assign to group (for approved)
3. Configure settings
4. Execute action

## Creating Moderator Accounts

### Adding Moderators

To create a moderator account:

1. Navigate to **Users**
2. Click **Create User** > **Moderator**
3. Fill in moderator details:
   - **Full Name** — Complete name
   - **Email** — Email address (becomes username)
   - **Password** — Temporary password or auto-generate
   - **Phone Number** — Contact number
   - **Timezone** — Moderator's timezone
4. **Permissions** (if granular):
   - Create/manage groups
   - Grade students
   - Create exams
   - View reports
   - Access all groups vs. assigned only
5. Click **Create Moderator**
6. Moderator receives credentials via email

**Welcome Email Includes:**
- Login credentials
- Getting started guide
- Training materials
- Support contact

### Moderator Assignments

**Assigning Groups:**
1. Open moderator profile
2. Navigate to **Group Assignments**
3. Click **Assign Group**
4. Select groups to assign
5. Save assignments

**Unassigning Groups:**
- Remove moderator from group
- Reassign group to different moderator
- Leave group temporarily unassigned

## Account Actions

### Deactivating Accounts

**When to Deactivate:**
- Student graduated
- Student withdrew
- Inactive for extended period
- Temporary leave
- Moderator resignation

**Deactivation Process:**
1. Open user profile
2. Click **Account Actions** > **Deactivate**
3. Select reason:
   - Graduated
   - Withdrew voluntarily
   - Inactive
   - Temporary leave
   - Other (specify)
4. Choose data retention:
   - Keep all data
   - Archive data
   - Delete personal data (keep academic records)
5. Confirm deactivation

**Deactivation Effects:**
- User cannot log in
- Removed from active groups
- Assignments/exams become unavailable
- Data preserved (unless deleted)
- Can be reactivated later

### Reactivating Accounts

To reactivate a deactivated account:

1. Find user in **Inactive** users list
2. Open profile
3. Click **Reactivate Account**
4. Reassign to group (if student)
5. User notified and can log in again

### Banning Accounts

**When to Ban:**
- Policy violations
- Academic dishonesty
- Inappropriate behavior
- Security concerns

**Ban Process:**
1. Open user profile
2. Click **Account Actions** > **Ban**
3. Provide reason (required)
4. Set ban duration:
   - Temporary (specify date)
   - Permanent
5. Optional: Send notification to user
6. Confirm ban

**Ban Effects:**
- Immediate logout
- Cannot log in
- All access revoked
- Flagged in system
- Can appeal (if process exists)

### Deleting Accounts

**Permanent Deletion:**
> **Warning:** Account deletion is permanent and irreversible.

**When to Delete:**
- User requests account deletion (GDPR/privacy)
- Spam/fake accounts
- Duplicate accounts
- Legal requirements

**Deletion Process:**
1. Open user profile
2. Click **Account Actions** > **Delete Account**
3. Choose deletion scope:
   - **Complete Deletion** — Remove all data permanently
   - **Anonymize** — Keep academic records, remove personal data
4. Type confirmation phrase
5. Confirm deletion

**What Gets Deleted:**
- User account and credentials
- Personal information
- Contact details
- Profile data

**What Can Be Preserved:**
- Academic records (anonymized)
- Session data (for analytics)
- Group statistics

## Role Management

### Changing User Roles

**Promoting to Moderator:**
1. Open student/support profile
2. Click **Change Role** > **Moderator**
3. Configure moderator permissions
4. Assign groups
5. Save changes
6. User notified of role change

**Promoting to Admin:**
- Requires highest-level admin permission
- Use with caution
- Full system access granted

**Demoting Roles:**
- Moderator to Student
- Admin to Moderator
- Remove elevated permissions

## Enrollment Status Control

### System-Wide Enrollment

**Enrollment Settings:**
1. Navigate to **Settings** > **Enrollment**
2. Set status:
   - **Open** — Accepting all applications
   - **Closed** — No new applications accepted
   - **Limited** — Selective acceptance (criteria-based)
3. Configure capacity:
   - Maximum total students
   - Maximum per group
   - Maximum pending applications
4. Save settings

**Enrollment Closed:**
- Application form hidden or disabled
- Message displayed to visitors
- Existing applications still processed
- Current students unaffected

**Enrollment Page:**
When closed, display:
- Reason for closure
- When enrollment may reopen
- Waitlist option (if available)
- Alternative contact info

## Bulk User Actions

### Mass Operations

**Bulk Approve Applications:**
- Select multiple pending applications
- Approve all at once
- Assign to groups in bulk
- Send mass welcome emails

**Bulk Group Assignment:**
- Select multiple students
- Assign to same group
- Useful for new cohort enrollment

**Bulk Status Changes:**
- Mass deactivation (e.g., graduating class)
- Mass reactivation (e.g., new term)

**Bulk Communications:**
- Email all users by role
- Send announcements
- Policy updates

## User Analytics

### User Statistics

**Registration Trends:**
- New users per day/week/month
- Registration sources
- Conversion rate (applied → enrolled)

**Active Users:**
- Daily/weekly/monthly active users
- Engagement trends
- Inactive user identification

**Retention:**
- Student retention rate
- Dropout analysis
- Completion rate

### User Reports

**Generate Reports:**
- User list export (CSV, Excel)
- Role distribution
- Status breakdown
- Group assignments
- Contact lists

**Custom Reports:**
- Filter by criteria
- Select data fields
- Export format
- Scheduled reports

## Best Practices

### Enrollment Management

**Timely Reviews:**
- Review applications within 2-3 business days
- Set review schedule (daily/twice weekly)
- Delegate to multiple admins if volume high

**Clear Communication:**
- Welcome emails for approved students
- Kind, clear rejection messages
- Set expectations early
- Provide orientation materials

**Proper Assignment:**
- Consider student level and background
- Balance group sizes
- Match schedule preferences when possible
- Consider moderator capacity

### Account Administration

**Regular Audits:**
- Review inactive accounts quarterly
- Clean up pending applications (>30 days old)
- Verify moderator assignments
- Update user information

**Security:**
- Monitor for suspicious activity
- Enforce strong password policies
- Regularly review admin access
- Audit log monitoring

**Privacy:**
- Respect user data
- Follow data protection regulations
- Secure personal information
- Provide data export on request

---

**Users are the heart of your academy. Manage them carefully, communicate clearly, and ensure every user has a positive experience from enrollment through completion.**
