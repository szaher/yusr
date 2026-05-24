"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { markQuickAttendanceAction } from "@/server/actions/attendance";
import { toast } from "sonner";

type Session = {
  id: string;
  date: string;
  startTime: string | null;
};

type Student = {
  id: string;
  name: string;
};

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED_ABSENCE"] as const;

export function QuickMarkForm({
  sessions,
  students,
}: {
  sessions: Session[];
  students: Student[];
}) {
  const t = useTranslations("attendance");
  const [selectedSession, setSelectedSession] = useState(sessions[0]?.id ?? "");
  const [records, setRecords] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const s of students) initial[s.id] = "PRESENT";
    return initial;
  });
  const [isPending, startTransition] = useTransition();

  const statusLabels: Record<string, string> = {
    PRESENT: t("present"),
    ABSENT: t("absent"),
    LATE: t("late"),
    EXCUSED_ABSENCE: t("excusedAbsence"),
  };

  const statusColors: Record<string, string> = {
    PRESENT: "bg-green-100 text-green-800 border-green-300",
    ABSENT: "bg-red-100 text-red-800 border-red-300",
    LATE: "bg-yellow-100 text-yellow-800 border-yellow-300",
    EXCUSED_ABSENCE: "bg-blue-100 text-blue-800 border-blue-300",
  };

  function handleSave() {
    if (!selectedSession) return;
    startTransition(async () => {
      const result = await markQuickAttendanceAction(
        selectedSession,
        Object.entries(records).map(([studentId, status]) => ({ studentId, status }))
      );
      if (result.success) {
        toast.success(t("saved"));
      } else {
        toast.error(result.error);
      }
    });
  }

  if (sessions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t("quickMark")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <select
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {new Date(s.date).toLocaleDateString()} {s.startTime ?? ""}
            </option>
          ))}
        </select>

        <div className="space-y-2">
          {students.map((student) => (
            <div key={student.id} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0">
              <span className="text-sm font-medium">{student.name}</span>
              <div className="flex gap-1">
                {STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setRecords((prev) => ({ ...prev, [student.id]: status }))}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      records[student.id] === status
                        ? statusColors[status]
                        : "bg-muted/50 text-muted-foreground border-transparent"
                    }`}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Button onClick={handleSave} disabled={isPending} className="w-full">
          {isPending ? "..." : t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
