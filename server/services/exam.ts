import { db } from "@/server/db/client";
import { createAuditLog } from "./audit-log";
import { createNotification, createBulkNotifications } from "./notification";
import type {
  CreateTemplateInput,
  UpdateTemplateInput,
  AddQuestionInput,
  AssignToGroupsInput,
  ChangeInstanceStatusInput,
  GradeSubmissionInput,
} from "@/lib/validations/exam";

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ── Template CRUD ──

export async function createTemplate(input: CreateTemplateInput, actorId: string) {
  const template = await db.examTemplate.create({
    data: {
      title: input.title,
      description: input.description || null,
      passingScore: input.passingScore,
      totalPoints: 0,
      createdById: actorId,
    },
  });

  await createAuditLog({
    actorId,
    action: "exam_template.create",
    entityType: "ExamTemplate",
    entityId: template.id,
    metadata: { title: input.title },
  });

  return template;
}

export async function updateTemplate(input: UpdateTemplateInput, actorId: string) {
  const template = await db.examTemplate.update({
    where: { id: input.templateId },
    data: {
      title: input.title,
      description: input.description || null,
      passingScore: input.passingScore,
    },
  });

  await createAuditLog({
    actorId,
    action: "exam_template.update",
    entityType: "ExamTemplate",
    entityId: template.id,
    metadata: { title: input.title },
  });

  return template;
}

export async function getTemplate(templateId: string) {
  return db.examTemplate.findUniqueOrThrow({
    where: { id: templateId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          fromSurah: { select: { number: true, nameAr: true, nameEn: true } },
          toSurah: { select: { number: true, nameAr: true, nameEn: true } },
        },
      },
      _count: { select: { instances: true } },
    },
  });
}

export async function listTemplates() {
  return db.examTemplate.findMany({
    include: {
      _count: { select: { questions: true, instances: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ── Questions ──

export async function addQuestion(input: AddQuestionInput, actorId: string) {
  const maxOrder = await db.examQuestion.findFirst({
    where: { templateId: input.templateId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (maxOrder?.order ?? 0) + 1;

  let parsedOptions: { label: string; isCorrect: boolean }[] | undefined;
  if (input.type === "TRUE_FALSE") {
    const correctIsTrue = input.correctAnswer === "true";
    parsedOptions = [
      { label: "True", isCorrect: correctIsTrue },
      { label: "False", isCorrect: !correctIsTrue },
    ];
  } else if (input.type === "MULTIPLE_CHOICE" && input.options) {
    parsedOptions = JSON.parse(input.options);
  }

  const tags = input.tags
    ? input.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
    : [];

  const question = await db.examQuestion.create({
    data: {
      templateId: input.templateId,
      type: input.type,
      text: input.text,
      points: input.points,
      order: nextOrder,
      options: parsedOptions || undefined,
      correctAnswer: (input.type === "SHORT_ANSWER" || input.type === "TRUE_FALSE") ? input.correctAnswer : undefined,
      fromSurahNumber: input.type === "RECITATION" ? input.fromSurahNumber : undefined,
      fromAyah: input.type === "RECITATION" ? input.fromAyah : undefined,
      toSurahNumber: input.type === "RECITATION" ? input.toSurahNumber : undefined,
      toAyah: input.type === "RECITATION" ? input.toAyah : undefined,
      tags,
    },
  });

  await recalculateTotalPoints(input.templateId);

  await createAuditLog({
    actorId,
    action: "exam_question.add",
    entityType: "ExamTemplate",
    entityId: input.templateId,
    metadata: { questionId: question.id, type: input.type, tags },
  });

  return question;
}

export async function deleteQuestion(questionId: string, templateId: string, actorId: string) {
  await db.examQuestion.delete({ where: { id: questionId } });
  await recalculateTotalPoints(templateId);

  await createAuditLog({
    actorId,
    action: "exam_question.delete",
    entityType: "ExamTemplate",
    entityId: templateId,
    metadata: { questionId },
  });
}

async function recalculateTotalPoints(templateId: string) {
  const result = await db.examQuestion.aggregate({
    where: { templateId },
    _sum: { points: true },
  });
  await db.examTemplate.update({
    where: { id: templateId },
    data: { totalPoints: result._sum.points ?? 0 },
  });
}

// ── Instances ──

export async function assignToGroups(input: AssignToGroupsInput, actorId: string) {
  const groupIds: string[] = JSON.parse(input.groupIds);

  let poolConfig: { pick: number; tags?: string[] } | null = null;
  if (input.poolPick) {
    const poolTags = input.poolTags
      ? input.poolTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
      : undefined;

    const questions = await db.examQuestion.findMany({
      where: { templateId: input.templateId },
      select: { tags: true },
    });

    const matchingCount = poolTags
      ? questions.filter((q) => q.tags.some((t) => poolTags.includes(t))).length
      : questions.length;

    if (input.poolPick > matchingCount) {
      throw new Error(
        `Not enough questions matching the selected tags. Found ${matchingCount}, need ${input.poolPick}.`
      );
    }

    poolConfig = { pick: input.poolPick, ...(poolTags ? { tags: poolTags } : {}) };
  }

  const instances = [];
  for (const groupId of groupIds) {
    const instance = await db.examInstance.create({
      data: {
        templateId: input.templateId,
        groupId,
        sessionId: input.sessionId || null,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        status: "DRAFT",
        createdById: actorId,
        timeLimitMinutes: input.timeLimitMinutes || null,
        shuffleQuestions: input.shuffleQuestions === "true",
        maxAttempts: input.maxAttempts || null,
        poolConfig: poolConfig || undefined,
      },
    });
    instances.push(instance);
  }

  await createAuditLog({
    actorId,
    action: "exam_instance.assign",
    entityType: "ExamTemplate",
    entityId: input.templateId,
    metadata: { groupIds, count: groupIds.length },
  });

  return instances;
}

const VALID_INSTANCE_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PUBLISHED"],
  PUBLISHED: ["IN_PROGRESS", "DRAFT"],
  IN_PROGRESS: ["COMPLETED", "DRAFT"],
  COMPLETED: ["DRAFT"],
};

export async function changeInstanceStatus(input: ChangeInstanceStatusInput, actorId: string) {
  const current = await db.examInstance.findUniqueOrThrow({
    where: { id: input.instanceId },
    include: {
      template: { select: { title: true } },
      group: {
        include: {
          students: { include: { student: { select: { userId: true } } } },
        },
      },
    },
  });

  if (input.status !== "DRAFT") {
    const allowed = VALID_INSTANCE_TRANSITIONS[current.status];
    if (!allowed || !allowed.includes(input.status)) {
      throw new Error(`Invalid transition from ${current.status} to ${input.status}`);
    }
  }

  const instance = await db.examInstance.update({
    where: { id: input.instanceId },
    data: { status: input.status },
  });

  if (input.status === "PUBLISHED") {
    const studentUserIds = current.group.students.map((gs) => gs.student.userId);
    if (studentUserIds.length > 0) {
      await createBulkNotifications(
        studentUserIds,
        "EXAM_PUBLISHED",
        `New exam available: ${current.template.title}`
      );
    }
  }

  await createAuditLog({
    actorId,
    action: `exam_instance.${input.status.toLowerCase()}`,
    entityType: "ExamInstance",
    entityId: input.instanceId,
    metadata: { status: input.status },
  });

  return instance;
}

export async function customizeInstance(instanceId: string, customizations: string, actorId: string) {
  const parsed = JSON.parse(customizations);
  const instance = await db.examInstance.update({
    where: { id: instanceId },
    data: { customizations: parsed },
  });

  await createAuditLog({
    actorId,
    action: "exam_instance.customize",
    entityType: "ExamInstance",
    entityId: instanceId,
    metadata: {},
  });

  return instance;
}

export async function getModeratorInstances(userId: string, filter?: "active" | "all") {
  const profile = await db.moderatorProfile.findUnique({
    where: { userId },
    select: { groups: { select: { id: true } } },
  });
  if (!profile) return [];

  const groupIds = profile.groups.map((g) => g.id);

  return db.examInstance.findMany({
    where: {
      groupId: { in: groupIds },
      ...(filter === "active" || !filter
        ? { status: { in: ["PUBLISHED", "IN_PROGRESS"] } }
        : {}),
    },
    include: {
      template: { select: { title: true, totalPoints: true, passingScore: true } },
      group: { select: { name: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getInstanceDetail(instanceId: string) {
  return db.examInstance.findUniqueOrThrow({
    where: { id: instanceId },
    include: {
      template: {
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: {
              fromSurah: { select: { number: true, nameAr: true, nameEn: true } },
              toSurah: { select: { number: true, nameAr: true, nameEn: true } },
            },
          },
        },
      },
      group: {
        include: {
          students: {
            include: {
              student: {
                include: { user: { select: { id: true, name: true, nameAr: true } } },
              },
            },
          },
          moderator: { select: { userId: true } },
        },
      },
      submissions: {
        include: {
          student: {
            include: { user: { select: { id: true, name: true, nameAr: true } } },
          },
        },
      },
    },
  });
}

export async function getAllInstances(filter?: "active" | "all") {
  return db.examInstance.findMany({
    where:
      filter === "active" || !filter
        ? { status: { not: "COMPLETED" } }
        : {},
    include: {
      template: { select: { title: true, totalPoints: true, passingScore: true } },
      group: { select: { name: true } },
      _count: { select: { submissions: true } },
      submissions: {
        select: { totalScore: true, passed: true, status: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

// ── Submissions ──

async function buildQuestionOrder(
  templateId: string,
  poolConfig: unknown,
  shuffle: boolean
): Promise<string[] | undefined> {
  if (!poolConfig && !shuffle) return undefined;

  const questions = await db.examQuestion.findMany({
    where: { templateId },
    orderBy: { order: "asc" },
    select: { id: true, tags: true },
  });

  let selectedIds = questions.map((q) => q.id);

  const pool = poolConfig as { pick: number; tags?: string[] } | null;
  if (pool) {
    let candidates = questions;
    if (pool.tags && pool.tags.length > 0) {
      candidates = questions.filter((q) =>
        q.tags.some((t) => pool.tags!.includes(t))
      );
    }
    selectedIds = shuffleArray(candidates.map((q) => q.id)).slice(0, pool.pick);
  }

  if (shuffle) {
    selectedIds = shuffleArray(selectedIds);
  }

  return selectedIds;
}

export async function getOrCreateSubmission(instanceId: string, studentProfileId: string) {
  const instance = await db.examInstance.findUniqueOrThrow({
    where: { id: instanceId },
    select: {
      shuffleQuestions: true,
      poolConfig: true,
      maxAttempts: true,
      templateId: true,
    },
  });

  const existingSubmissions = await db.examSubmission.findMany({
    where: { instanceId, studentId: studentProfileId },
    orderBy: { attemptNumber: "desc" },
  });

  const latestAttempt = existingSubmissions[0];

  if (latestAttempt) {
    return db.examSubmission.findUniqueOrThrow({
      where: { id: latestAttempt.id },
      include: {
        answers: { include: { question: true } },
        instance: {
          include: {
            template: {
              include: {
                questions: {
                  orderBy: { order: "asc" },
                  include: {
                    fromSurah: { select: { number: true, nameAr: true, nameEn: true } },
                    toSurah: { select: { number: true, nameAr: true, nameEn: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  const questionOrder = await buildQuestionOrder(instance.templateId, instance.poolConfig, instance.shuffleQuestions);

  const submission = await db.examSubmission.create({
    data: {
      instanceId,
      studentId: studentProfileId,
      attemptNumber: 1,
      questionOrder,
    },
    include: {
      answers: { include: { question: true } },
      instance: {
        include: {
          template: {
            include: {
              questions: {
                orderBy: { order: "asc" },
                include: {
                  fromSurah: { select: { number: true, nameAr: true, nameEn: true } },
                  toSurah: { select: { number: true, nameAr: true, nameEn: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  return submission;
}

export async function saveAnswers(
  instanceId: string,
  studentProfileId: string,
  answersJson: string,
  shouldSubmit: boolean,
  actorId: string
) {
  const answers: { questionId: string; answer: string | null }[] = JSON.parse(answersJson);

  const instance = await db.examInstance.findUniqueOrThrow({
    where: { id: instanceId },
    include: {
      template: {
        include: { questions: { select: { id: true, type: true, options: true, points: true } } },
      },
    },
  });

  const now = new Date();
  if (now < instance.startDate || now > instance.endDate) {
    throw new Error("Exam is not within the submission window");
  }
  if (instance.status !== "PUBLISHED" && instance.status !== "IN_PROGRESS") {
    throw new Error("Exam is not accepting submissions");
  }

  if (instance.timeLimitMinutes) {
    const existingSub = await db.examSubmission.findFirst({
      where: { instanceId, studentId: studentProfileId, status: { in: ["IN_PROGRESS"] } },
      select: { startedAt: true },
    });
    if (existingSub?.startedAt) {
      const deadline = new Date(existingSub.startedAt.getTime() + instance.timeLimitMinutes * 60_000 + 30_000);
      if (now > deadline) {
        throw new Error("Time limit exceeded");
      }
    }
  }

  let submission = await db.examSubmission.findFirst({
    where: { instanceId, studentId: studentProfileId, status: { in: ["NOT_STARTED", "IN_PROGRESS"] } },
    orderBy: { attemptNumber: "desc" },
  });

  if (!submission) {
    submission = await db.examSubmission.create({
      data: {
        instanceId,
        studentId: studentProfileId,
        status: "IN_PROGRESS",
        startedAt: now,
        attemptNumber: 1,
      },
    });
  } else if (submission.status === "NOT_STARTED") {
    submission = await db.examSubmission.update({
      where: { id: submission.id },
      data: { status: "IN_PROGRESS", startedAt: now },
    });
  }

  if (submission.status === "SUBMITTED" || submission.status === "GRADED") {
    throw new Error("Exam already submitted");
  }

  const questionMap = new Map(
    instance.template.questions.map((q) => [q.id, q])
  );

  for (const ans of answers) {
    const question = questionMap.get(ans.questionId);
    if (!question) continue;

    let isCorrect: boolean | null = null;
    let autoScore: number | null = null;

    if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
      const opts = question.options as { label: string; isCorrect: boolean }[];
      if (opts && ans.answer !== null) {
        const idx = parseInt(ans.answer, 10);
        isCorrect = opts[idx]?.isCorrect ?? false;
        autoScore = isCorrect ? question.points : 0;
      }
    }

    await db.examAnswer.upsert({
      where: {
        submissionId_questionId: {
          submissionId: submission.id,
          questionId: ans.questionId,
        },
      },
      update: {
        answer: ans.answer,
        isCorrect,
        score: autoScore,
      },
      create: {
        submissionId: submission.id,
        questionId: ans.questionId,
        answer: ans.answer,
        isCorrect,
        score: autoScore,
      },
    });
  }

  if (shouldSubmit) {
    await db.examSubmission.update({
      where: { id: submission.id },
      data: { status: "SUBMITTED", submittedAt: now },
    });

    const moderatorUserId = await db.group.findUnique({
      where: { id: instance.groupId },
      select: { moderator: { select: { userId: true } } },
    });

    if (moderatorUserId?.moderator?.userId) {
      const student = await db.user.findUnique({
        where: { id: actorId },
        select: { name: true, nameAr: true },
      });
      await createNotification({
        recipientId: moderatorUserId.moderator.userId,
        type: "EXAM_SUBMITTED",
        title: `${student?.nameAr || student?.name} submitted exam: ${instance.template.title}`,
      });
    }
  }

  await createAuditLog({
    actorId,
    action: shouldSubmit ? "exam_submission.submit" : "exam_submission.save",
    entityType: "ExamSubmission",
    entityId: submission.id,
    metadata: { instanceId },
  });

  return submission;
}

export async function getSubmissionForGrading(submissionId: string) {
  return db.examSubmission.findUniqueOrThrow({
    where: { id: submissionId },
    include: {
      student: {
        include: { user: { select: { id: true, name: true, nameAr: true } } },
      },
      instance: {
        include: {
          template: {
            include: {
              questions: {
                orderBy: { order: "asc" },
                include: {
                  fromSurah: { select: { number: true, nameAr: true, nameEn: true } },
                  toSurah: { select: { number: true, nameAr: true, nameEn: true } },
                },
              },
            },
          },
        },
      },
      answers: {
        include: { question: true },
      },
    },
  });
}

export async function gradeSubmission(input: GradeSubmissionInput, actorId: string) {
  const grades: {
    questionId: string;
    score: number;
    moderatorNotes?: string;
    recitationResult?: string;
    tajweedNotes?: string;
    fluencyNotes?: string;
  }[] = JSON.parse(input.grades);

  const submission = await db.examSubmission.findUniqueOrThrow({
    where: { id: input.submissionId },
    include: {
      instance: {
        include: {
          template: { select: { totalPoints: true, passingScore: true, title: true } },
        },
      },
      student: { select: { userId: true } },
    },
  });

  if (submission.status !== "SUBMITTED") {
    throw new Error("Submission is not in SUBMITTED status");
  }

  for (const grade of grades) {
    await db.examAnswer.update({
      where: {
        submissionId_questionId: {
          submissionId: input.submissionId,
          questionId: grade.questionId,
        },
      },
      data: {
        score: grade.score,
        moderatorNotes: grade.moderatorNotes || null,
        recitationResult: grade.recitationResult || null,
        tajweedNotes: grade.tajweedNotes || null,
        fluencyNotes: grade.fluencyNotes || null,
      },
    });
  }

  const allAnswers = await db.examAnswer.findMany({
    where: { submissionId: input.submissionId },
    select: { score: true },
  });

  const totalEarned = allAnswers.reduce((sum, a) => sum + (a.score ?? 0), 0);
  const totalPoints = submission.instance.template.totalPoints;
  const percentage = totalPoints > 0 ? (totalEarned / totalPoints) * 100 : 0;
  const passed = percentage >= submission.instance.template.passingScore;

  await db.examSubmission.update({
    where: { id: input.submissionId },
    data: {
      status: "GRADED",
      gradedAt: new Date(),
      totalScore: Math.round(percentage * 100) / 100,
      passed,
    },
  });

  await createNotification({
    recipientId: submission.student.userId,
    type: "EXAM_GRADED",
    title: `Your exam has been graded: ${submission.instance.template.title}`,
  });

  await createAuditLog({
    actorId,
    action: "exam_submission.grade",
    entityType: "ExamSubmission",
    entityId: input.submissionId,
    metadata: { totalScore: percentage, passed },
  });
}

// ── Student queries ──

export async function getStudentInstances(studentProfileId: string) {
  const groups = await db.groupStudent.findMany({
    where: { studentId: studentProfileId },
    select: { groupId: true },
  });
  const groupIds = groups.map((g) => g.groupId);

  return db.examInstance.findMany({
    where: {
      groupId: { in: groupIds },
      status: { in: ["PUBLISHED", "IN_PROGRESS", "COMPLETED"] },
    },
    include: {
      template: { select: { title: true } },
      group: { select: { name: true } },
      submissions: {
        where: { studentId: studentProfileId },
        select: { status: true, totalScore: true, passed: true },
      },
    },
    orderBy: { startDate: "desc" },
  });
}
