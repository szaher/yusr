"use client";

import { useActionState } from "react";
import { updateStudentProfileAction } from "@/server/actions/student";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
  const [state, action, pending] = useActionState(formAction, null);

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

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {labels.save}
        </Button>
        {state?.success && (
          <p className="text-sm text-green-600">{labels.saved}</p>
        )}
        {state?.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
      </div>
    </form>
  );
}
