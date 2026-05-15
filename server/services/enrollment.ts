import { db } from "@/server/db/client";
import { hashPassword } from "@/server/auth/password";
import { createAuditLog } from "./audit-log";
import type { RegisterInput } from "@/lib/validations/auth";

export async function getEnrollmentState(): Promise<string> {
  const setting = await db.systemSetting.findUnique({
    where: { key: "enrollment_state" },
  });
  return setting?.value ?? "closed";
}

export async function setEnrollmentState(
  state: string,
  actorId: string
): Promise<void> {
  await db.systemSetting.upsert({
    where: { key: "enrollment_state" },
    update: { value: state },
    create: {
      key: "enrollment_state",
      value: state,
      description: "Enrollment state",
    },
  });

  await createAuditLog({
    actorId,
    action: "enrollment.state_changed",
    entityType: "SystemSetting",
    entityId: "enrollment_state",
    metadata: { newState: state },
  });
}

export async function registerStudent(input: RegisterInput) {
  const studentRole = await db.role.findUnique({
    where: { name: "student" },
  });
  if (!studentRole) throw new Error("Student role not found");

  const existingUser = await db.user.findUnique({
    where: { email: input.email },
  });
  if (existingUser) throw new Error("Email already registered");

  const passwordHash = await hashPassword(input.password);

  return db.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      roleId: studentRole.id,
      accountStatus: null,
      locale: "ar",
      studentProfile: {
        create: {
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          gender: input.gender,
          phone: input.phone,
          country: input.country,
          timezone: input.timezone,
          currentQuranLevel: input.currentQuranLevel,
          currentTajweedLevel: input.currentTajweedLevel,
          previousBackground: input.previousBackground,
          parentContact: input.parentContact,
          preferredDay: input.preferredDay,
          availabilityNotes: input.availabilityNotes,
        },
      },
      enrollmentApplication: {
        create: {
          registrationStatus: "PENDING_REVIEW",
          submittedAt: new Date(),
        },
      },
    },
    include: {
      studentProfile: true,
      enrollmentApplication: true,
    },
  });
}

export async function getPendingApplications() {
  return db.enrollmentApplication.findMany({
    where: { registrationStatus: "PENDING_REVIEW" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      },
    },
    orderBy: { submittedAt: "asc" },
  });
}

export async function getAllApplications(status?: string) {
  return db.enrollmentApplication.findMany({
    where: status ? { registrationStatus: status as any } : undefined,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          accountStatus: true,
          createdAt: true,
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });
}

export async function approveApplication(
  applicationId: string,
  reviewerId: string,
  note?: string
) {
  const application = await db.enrollmentApplication.findUnique({
    where: { id: applicationId },
  });

  if (!application) throw new Error("Application not found");
  if (application.registrationStatus !== "PENDING_REVIEW") {
    throw new Error("Application is not pending review");
  }

  await db.$transaction(async (tx) => {
    await tx.enrollmentApplication.update({
      where: { id: applicationId },
      data: {
        registrationStatus: "APPROVED",
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNote: note,
      },
    });
    await tx.user.update({
      where: { id: application.userId },
      data: { accountStatus: "ACTIVE" },
    });
  });

  await createAuditLog({
    actorId: reviewerId,
    action: "enrollment.approved",
    entityType: "EnrollmentApplication",
    entityId: applicationId,
    metadata: { userId: application.userId, note },
  });
}

export async function rejectApplication(
  applicationId: string,
  reviewerId: string,
  note?: string
) {
  const application = await db.enrollmentApplication.findUnique({
    where: { id: applicationId },
  });

  if (!application) throw new Error("Application not found");

  await db.enrollmentApplication.update({
    where: { id: applicationId },
    data: {
      registrationStatus: "REJECTED",
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewNote: note,
    },
  });

  await createAuditLog({
    actorId: reviewerId,
    action: "enrollment.rejected",
    entityType: "EnrollmentApplication",
    entityId: applicationId,
    metadata: { userId: application.userId, note },
  });
}

export async function waitlistApplication(
  applicationId: string,
  reviewerId: string,
  note?: string
) {
  const application = await db.enrollmentApplication.findUnique({
    where: { id: applicationId },
  });

  if (!application) throw new Error("Application not found");

  await db.enrollmentApplication.update({
    where: { id: applicationId },
    data: {
      registrationStatus: "WAITLISTED",
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewNote: note,
    },
  });

  await createAuditLog({
    actorId: reviewerId,
    action: "enrollment.waitlisted",
    entityType: "EnrollmentApplication",
    entityId: applicationId,
    metadata: { userId: application.userId, note },
  });
}
