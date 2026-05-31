# Creating and Managing Exams

Design exam templates, assign assessments to groups, customize exam instances, and grade student submissions.

## Exam System Overview

The exam system allows you to create comprehensive assessments with multiple question types to evaluate student knowledge and memorization.

## Creating Exam Templates

### Exam Template Basics

Templates are reusable exam structures that can be assigned to multiple groups:

1. Navigate to **Exams**
2. Click **Create Exam Template**
3. Fill in template details:
   - **Title** — Exam name
   - **Description** — Purpose and coverage
   - **Instructions** — Student guidance
   - **Question Pool** — Add questions

### Question Types

#### Multiple Choice Questions

**Creating MCQ:**
1. Click **Add Question** > **Multiple Choice**
2. Enter question text
3. Add 3-5 answer options
4. Mark correct answer(s)
5. Assign point value
6. Optional: Add explanation for correct answer

**Example:**
```
Question: In which Surah is Ayat al-Kursi found?
Points: 2

Options:
○ Surah Al-Fatiha
● Surah Al-Baqarah (Correct)
○ Surah Al-Imran
○ Surah An-Nisa

Explanation: Ayat al-Kursi is verse 255 of Surah Al-Baqarah.
```

#### True/False Questions

**Creating T/F:**
1. Click **Add Question** > **True/False**
2. Enter statement
3. Mark correct answer (True or False)
4. Assign point value
5. Optional: Add explanation

**Example:**
```
Question: Surah Al-Fatiha has 7 verses.
Points: 1
Correct Answer: True

Explanation: Al-Fatiha contains 7 verses including Bismillah.
```

#### Short Answer Questions

**Creating Short Answer:**
1. Click **Add Question** > **Short Answer**
2. Enter question
3. Provide model answer (for grading reference)
4. Set character limit (optional)
5. Assign point value

**Example:**
```
Question: What is the meaning of "Ar-Rahman Ar-Raheem"?
Points: 3
Character Limit: 200
Model Answer: The Most Gracious, The Most Merciful
```

> **Note:** Short answer questions require manual grading.

#### Recitation Questions

**Creating Recitation Question:**
1. Click **Add Question** > **Recitation**
2. Specify verses to recite
3. Set time limit for recitation
4. Recording method (audio upload)
5. Assign point value
6. Grading rubric (accuracy, Tajweed)

**Example:**
```
Question: Recite Surah Al-Fatiha from memory
Points: 10
Time Limit: 5 minutes
Grading Criteria:
- Accuracy (5 points)
- Tajweed (3 points)
- Fluency (2 points)
```

### Question Organization

**Question Pool:**
- All questions for the exam
- Reorder by drag-and-drop
- Group by sections/topics
- Mark questions as optional

**Sections:**
- Organize questions into sections
- "Part A: Multiple Choice"
- "Part B: Short Answer"
- "Part C: Recitation"

**Randomization:**
- Option to shuffle question order
- Option to shuffle answer choices
- Draws from question pool (if pool > displayed questions)

## Exam Settings

### Time Limits

**Exam Duration:**
- Set total time allowed (e.g., 60 minutes)
- Countdown timer displayed to students
- Auto-submit when time expires

**Question-Level Timing:**
- Optionally set time per question
- Useful for recitation questions

### Attempt Limits

**Number of Attempts:**
- **1 Attempt** — One chance only (high-stakes)
- **2-3 Attempts** — Allow retakes
- **Unlimited** — Practice/formative assessments

**Scoring Method:**
- Highest score counts
- Most recent attempt counts
- Average of attempts

### Question Pools

**Advanced Feature:**
- Create pool of 50 questions
- Randomly select 20 for each student
- Each student gets different questions
- Reduces cheating
- Ensures comprehensive coverage

**Setting Up Pool:**
1. Create more questions than needed
2. Enable **Question Pool**
3. Set **Questions to Display** (e.g., 20 out of 50)
4. Each attempt/student gets random selection

### Access Control

**Exam Availability:**
- **Open Date** — When exam becomes available
- **Close Date** — When exam closes
- **Time Window** — How long students have to start

**Late Submissions:**
- Accept/reject late submissions
- Automatic penalties

## Assigning Exams to Groups

### Creating Exam Instance

To assign an exam to your group:

1. Navigate to **Exams**
2. Select existing template or create new
3. Click **Assign to Group**
4. Select target group(s)
5. Customize exam instance:
   - **Due Date** — Deadline for completion
   - **Time Limit** — Override template time (optional)
   - **Attempts** — Override template attempts (optional)
   - **Instructions** — Group-specific instructions
   - **Question Settings** — Shuffle on/off
6. Click **Assign Exam**
7. Students notified immediately

### Exam Instances

Each assignment creates an "instance":
- Template remains unchanged
- Instance can be customized per group
- Track results per instance
- Same template, different groups

## Customizing Exam Instances

### Instance-Specific Settings

**What Can Be Customized:**
- Due date and time window
- Time limit
- Number of attempts allowed
- Question randomization
- Passing score
- Instructions specific to this group

**Example Use Case:**
- Template: "Juz 1 Exam"
- Instance 1: Group A (60 min, 2 attempts, due June 1)
- Instance 2: Group B (90 min, 1 attempt, due June 5)

### Accommodations

Provide accommodations for specific students:

1. Open exam instance
2. Click **Student Accommodations**
3. Select student
4. Set accommodations:
   - Extended time (e.g., +30 minutes)
   - Extra attempts
   - Accessibility features
5. Save accommodations

## Grading Exam Submissions

### Auto-Graded Questions

**Automatically Scored:**
- Multiple choice
- True/false

**Instant Results:**
- System grades immediately upon submission
- Students see score for auto-graded portions
- Contributes to total score

### Manual Grading Required

**Requires Moderator Grading:**
- Short answer questions
- Recitation questions
- Essay questions

**Grading Process:**
1. Navigate to **Exams** > Exam Instance
2. Click **Grade Submissions**
3. View student submissions list
4. Click student name to grade
5. For each manual question:
   - View student response (text or audio recording)
   - Compare to model answer/rubric
   - Assign points
   - Provide feedback
6. Save grade
7. Student notified of complete results

### Grading Short Answers

**Evaluation Criteria:**
- Correctness of information
- Completeness
- Clarity of expression
- Spelling/grammar (if language test)

**Scoring:**
- Full points: Complete correct answer
- Partial credit: Partially correct
- Zero points: Incorrect or missing

**Feedback:**
- Explain why points deducted
- Provide correct information
- Encourage improvement

### Grading Recitations

**Recitation Rubric:**

| Criteria | Points | Evaluation |
|----------|--------|------------|
| **Accuracy** | 0-5 | Memorization correctness |
| **Tajweed** | 0-3 | Tajweed rules application |
| **Fluency** | 0-2 | Smoothness and confidence |

**Listening to Recordings:**
1. Play student's recitation recording
2. Note mistakes and Tajweed errors
3. Score each criterion
4. Provide detailed feedback
5. Save grade

**Feedback Example:**
"Good memorization overall (4/5). Minor word substitution in verse 3. 
Tajweed needs attention: Ghunnah duration too short (2/3). 
Fluency was excellent (2/2). Total: 8/10. Keep practicing Tajweed!"

## Viewing Exam Results

### Results Dashboard

For each exam instance:

**Summary Statistics:**
- Total students: X
- Submitted: X
- Pending: X
- Average score: X%
- Highest score: X
- Lowest score: X
- Pass rate: X%

**Grade Distribution:**
- Chart showing score ranges
- Number of students per range
- Bell curve visualization

**Question Analysis:**
- Which questions were hardest (low % correct)
- Which were easiest
- Question effectiveness
- Identify areas needing review

### Individual Results

View each student's results:

| Student | Score | Grade | Submitted | Status | Actions |
|---------|-------|-------|-----------|--------|---------|
| Ahmad K. | 92% | A | May 30 | Graded | View Details |
| Fatima M. | 85% | B+ | May 30 | Graded | View Details |
| Omar R. | - | - | - | Not Started | Send Reminder |

**Student Details:**
- Click student to see:
  - Complete exam responses
  - Question-by-question breakdown
  - Time taken
  - Attempt history (if multiple attempts)

## Exam Analytics

### Performance Analysis

**Class Performance:**
- Overall average
- Performance trends
- Comparison to previous exams
- Improvement/decline indicators

**Question Effectiveness:**
- Questions with low pass rate (too hard or poorly worded)
- Questions everyone gets right (too easy)
- Discrimination index (separates strong/weak students)

**Use Analytics To:**
- Improve future exams
- Identify teaching gaps
- Adjust difficulty
- Review problematic content

## Retake Management

### Allowing Retakes

If exam allows multiple attempts:

**Automatic Retakes:**
- Student can retake up to attempt limit
- Previous attempts visible to student
- You see all attempts

**Manual Retake Approval:**
- Student requests additional attempt
- You approve/deny
- Add extra attempts for specific students

**Retake Best Practices:**
- Encourage reviewing mistakes before retake
- Different questions (if using pool)
- Consider score averaging vs. highest score

## Exam Templates Library

### Managing Templates

**Template Actions:**
- **Edit Template** — Modify questions, settings
- **Duplicate Template** — Create copy for variation
- **Archive Template** — Remove from active list
- **Delete Template** — Permanent removal

**Template Organization:**
- Name clearly (e.g., "Juz 1 Final Exam", "Tajweed Quiz - Mad")
- Tag by topic/level
- Version control (v1, v2)

### Sharing Templates (if enabled)

Some academies allow template sharing:
- Share with other moderators
- Import from template library
- Contribute to academy repository

## Best Practices

### Effective Exam Design

**Clear Instructions:**
- Explain format clearly
- Provide time estimates
- Clarify grading criteria
- Sample questions (if first exam)

**Balanced Assessment:**
- Mix question types
- Cover all major topics
- Range of difficulty
- Avoid trick questions

**Fair Grading:**
- Consistent standards
- Partial credit when appropriate
- Grade objectively
- Provide constructive feedback

**Timely Results:**
- Grade within 3-7 days
- Prompt feedback is most valuable
- Return before next major assessment

### Exam Security

**Preventing Cheating:**
- Time limits
- Question randomization
- Proctoring (if serious exam)
- Honor code reminder

**Academic Integrity:**
- Emphasize learning over grades
- Make retakes for learning, not just score
- Investigation if suspicious

---

**Exams are valuable tools for assessment and learning. Design them thoughtfully, grade them fairly, and use results to guide your teaching and student support.**
