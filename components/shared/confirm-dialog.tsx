"use client";

import type { ReactElement } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  trigger: ReactElement;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: "destructive" | "default";
  formAction: (formData: FormData) => void;
  hiddenFields: Record<string, string>;
};

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "default",
  formAction,
  hiddenFields,
}: ConfirmDialogProps) {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogDescription>{description}</DialogDescription>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {cancelLabel}
          </DialogClose>
          <form action={formAction}>
            {Object.entries(hiddenFields).map(([k, v]) => (
              <input type="hidden" key={k} name={k} value={v} />
            ))}
            <Button type="submit" variant={variant}>
              {confirmLabel}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
