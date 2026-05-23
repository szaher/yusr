"use client";

import { useActionState, useEffect } from "react";
import { confirmListeningAction } from "@/server/actions/assignment";
import { SubmitButton } from "@/components/shared/submit-button";
import { toast } from "sonner";

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
  const [state, action] = useActionState(formAction, null);

  useEffect(() => {
    if (!state) return;
    if ("success" in state && state.success) toast.success(labels.confirm);
    if ("error" in state && state.error) toast.error(state.error);
  }, [state, labels.confirm]);

  return (
    <form action={action}>
      <input type="hidden" name="studentAssignmentId" value={studentAssignmentId} />
      <p className="mb-2 text-sm text-muted-foreground">{labels.disclaimer}</p>
      <SubmitButton disabled={isComplete}>
        {labels.confirm}
      </SubmitButton>
    </form>
  );
}
