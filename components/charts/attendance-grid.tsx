"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CellStatus = "present" | "absent" | "late" | "excused" | "none";

interface AttendanceRow {
  studentName: string;
  weeks: { label: string; status: CellStatus }[];
}

interface AttendanceGridProps {
  title: string;
  rows: AttendanceRow[];
  statusLabels: Record<CellStatus, string>;
}

const statusColors: Record<CellStatus, string> = {
  present: "bg-green-500",
  absent: "bg-red-500",
  late: "bg-yellow-500",
  excused: "bg-gray-400",
  none: "bg-muted",
};

export function AttendanceGrid({ title, rows, statusLabels }: AttendanceGridProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">—</p>
        </CardContent>
      </Card>
    );
  }

  const weekLabels = rows[0].weeks.map((w) => w.label);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-start py-2 pe-4 font-medium text-muted-foreground" />
                {weekLabels.map((wl) => (
                  <th
                    key={wl}
                    className="py-2 px-2 text-center font-medium text-muted-foreground text-xs"
                  >
                    {wl}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.studentName} className="border-t border-muted">
                  <td className="py-2 pe-4 whitespace-nowrap">{row.studentName}</td>
                  {row.weeks.map((cell, i) => (
                    <td key={i} className="py-2 px-2 text-center">
                      <div
                        className={`mx-auto h-4 w-4 rounded-sm ${statusColors[cell.status]}`}
                        title={statusLabels[cell.status]}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
          {(["present", "absent", "late", "excused"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`inline-block h-3 w-3 rounded-sm ${statusColors[s]}`} />
              {statusLabels[s]}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
