"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCustomGoalAction, deleteCustomGoalAction } from "@/server/actions/progress";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

type Goal = {
  id: string;
  title: string;
  targetSurahNumber: number;
  targetAyahNumber: number;
  deadline: string | null;
  completedAt: string | null;
  targetSurah: { nameAr: string; nameEn: string };
};

type Surah = {
  number: number;
  nameAr: string;
  nameEn: string;
  ayahCount: number;
};

export function CustomGoalForm({
  planId,
  goals,
  surahs,
}: {
  planId: string;
  goals: Goal[];
  surahs: Surah[];
}) {
  const t = useTranslations("progress");
  const [title, setTitle] = useState("");
  const [surahNumber, setSurahNumber] = useState("");
  const [ayahNumber, setAyahNumber] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !surahNumber || !ayahNumber) return;
    setLoading(true);
    try {
      await createCustomGoalAction(planId, {
        title,
        targetSurahNumber: parseInt(surahNumber),
        targetAyahNumber: parseInt(ayahNumber),
        deadline: deadline || undefined,
      });
      toast.success(t("goalCreated"));
      setTitle("");
      setSurahNumber("");
      setAyahNumber("");
      setDeadline("");
    } catch {
      toast.error("Error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(goalId: string) {
    if (!confirm(t("confirmDeleteGoal"))) return;
    try {
      await deleteCustomGoalAction(goalId);
      toast.success(t("goalDeleted"));
    } catch {
      toast.error("Error");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("customGoals")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.length > 0 && (
          <div className="space-y-2">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {goal.completedAt ? "✓ " : ""}
                    {goal.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("targetSurah")}: {goal.targetSurah.nameAr} ({goal.targetSurah.nameEn}) — {t("targetAyah")}: {goal.targetAyahNumber}
                    {goal.deadline && ` — ${t("deadline")}: ${new Date(goal.deadline).toLocaleDateString()}`}
                  </p>
                </div>
                {!goal.completedAt && (
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(goal.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>{t("goalTitle")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>{t("targetSurah")}</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={surahNumber}
              onChange={(e) => setSurahNumber(e.target.value)}
            >
              <option value="">—</option>
              {surahs.map((s) => (
                <option key={s.number} value={s.number}>
                  {s.number}. {s.nameAr} ({s.nameEn})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>{t("targetAyah")}</Label>
            <Input
              type="number"
              min={1}
              value={ayahNumber}
              onChange={(e) => setAyahNumber(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("deadline")}</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={loading} className="w-full">
              {t("addGoal")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
