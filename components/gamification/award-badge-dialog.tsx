"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { awardBadgeAction } from "@/server/actions/gamification";
import { toast } from "sonner";
import { Award, Mic, TrendingUp, Users, Heart } from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  mic: Mic,
  "trending-up": TrendingUp,
  users: Users,
  heart: Heart,
};

type ManualBadge = {
  id: string;
  key: string;
  icon: string;
  color: string;
};

export function AwardBadgeDialog({
  studentId,
  studentName,
  manualBadges,
  earnedBadgeIds,
}: {
  studentId: string;
  studentName: string;
  manualBadges: ManualBadge[];
  earnedBadgeIds: Set<string>;
}) {
  const t = useTranslations("gamification");
  const [open, setOpen] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string>("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const availableBadges = manualBadges.filter((b) => !earnedBadgeIds.has(b.id));

  function handleSubmit() {
    if (!selectedBadgeId) return;
    startTransition(async () => {
      try {
        await awardBadgeAction(studentId, selectedBadgeId, note || undefined);
        toast.success(t("badgeAwarded"));
        setOpen(false);
        setSelectedBadgeId("");
        setNote("");
      } catch {
        toast.error("Error");
      }
    });
  }

  if (availableBadges.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Award className="size-4 mr-1" />
            {t("awardBadge")}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("awardBadge")} — {studentName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {availableBadges.map((badge) => {
              const Icon = iconMap[badge.icon] ?? Award;
              const isSelected = selectedBadgeId === badge.id;
              return (
                <button
                  key={badge.id}
                  type="button"
                  onClick={() => setSelectedBadgeId(badge.id)}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <Icon className="size-5" style={{ color: badge.color }} />
                  <div>
                    <p className="text-sm font-medium">{t(`badge_${badge.key}`)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`badge_${badge.key}_desc`)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            <Label>{t("awardNote")}</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!selectedBadgeId || isPending}
            className="w-full"
          >
            {isPending ? "..." : t("awardBadge")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
