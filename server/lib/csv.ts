export function generateCsv(headers: string[], rows: string[][]): string {
  const BOM = "﻿";
  const escape = (val: string) => `"${(val ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];
  return BOM + lines.join("\r\n");
}
