import { auth } from "@/server/auth/config";
import { hasPermission, Permissions } from "@/server/permissions";
import { getTopPerformers } from "@/server/services/progress";
import { generateCsv } from "@/server/lib/csv";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const allowed = await hasPermission(session.user.id, Permissions.REPORTS_VIEW);
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const performers = await getTopPerformers(100);

  const headers = [
    "Student Name",
    "Group",
    "Quran %",
    "Milestones",
    "Current Streak (weeks)",
  ];
  const rows = performers.map((p) => [
    p.studentName,
    p.groupName || "",
    String(p.quranPercentage ?? 0),
    String(p.milestoneCount ?? 0),
    String(p.currentStreak ?? 0),
  ]);

  const csv = generateCsv(headers, rows);
  const date = new Date().toISOString().split("T")[0];

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="student-progress-${date}.csv"`,
    },
  });
}
