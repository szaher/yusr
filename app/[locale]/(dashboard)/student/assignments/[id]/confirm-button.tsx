"use client";

import { useActionState } from "react";
import { confirmListeningAction } from "@/server/actions/assignment";
import { Button } from "@/components/ui/button";

type Props = {
  studentAssignmentId: string;
  labels: {
    confirm: string;
    disclaimer: string;
  };
  isComplete: boolean;
};

function formAction(_prev: { success?: boolean; error?: string } | null, formData: FormData) {
  return confirmListeningAction(formData);
}

export function ConfirmListeningButton({ studentAssignmentId, labels, isComplete }: Props) {
  const [state, action, pending] = useActionState(formAction, null);

  return (
    <form action={action}>
      <input type="hidden" name="studentAssignmentId" value={studentAssignmentId} />
      <p className="mb-2 text-sm text-muted-foreground">{labels.disclaimer}</p>
      <Button type="submit" disabled={pending || isComplete}>
        {labels.confirm}
      </Button>
      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
