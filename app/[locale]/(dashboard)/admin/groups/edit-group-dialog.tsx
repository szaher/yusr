"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";

type ClassItem = { id: string; name: string; level: { nameAr: string } };
type Moderator = { id: string; user: { name: string; email: string } };

type EditGroupDialogProps = {
  group: {
    id: string;
    name: string;
    classId: string;
    moderatorId: string | null;
    weeklyDay: string | null;
    weeklyTime: string | null;
  };
  classes: ClassItem[];
  moderators: Moderator[];
  action: (formData: FormData) => void;
  translations: {
    edit: string;
    editGroup: string;
    groupName: string;
    classLabel: string;
    assignModerator: string;
    noModerator: string;
    weeklyDay: string;
    weeklyTime: string;
    save: string;
  };
};

export function EditGroupDialog({
  group,
  classes,
  moderators,
  action,
  translations,
}: EditGroupDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Pencil className="h-3 w-3 me-1" />
            {translations.edit}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{translations.editGroup}</DialogTitle>
        </DialogHeader>
        <form
          action={(fd) => {
            action(fd);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={group.id} />
          <div className="space-y-2">
            <Label>{translations.groupName}</Label>
            <Input name="name" defaultValue={group.name} required />
          </div>
          <div className="space-y-2">
            <Label>{translations.classLabel}</Label>
            <select
              name="classId"
              defaultValue={group.classId}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} — {cls.level.nameAr}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>{translations.assignModerator}</Label>
            <select
              name="moderatorId"
              defaultValue={group.moderatorId || ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">{translations.noModerator}</option>
              {moderators.map((mod) => (
                <option key={mod.id} value={mod.id}>
                  {mod.user.name} ({mod.user.email})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>{translations.weeklyDay}</Label>
            <Input name="weeklyDay" defaultValue={group.weeklyDay || ""} />
          </div>
          <div className="space-y-2">
            <Label>{translations.weeklyTime}</Label>
            <Input name="weeklyTime" defaultValue={group.weeklyTime || ""} />
          </div>
          <Button type="submit">{translations.save}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
