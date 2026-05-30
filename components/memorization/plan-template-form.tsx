"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  createTemplateAction,
  updateTemplateAction,
} from "@/server/actions/memorization";

type Template = {
  id: string;
  name: string;
  nameAr: string;
  paceUnit: string;
  paceValue: number;
  description: string | null;
  isDefault: boolean;
};

export function PlanTemplateForm({
  template,
  open,
  onOpenChange,
  translations,
}: {
  template?: Template;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  translations: {
    createTemplate: string;
    editTemplate: string;
    templateName: string;
    paceUnit: string;
    paceValue: string;
    description: string;
    save: string;
    cancel: string;
    nameAr: string;
  };
}) {
  const action = template ? updateTemplateAction : createTemplateAction;
  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const result = await action(formData);
      if (result.success) onOpenChange(false);
      return result;
    },
    null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {template ? translations.editTemplate : translations.createTemplate}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          {template && <input type="hidden" name="id" value={template.id} />}
          <div className="grid gap-2">
            <Label htmlFor="name">{translations.templateName} (EN)</Label>
            <Input id="name" name="name" defaultValue={template?.name} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nameAr">{translations.nameAr}</Label>
            <Input id="nameAr" name="nameAr" defaultValue={template?.nameAr} required dir="rtl" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="paceUnit">{translations.paceUnit}</Label>
              <select
                id="paceUnit"
                name="paceUnit"
                defaultValue={template?.paceUnit ?? "RUB"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="RUB">Rub&apos; (1/4 Hizb)</option>
                <option value="HIZB">Hizb</option>
                <option value="PAGE_COUNT">Pages</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paceValue">{translations.paceValue}</Label>
              <Input
                id="paceValue"
                name="paceValue"
                type="number"
                step="0.5"
                min="0.5"
                defaultValue={template?.paceValue ?? 1}
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">{translations.description}</Label>
            <Input id="description" name="description" defaultValue={template?.description ?? ""} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {translations.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {translations.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
