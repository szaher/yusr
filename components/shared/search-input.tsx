"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

function SearchInputInner({
  placeholder,
  paramName = "search",
}: {
  placeholder: string;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramName) || "");
  const timeoutRef = useRef<NodeJS.Timeout>(undefined);

  const updateUrl = useCallback(
    (term: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (term) {
        params.set(paramName, term);
      } else {
        params.delete(paramName);
      }
      params.delete("page"); // reset pagination
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams, paramName]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div role="search" className="relative max-w-sm">
      <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => updateUrl(e.target.value), 300);
        }}
        className="ps-9"
      />
    </div>
  );
}

export function SearchInput(props: {
  placeholder: string;
  paramName?: string;
}) {
  return (
    <Suspense>
      <SearchInputInner {...props} />
    </Suspense>
  );
}
