"use client";

import { Badge } from "@/components/ui/badge";

function toArabicNumeral(n: number): string {
  const digits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(n)
    .split("")
    .map((d) => digits[parseInt(d)])
    .join("");
}

export function MushafPaginator({
  pages,
  currentIndex,
  filterParam,
}: {
  pages: number[];
  currentIndex: number;
  filterParam: string;
}) {
  return (
    <div className="flex items-center justify-center gap-1 flex-wrap" dir="rtl">
      {pages.map((pageNum, idx) => (
        <a key={pageNum} href={`?${filterParam}&p=${idx + 1}`}>
          <Badge
            variant={idx === currentIndex ? "default" : "outline"}
            className="cursor-pointer text-xs min-w-[2rem] justify-center py-1"
          >
            {toArabicNumeral(pageNum)}
          </Badge>
        </a>
      ))}
    </div>
  );
}
