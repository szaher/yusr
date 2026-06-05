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

type EditLevelDialogProps = {
  level: { id: string; nameAr: string; nameEn: string | null; sortOrder: number };
  action: (formData: FormData) => void;
  translations: {
    edit: string;
    editLevel: string;
    nameAr: string;
    nameEn: string;
    sortOrder: string;
    save: string;
  };
};

export function EditLevelDialog({ level, action, translations }: EditLevelDialogProps) {
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
          <DialogTitle>{translations.editLevel}</DialogTitle>
        </DialogHeader>
        <form
          action={(fd) => {
            action(fd);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={level.id} />
          <div className="space-y-2">
            <Label>{translations.nameAr}</Label>
            <Input name="nameAr" defaultValue={level.nameAr} required />
          </div>
          <div className="space-y-2">
            <Label>{translations.nameEn}</Label>
            <Input name="nameEn" defaultValue={level.nameEn || ""} />
          </div>
          <div className="space-y-2">
            <Label>{translations.sortOrder}</Label>
            <Input name="sortOrder" type="number" defaultValue={level.sortOrder} />
          </div>
          <Button type="submit">{translations.save}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
