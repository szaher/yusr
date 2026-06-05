"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale() {
    const newLocale = locale === "ar" ? "en" : "ar";
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  }

  return (
    <button
      onClick={switchLocale}
      aria-label="Switch language"
      className="rounded-md border px-3 py-1 text-sm hover:bg-accent"
    >
      {locale === "ar" ? "English" : "العربية"}
    </button>
  );
}
