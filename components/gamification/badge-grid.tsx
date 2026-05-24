"use client";

import { useTranslations } from "next-intl";
import {
  Trophy,
  Star,
  Flame,
  BookOpen,
  Mic,
  TrendingUp,
  Users,
  Heart,
  Crown,
  Lock,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  trophy: Trophy,
  star: Star,
  flame: Flame,
  "book-open": BookOpen,
  mic: Mic,
  "trending-up": TrendingUp,
  users: Users,
  heart: Heart,
  crown: Crown,
};

type BadgeDef = {
  id: string;
  key: string;
  icon: string;
  color: string;
  category: string;
  sortOrder: number;
};

type EarnedBadge = {
  id: string;
  badgeId: string;
  awardedAt: Date | string;
  awardedBy?: { name: string | null } | null;
  note?: string | null;
};

const categoryOrder = ["MILESTONE", "STREAK", "REVIEW", "SPECIAL"];

export function BadgeGrid({
  catalog,
  earned,
}: {
  catalog: BadgeDef[];
  earned: EarnedBadge[];
}) {
  const t = useTranslations("gamification");
  const earnedMap = new Map(earned.map((e) => [e.badgeId, e]));

  const grouped = new Map<string, BadgeDef[]>();
  for (const badge of catalog) {
    const list = grouped.get(badge.category) ?? [];
    list.push(badge);
    grouped.set(badge.category, list);
  }

  return (
    <div className="space-y-6">
      {categoryOrder.map((category) => {
        const badges = grouped.get(category);
        if (!badges || badges.length === 0) return null;

        return (
          <div key={category}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              {t(`category_${category}`)}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {badges.map((badge) => {
                const isEarned = earnedMap.has(badge.id);
                const earnedInfo = earnedMap.get(badge.id);
                const Icon = iconMap[badge.icon] ?? Trophy;

                return (
                  <div
                    key={badge.id}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors ${
                      isEarned
                        ? "bg-card border-border"
                        : "bg-muted/30 border-transparent opacity-50"
                    }`}
                  >
                    <div className="relative">
                      <Icon
                        className="size-8"
                        style={isEarned ? { color: badge.color } : undefined}
                      />
                      {!isEarned && (
                        <Lock className="size-3 absolute -bottom-0.5 -right-0.5 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs font-medium leading-tight">
                      {t(`badge_${badge.key}`)}
                    </p>
                    {isEarned && earnedInfo && (
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(earnedInfo.awardedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
