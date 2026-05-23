"use client";

import { useActionState, useEffect } from "react";
import { updateStudentProfileAction } from "@/server/actions/student";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { toast } from "sonner";

type Props = {
  profile: {
    phone: string;
    country: string;
    currentQuranLevel: string;
    currentTajweedLevel: string;
    preferredDay: string;
  };
  labels: {
    phone: string;
    country: string;
    quranLevel: string;
    tajweedLevel: string;
    preferredDay: string;
    save: string;
    saved: string;
  };
};

function formAction(_prev: { success?: boolean; error?: string } | null, formData: FormData) {
  return updateStudentProfileAction(formData);
}

export function StudentProfileForm({ profile, labels }: Props) {
  const [state, action] = useActionState(formAction, null);

  useEffect(() => {
    if (state?.success) toast.success(labels.saved);
    if (state?.error) toast.error(state.error);
  }, [state, labels.saved]);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">{labels.phone}</Label>
          <Input id="phone" name="phone" defaultValue={profile.phone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">{labels.country}</Label>
          <Input id="country" name="country" defaultValue={profile.country} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentQuranLevel">{labels.quranLevel}</Label>
          <Input
            id="currentQuranLevel"
            name="currentQuranLevel"
            defaultValue={profile.currentQuranLevel}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentTajweedLevel">{labels.tajweedLevel}</Label>
          <Input
            id="currentTajweedLevel"
            name="currentTajweedLevel"
            defaultValue={profile.currentTajweedLevel}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preferredDay">{labels.preferredDay}</Label>
          <Input
            id="preferredDay"
            name="preferredDay"
            defaultValue={profile.preferredDay}
          />
        </div>
      </div>

      <SubmitButton>{labels.save}</SubmitButton>
    </form>
  );
}
