---
title: Organization
parent: User Guide (EN)
nav_order: 18
---

# Organization Management

Manage levels, classes, groups, and student assignments to structure your academy.

## Organizational Structure

Yusr Academy uses a three-tier hierarchy:

**Level** → **Class** → **Group**

**Example Structure:**
```
Level 1: Beginners
  ├─ Class A (Ages 10-12)
  │   ├─ Group 1 (Moderator: Ustadh Ahmad)
  │   └─ Group 2 (Moderator: Ustadha Fatima)
  └─ Class B (Ages 13-15)
      ├─ Group 1 (Moderator: Ustadh Omar)
      └─ Group 2 (Moderator: Ustadha Aisha)

Level 2: Intermediate
  ├─ Class A (5-10 Juz)
  │   └─ Group 1 (Moderator: Ustadh Ali)
  └─ Class B (10-15 Juz)
      └─ Group 1 (Moderator: Ustadha Khadija)
```

## Managing Levels

### Creating a Level

To create a new level:

1. Navigate to **Organization** > **Levels**
2. Click **Create Level**
3. Fill in level details:
   - **Name (English)** — English level name (e.g., "Beginner")
   - **Name (Arabic)** — Arabic level name (e.g., "المبتدئين")
   - **Description** — Purpose and criteria
   - **Order** — Display order (1, 2, 3...)
4. Click **Create Level**

**Naming Conventions:**
- Level 1: Beginners (المبتدئين)
- Level 2: Intermediate (المتوسط)
- Level 3: Advanced (المتقدم)
- Level 4: Hafiz Track (مسار الحفظ الكامل)

Or by Juz count:
- Level 1: 0-5 Juz
- Level 2: 5-15 Juz
- Level 3: 15-30 Juz

### Editing Levels

To modify a level:

1. Navigate to **Organization** > **Levels**
2. Click level to edit
3. Update name, description, or order
4. Save changes

**Name Changes:**
- Affects display throughout system
- Both Arabic and English updated
- Historical data preserved

### Deleting Levels

To remove a level:

1. Ensure no classes are assigned to level
2. Move or delete all classes first
3. Click **Delete Level**
4. Confirm deletion

> **Warning:** Cannot delete levels with active classes. Reassign or delete classes first.

## Managing Classes

### Creating a Class

To create a new class:

1. Navigate to **Organization** > **Classes**
2. Click **Create Class**
3. Fill in class details:
   - **Level** — Select parent level
   - **Name (English)** — English class name (e.g., "Class A")
   - **Name (Arabic)** — Arabic class name (e.g., "الصف أ")
   - **Description** — Class criteria or age group
   - **Order** — Display order within level
4. Click **Create Class**

**Class Organization Strategies:**

**By Age:**
- Class A: Ages 8-10
- Class B: Ages 11-13
- Class C: Ages 14-16
- Class D: Ages 17+

**By Progress:**
- Class A: 0-5 Juz
- Class B: 5-10 Juz
- Class C: 10-20 Juz
- Class D: 20-30 Juz

**By Schedule:**
- Class A: Weekday sessions
- Class B: Weekend sessions
- Class C: Evening sessions

### Viewing Classes

**Class List:**
- All classes organized by level
- Student count per class
- Group count per class
- Assigned moderators

**Class Details:**
- Click class to view:
  - Groups within class
  - Total students
  - Moderators teaching
  - Statistics

### Editing Classes

To modify a class:

1. Navigate to **Organization** > **Classes**
2. Click class to edit
3. Update name, description, level assignment, or order
4. Save changes

**Moving Class to Different Level:**
- Select new level
- All groups and students move with class
- Moderators retain assignments

### Deleting Classes

To remove a class:

1. Ensure no groups are assigned
2. Move or delete all groups first
3. Click **Delete Class**
4. Confirm deletion

## Managing Groups

### Creating a Group

To create a new group:

1. Navigate to **Organization** > **Groups**
2. Click **Create Group**
3. Fill in group details:
   - **Level** — Select level
   - **Class** — Select class
   - **Name (English)** — English group name (e.g., "Group 1")
   - **Name (Arabic)** — Arabic group name (e.g., "المجموعة ١")
   - **Moderator** — Assign moderator
   - **Meeting Day** — Default meeting day
   - **Meeting Time** — Default meeting time
   - **Meeting Link** — Default video conference URL
   - **Capacity** — Maximum students (optional)
   - **Status** — Active or Inactive
4. Click **Create Group**

**Group Naming:**
- Group 1, Group 2, Group 3...
- Or descriptive: "Saturday Morning Group", "Advanced Sisters"

### Group Details

Click any group to view:

**Group Information:**
- Full identifier (Level-Class-Group)
- Assigned moderator
- Schedule
- Meeting link
- Capacity and current enrollment

**Students:**
- List of all students in group
- Student count
- Quick actions (remove, view profile)

**Statistics:**
- Average attendance
- Average progress
- Average grade
- Recent activity

### Assigning Moderators to Groups

**From Group View:**
1. Open group details
2. Click **Assign Moderator** or **Change Moderator**
3. Select moderator from list
4. Save assignment

**From Moderator View:**
1. Open moderator profile
2. Navigate to **Groups**
3. Click **Assign to Group**
4. Select group(s)
5. Save assignments

**Moderator Workload:**
- Monitor moderator-to-student ratio
- Typical: 1 moderator per 10-15 students
- Avoid overloading moderators (recommended max: 2-3 groups)

### Group Settings

**Meeting Configuration:**
- Default meeting day/time
- Meeting duration
- Meeting link (Zoom, Google Meet, etc.)
- Meeting cadence (weekly, biweekly, etc.)

**Academic Settings:**
- Memorization plans enabled/disabled
- Default pace template
- Grading policies

**Capacity:**
- Maximum students per group
- Enrollment auto-closes when full
- Waitlist (if implemented)

### Editing Groups

To modify a group:

1. Navigate to **Organization** > **Groups**
2. Click group to edit
3. Update any settings
4. Save changes

**Common Edits:**
- Changing moderator
- Updating schedule
- Adjusting capacity
- Modifying meeting link

### Moving Groups

**Move to Different Class:**
1. Open group details
2. Click **Move Group**
3. Select new class
4. All students move with group
5. Confirm move

**Moving Effects:**
- Students remain in group
- Moderator assignment unchanged
- Group ID may change
- Historical data preserved

### Archiving Groups

**When to Archive:**
- Group completed program
- All students graduated
- Group merged with another
- Temporary suspension

**Archive Process:**
1. Open group details
2. Click **Archive Group**
3. Provide reason
4. Confirm archive

**Archived Group:**
- Removed from active lists
- Data preserved
- Can be viewed in archives
- Cannot be reactivated (create new group instead)

## Assigning Students to Groups

### Individual Assignment

To assign a student to a group:

1. Navigate to **Users** > **Students**
2. Open student profile
3. Click **Assign to Group**
4. Select:
   - Level
   - Class
   - Group
5. Confirm assignment
6. Student notified of group assignment

**Reassigning Students:**
- Student can be moved between groups
- Previous group history preserved
- Memorization plan transfers
- Grade history maintained

### Bulk Assignment

Assign multiple students at once:

1. Navigate to **Users** > **Students**
2. Select students (checkboxes)
3. Click **Bulk Actions** > **Assign to Group**
4. Select target group
5. Confirm assignment
6. All students assigned to same group

**Use Cases:**
- New cohort enrollment
- Class reorganization
- Balancing group sizes

### Unassigning Students

Remove student from group:

1. Open student profile or group view
2. Click **Remove from Group**
3. Provide reason (optional):
   - Moving to different group
   - Leaving program
   - Temporary
4. Confirm removal

**Effects:**
- Student removed from group
- No longer attends group sessions
- Historical data preserved
- Can be reassigned later

## Organizational Reports

### Structure Overview

**Generate Reports:**
- Levels, classes, and groups hierarchy
- Student distribution across groups
- Moderator assignments and workload
- Group capacity and utilization

### Group Analytics

**Per Group:**
- Enrollment (current / capacity)
- Attendance rate
- Average progress
- Average grades
- Moderator effectiveness

**Comparison:**
- Groups within same class
- Classes within same level
- Levels system-wide

### Capacity Planning

**Utilization:**
- Groups at capacity
- Groups under-enrolled
- Empty slots available
- Projected enrollment needs

**Recommendations:**
- Create new groups when capacity reached
- Merge under-enrolled groups
- Balance group sizes
- Moderator allocation

## Best Practices

### Organizational Design

**Clear Hierarchy:**
- Logical level progression
- Clear class distinctions
- Appropriate group sizes
- Consistent naming conventions

**Balanced Groups:**
- Target: 10-15 students per group
- Minimum: 5 students for viability
- Maximum: 20 students for effectiveness
- Similar ability levels within groups

**Flexible Structure:**
- Accommodate different ages
- Allow for different paces
- Support special programs (Ramadan intensives, etc.)
- Enable promotions/advancements

### Student Placement

**Placement Criteria:**
- Current memorization level
- Age and maturity
- Schedule availability
- Previous experience
- Learning pace

**Assessment:**
- Placement assessments for new students
- Regular progress reviews
- Promote when criteria met
- Support struggling students

### Group Management

**Regular Review:**
- Audit group sizes quarterly
- Balance enrollments
- Address over/under-enrolled groups
- Optimize moderator assignments

**Communication:**
- Clear group assignments
- Inform students and parents
- Moderator communication
- Schedule consistency

### Moderator Allocation

**Effective Distribution:**
- Match moderator expertise to level
- Balance workload
- Consider time zones
- Respect moderator preferences

**Support:**
- Avoid overloading
- Provide training
- Regular check-ins
- Resources and support

---

**A well-organized structure is the foundation of an effective academy. Design thoughtfully, adjust as needed, and maintain clarity throughout your organization.**
