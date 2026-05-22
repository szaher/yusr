"use server";

import { requireApprovedUser } from "@/server/auth/session";
import { requirePermission, hasPermission } from "@/server/permissions";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  createTemplate,
  updateTemplate,
  addQuestion,
  deleteQuestion,
  assignToGroups,
  changeInstanceStatus,
  customizeInstance,
  saveAnswers,
  gradeSubmission,
} from "@/server/services/exam";
import {
  createTemplateSchema,
  updateTemplateSchema,
  addQuestionSchema,
  deleteQuestionSchema,
  assignToGroupsSchema,
  changeInstanceStatusSchema,
  customizeInstanceSchema,
  saveAnswersSchema,
  gradeSubmissionSchema,
} from "@/lib/validations/exam";
import { db } from "@/server/db/client";
import { revalidatePath } from "next/cache";

function revalidateExamPaths() {
  revalidatePath("/ar/admin/exams");
  revalidatePath("/en/admin/exams");
  revalidatePath("/ar/moderator/exams");
  revalidatePath("/en/moderator/exams");
  revalidatePath("/ar/student/exams");
  revalidatePath("/en/student/exams");
}

export async function createTemplateAction(formData: FormData) {
  await requirePermission(PERMISSIONS.EXAMS_CREATE);
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await createTemplate(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateExamPaths();
  return { success: true };
}

export async function updateTemplateAction(formData: FormData) {
  await requirePermission(PERMISSIONS.EXAMS_CREATE);
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await updateTemplate(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateExamPaths();
  return { success: true };
}

export async function addQuestionAction(formData: FormData) {
  await requirePermission(PERMISSIONS.EXAMS_CREATE);
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = addQuestionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await addQuestion(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateExamPaths();
  return { success: true };
}

export async function deleteQuestionAction(formData: FormData) {
  await requirePermission(PERMISSIONS.EXAMS_CREATE);
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = deleteQuestionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await deleteQuestion(parsed.data.questionId, parsed.data.templateId, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateExamPaths();
  return { success: true };
}

export async function assignToGroupsAction(formData: FormData) {
  await requirePermission(PERMISSIONS.EXAMS_CREATE);
  const session = await requireApprovedUser();

  const raw = {
    ...Object.fromEntries(formData.entries()),
    groupIds: JSON.stringify(formData.getAll("groupIds")),
  };
  const parsed = assignToGroupsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  try {
    await assignToGroups(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateExamPaths();
  return { success: true };
}

export async function changeInstanceStatusAction(formData: FormData) {
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = changeInstanceStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  const instance = await db.examInstance.findUnique({
    where: { id: parsed.data.instanceId },
    include: { group: { select: { moderatorId: true, moderator: { select: { userId: true } } } } },
  });
  if (!instance) return { error: "instanceNotFound" };

  const isAdmin = await hasPermission(session.user.id, PERMISSIONS.EXAMS_VIEW_ALL);
  const isModerator = instance.group.moderator?.userId === session.user.id;

  if (parsed.data.status === "DRAFT" && !isAdmin) {
    return { error: "notAuthorized" };
  }
  if (!isModerator && !isAdmin) {
    return { error: "notAuthorized" };
  }

  try {
    await changeInstanceStatus(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateExamPaths();
  return { success: true };
}

export async function customizeInstanceAction(formData: FormData) {
  const session = await requireApprovedUser();

  const raw = Object.fromEntries(formData.entries());
  const parsed = customizeInstanceSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  const instance = await db.examInstance.findUnique({
    where: { id: parsed.data.instanceId },
    include: { group: { select: { moderator: { select: { userId: true } } } } },
  });
  if (!instance) return { error: "instanceNotFound" };

  const isAdmin = await hasPermission(session.user.id, PERMISSIONS.EXAMS_VIEW_ALL);
  const isModerator = instance.group.moderator?.userId === session.user.id;
  if (!isModerator && !isAdmin) return { error: "notAuthorized" };

  if (instance.status !== "DRAFT" && instance.status !== "PUBLISHED") {
    return { error: "cannotCustomize" };
  }

  try {
    await customizeInstance(parsed.data.instanceId, parsed.data.customizations, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateExamPaths();
  return { success: true };
}

export async function saveAnswersAction(formData: FormData) {
  const session = await requireApprovedUser();

  const answerEntries = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("q_")) {
      const questionId = key.replace("q_", "");
      answerEntries.push({ questionId, answer: (value as string) || null });
    }
  }
  const raw = {
    instanceId: formData.get("instanceId") as string,
    answers: JSON.stringify(answerEntries),
    submit: (formData.get("submit") as string) || undefined,
  };
  const parsed = saveAnswersSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  const studentProfile = await db.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!studentProfile) return { error: "noStudentProfile" };

  const instance = await db.examInstance.findUnique({
    where: { id: parsed.data.instanceId },
    include: {
      group: {
        include: { students: { where: { studentId: studentProfile.id } } },
      },
    },
  });
  if (!instance) return { error: "instanceNotFound" };
  if (instance.group.students.length === 0) return { error: "notInGroup" };

  const shouldSubmit = parsed.data.submit === "true";

  try {
    await saveAnswers(
      parsed.data.instanceId,
      studentProfile.id,
      parsed.data.answers,
      shouldSubmit,
      session.user.id
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateExamPaths();
  return { success: true };
}

export async function gradeSubmissionAction(formData: FormData) {
  await requirePermission(PERMISSIONS.EXAMS_GRADE);
  const session = await requireApprovedUser();

  const grades = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("score_")) {
      const questionId = key.replace("score_", "");
      grades.push({
        questionId,
        score: parseFloat(value as string) || 0,
        moderatorNotes: (formData.get(`notes_${questionId}`) as string) || undefined,
        recitationResult: (formData.get(`recitationResult_${questionId}`) as string) || undefined,
        tajweedNotes: (formData.get(`tajweedNotes_${questionId}`) as string) || undefined,
        fluencyNotes: (formData.get(`fluencyNotes_${questionId}`) as string) || undefined,
      });
    }
  }
  const raw = {
    submissionId: formData.get("submissionId") as string,
    grades: JSON.stringify(grades),
  };
  const parsed = gradeSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError", details: parsed.error.flatten() };
  }

  const submission = await db.examSubmission.findUnique({
    where: { id: parsed.data.submissionId },
    include: {
      instance: {
        include: { group: { select: { moderator: { select: { userId: true } } } } },
      },
    },
  });
  if (!submission) return { error: "submissionNotFound" };

  const isAdmin = await hasPermission(session.user.id, PERMISSIONS.EXAMS_VIEW_ALL);
  const isModerator = submission.instance.group.moderator?.userId === session.user.id;
  if (!isModerator && !isAdmin) return { error: "notAuthorized" };

  try {
    await gradeSubmission(parsed.data, session.user.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "unknownError" };
  }

  revalidateExamPaths();
  return { success: true };
}
