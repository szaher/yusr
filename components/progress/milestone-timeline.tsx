"use client";

import { Trophy, Star, Flag, Target } from "lucide-react";

type Milestone = {
  id: string;
  type: string;
  label: string;
  achievedAt: Date | string;
};

const typeIcons: Record<string, React.ElementType> = {
  JUZ_COMPLETE: Trophy,
  SURAH_COMPLETE: Star,
  HIZB_COMPLETE: Flag,
  CUSTOM_GOAL: Target,
};

const typeColors: Record<string, string> = {
  JUZ_COMPLETE: "text-amber-500",
  SURAH_COMPLETE: "text-green-500",
  HIZB_COMPLETE: "text-blue-500",
  CUSTOM_GOAL: "text-purple-500",
};

export function MilestoneTimeline({
  milestones,
  emptyMessage,
}: {
  milestones: Milestone[];
  emptyMessage: string;
}) {
  if (milestones.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {milestones.map((m) => {
        const Icon = typeIcons[m.type] ?? Target;
        const color = typeColors[m.type] ?? "text-muted-foreground";
        return (
          <div key={m.id} className="flex items-start gap-3">
            <div className={`mt-0.5 ${color}`}>
              <Icon className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{m.label}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(m.achievedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
