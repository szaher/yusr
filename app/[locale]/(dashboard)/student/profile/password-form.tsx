"use client";

import { useActionState, useEffect } from "react";
import { changePasswordAction } from "@/server/actions/student";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { toast } from "sonner";

type Props = {
  translations: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
    passwordChanged: string;
    currentPasswordIncorrect: string;
    validationError: string;
    submit: string;
  };
};

function formAction(
  _prev: { success?: boolean; error?: string } | null,
  formData: FormData
) {
  return changePasswordAction(_prev, formData);
}

export function PasswordForm({ translations }: Props) {
  const [state, action] = useActionState(formAction, null);

  useEffect(() => {
    if (state?.success) toast.success(translations.passwordChanged);
    if (state?.error === "currentPasswordIncorrect")
      toast.error(translations.currentPasswordIncorrect);
    if (state?.error === "validationError")
      toast.error(translations.validationError);
  }, [state, translations]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">{translations.currentPassword}</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          minLength={8}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">{translations.newPassword}</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">
          {translations.confirmNewPassword}
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
        />
      </div>

      <SubmitButton>{translations.submit}</SubmitButton>
    </form>
  );
}
