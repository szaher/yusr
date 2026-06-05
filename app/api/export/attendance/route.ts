import { auth } from "@/server/auth/config";
import { hasPermission, Permissions } from "@/server/permissions";
import { getStudentsAtRisk } from "@/server/services/attendance";
import { generateCsv } from "@/server/lib/csv";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const allowed = await hasPermission(session.user.id, Permissions.REPORTS_VIEW);
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const students = await getStudentsAtRisk();

  const headers = [
    "Student Name",
    "Group",
    "Attendance Rate (%)",
    "Consecutive Absences",
    "Last Session",
  ];
  const rows = students.map((s) => [
    s.studentName,
    s.groupName || "",
    String(s.attendanceRate ?? 0),
    String(s.consecutiveAbsences ?? 0),
    s.lastSessionDate ? new Date(s.lastSessionDate).toISOString().split("T")[0] : "",
  ]);

  const csv = generateCsv(headers, rows);
  const date = new Date().toISOString().split("T")[0];

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-at-risk-${date}.csv"`,
    },
  });
}
