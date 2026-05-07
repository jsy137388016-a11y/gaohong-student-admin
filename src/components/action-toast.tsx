"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";

export function ActionToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const notice = searchParams.get("notice");
  const error = searchParams.get("error");
  const [visible, setVisible] = useState(Boolean(notice || error));

  useEffect(() => {
    setVisible(Boolean(notice || error));
    if (!notice && !error) return;
    const timer = window.setTimeout(() => {
      setVisible(false);
      const next = new URLSearchParams(searchParams.toString());
      next.delete("notice");
      next.delete("error");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [notice, error, pathname, router, searchParams]);

  if (!visible || (!notice && !error)) return null;

  const isError = Boolean(error);
  const Icon = isError ? XCircle : CheckCircle2;

  return (
    <div className="fixed right-5 top-20 z-50 max-w-sm">
      <div
        className={`flex items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-xl ${
          isError ? "border-red-200 text-red-700" : "border-emerald-200 text-emerald-700"
        }`}
      >
        <Icon size={18} className="mt-0.5 shrink-0" />
        <div className="font-medium">{error || notice}</div>
      </div>
    </div>
  );
}
