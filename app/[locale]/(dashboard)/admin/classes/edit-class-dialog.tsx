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

type Level = { id: string; nameAr: string };

type EditClassDialogProps = {
  cls: { id: string; name: string; levelId: string; capacity: number | null };
  levels: Level[];
  action: (formData: FormData) => void;
  translations: {
    edit: string;
    editClass: string;
    className: string;
    level: string;
    capacity: string;
    save: string;
  };
};

export function EditClassDialog({ cls, levels, action, translations }: EditClassDialogProps) {
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
          <DialogTitle>{translations.editClass}</DialogTitle>
        </DialogHeader>
        <form
          action={(fd) => {
            action(fd);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={cls.id} />
          <div className="space-y-2">
            <Label>{translations.className}</Label>
            <Input name="name" defaultValue={cls.name} required />
          </div>
          <div className="space-y-2">
            <Label>{translations.level}</Label>
            <select
              name="levelId"
              defaultValue={cls.levelId}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.nameAr}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>{translations.capacity}</Label>
            <Input name="capacity" type="number" defaultValue={cls.capacity ?? ""} />
          </div>
          <Button type="submit">{translations.save}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
